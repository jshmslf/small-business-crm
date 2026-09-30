"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS, type Permission } from "@/src/lib/permissions";
import { parsePeso } from "@/src/lib/money";
import {
  ORDER_CHANNELS,
  PAYMENT_METHODS,
  FULFILLMENT_TYPES,
  FULFILLMENT_STATUSES,
  isOption,
  paymentStatusFor,
  type OrderChannelValue,
  type PaymentMethodValue,
  type FulfillmentTypeValue,
  type FulfillmentStatusValue,
} from "@/src/lib/order-options";

type Result = { ok: true; id?: string } | { ok: false; error: string };

// Errors with messages that are safe to show the user
class OrderError extends Error {}

export type OrderLineInput = { itemId: string; quantity: number; unitPrice: string };
export type PaymentInput = { amount: string; method: string; reference: string };
export type NewOrderInput = {
  customerId: string;
  channel: string;
  fulfillmentType: string;
  deliveryAddress: string;
  notes: string;
  discount: string;
  shippingFee: string;
  lines: OrderLineInput[];
  payment: PaymentInput | null;
};

async function authorize(slug: string, permission: Permission) {
  const { access } = await requireBusinessAccess(slug);
  return can(access, permission) ? access : null;
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function money(value: string, label: string) {
  const result = parsePeso(value);
  if (!result.ok) throw new OrderError(`Invalid ${label}.`);
  return result.value ?? 0;
}

function refresh(slug: string, orderId?: string) {
  revalidatePath(`/b/${slug}/orders`);
  if (orderId) revalidatePath(`/b/${slug}/orders/${orderId}`);
  revalidatePath(`/b/${slug}/inventory`);
  revalidatePath(`/b/${slug}/customers`);
}

function toResult(error: unknown): Result {
  if (error instanceof OrderError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Nothing was saved." };
}

// ---------------------------------------------------------------------------
// Create an order: holds stock, assigns the order number, records a first payment
// ---------------------------------------------------------------------------
export async function createOrder(slug: string, input: NewOrderInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to create orders." };
  const businessId = access.business.id;

  try {
    if (!isOption(ORDER_CHANNELS, input.channel)) throw new OrderError("Invalid channel.");
    if (!isOption(FULFILLMENT_TYPES, input.fulfillmentType)) throw new OrderError("Invalid fulfillment type.");
    if (input.lines.length === 0) throw new OrderError("Add at least one item.");
    if (input.lines.length > 50) throw new OrderError("Too many items in one order.");

    // Combine duplicate lines of the same item
    const lines = new Map<string, { quantity: number; unitPrice: string }>();
    for (const line of input.lines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100000) {
        throw new OrderError("Quantities must be whole numbers of at least 1.");
      }
      const existing = lines.get(line.itemId);
      lines.set(line.itemId, { quantity: (existing?.quantity ?? 0) + line.quantity, unitPrice: line.unitPrice });
    }

    const customerId = clean(input.customerId);
    if (customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
      if (!customer) throw new OrderError("Customer not found.");
    }

    const items = await prisma.item.findMany({ where: { id: { in: [...lines.keys()] }, businessId } });
    if (items.length !== lines.size) throw new OrderError("One or more items weren't found.");

    // Snapshot name, price, and cost at the time of sale
    const orderItems = items.map((item) => {
      const line = lines.get(item.id)!;
      const unitPrice = line.unitPrice.trim() === "" ? item.sellingPrice : money(line.unitPrice, `price for ${item.name}`);
      return { itemId: item.id, name: item.name, unitPrice, unitCost: item.costPrice, quantity: line.quantity };
    });

    const subtotal = orderItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const discount = money(input.discount, "discount");
    const shippingFee = money(input.shippingFee, "shipping fee");
    const total = subtotal - discount + shippingFee;
    if (total < 0) throw new OrderError("The discount can't be more than the order total.");

    let payment: {
      amount: number;
      method: PaymentMethodValue;
      reference: string | null;
      recordedById: string;
    } | null = null;

    if (input.payment && input.payment.amount.trim() !== "") {
      const amount = money(input.payment.amount, "payment amount");
      if (amount <= 0) throw new OrderError("Payment must be more than zero.");
      if (amount > total) throw new OrderError("Payment can't be more than the order total.");
      if (!isOption(PAYMENT_METHODS, input.payment.method)) throw new OrderError("Invalid payment method.");
      payment = {
        amount,
        method: input.payment.method as PaymentMethodValue,
        reference: clean(input.payment.reference),
        recordedById: access.membership.id,
      };
    }
    const amountPaid = payment?.amount ?? 0;

    const order = await prisma.$transaction(async (tx) => {
      // 1. Hold stock. Only succeeds if the item is still Available with enough quantity,
      //    so two people can never sell the same item.
      for (const line of orderItems) {
        const { count } = await tx.item.updateMany({
          where: { id: line.itemId, businessId, status: "AVAILABLE", quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity } },
        });
        if (count === 0) throw new OrderError(`"${line.name}" is no longer available in that quantity.`);
      }

      // Items with nothing left are now Reserved
      await tx.item.updateMany({
        where: { id: { in: orderItems.map((l) => l.itemId) }, businessId, quantity: 0 },
        data: { status: "RESERVED" },
      });

      // 2. Take the next order number for this business
      const { nextOrderNumber } = await tx.business.update({
        where: { id: businessId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true },
      });

      // 3. Create the order with its items and optional first payment
      return tx.order.create({
        data: {
          businessId,
          orderNumber: nextOrderNumber - 1,
          customerId,
          channel: input.channel as OrderChannelValue,
          fulfillmentType: input.fulfillmentType as FulfillmentTypeValue,
          deliveryAddress: clean(input.deliveryAddress),
          notes: clean(input.notes),
          subtotal,
          discount,
          shippingFee,
          total,
          amountPaid,
          paymentStatus: paymentStatusFor(amountPaid, total),
          createdById: access.membership.id,
          items: { create: orderItems },
          ...(payment && { payments: { create: payment } }),
        },
      });
    });

    refresh(slug, order.id);
    return { ok: true, id: order.id };
  } catch (error) {
    return toResult(error);
  }
}

// ---------------------------------------------------------------------------
// Record a payment (down payment, balance, etc.)
// ---------------------------------------------------------------------------
export async function recordPayment(slug: string, orderId: string, input: PaymentInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_MANAGE);
  if (!access) return { ok: false, error: "You don't have permission to record payments." };

  try {
    const amount = money(input.amount, "amount");
    if (amount <= 0) throw new OrderError("Payment must be more than zero.");
    if (!isOption(PAYMENT_METHODS, input.method)) throw new OrderError("Invalid payment method.");

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, businessId: access.business.id } });
      if (!order) throw new OrderError("Order not found.");
      if (order.status === "CANCELLED") throw new OrderError("This order is cancelled.");
      if (amount > order.total - order.amountPaid) throw new OrderError("That's more than the remaining balance.");

      const amountPaid = order.amountPaid + amount;

      // Only update if nobody else recorded a payment in the meantime
      const { count } = await tx.order.updateMany({
        where: { id: order.id, amountPaid: order.amountPaid },
        data: { amountPaid, paymentStatus: paymentStatusFor(amountPaid, order.total) },
      });
      if (count === 0) throw new OrderError("This order was just updated. Please refresh and try again.");

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount,
          method: input.method as PaymentMethodValue,
          reference: clean(input.reference),
          recordedById: access.membership.id,
        },
      });
    });

    refresh(slug, orderId);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

// ---------------------------------------------------------------------------
// Status changes
// ---------------------------------------------------------------------------
export async function confirmOrder(slug: string, orderId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_MANAGE);
  if (!access) return { ok: false, error: "You don't have permission to update orders." };

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, businessId: access.business.id, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });
  if (count === 0) return { ok: false, error: "Only pending orders can be confirmed." };

  refresh(slug, orderId);
  return { ok: true };
}

export async function updateFulfillment(slug: string, orderId: string, status: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_MANAGE);
  if (!access) return { ok: false, error: "You don't have permission to update orders." };
  if (!isOption(FULFILLMENT_STATUSES, status)) return { ok: false, error: "Invalid status." };

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, businessId: access.business.id, status: { not: "CANCELLED" } },
    data: { fulfillmentStatus: status as FulfillmentStatusValue },
  });
  if (count === 0) return { ok: false, error: "Order not found or cancelled." };

  refresh(slug, orderId);
  return { ok: true };
}

export async function completeOrder(slug: string, orderId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_MANAGE);
  if (!access) return { ok: false, error: "You don't have permission to update orders." };
  const businessId = access.business.id;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, businessId }, include: { items: true } });
      if (!order) throw new OrderError("Order not found.");
      if (order.paymentStatus !== "PAID") throw new OrderError("Record the full payment before completing this order.");

      const now = new Date();
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "COMPLETED", completedAt: now },
      });
      if (count === 0) throw new OrderError("This order can't be completed.");

      // Held items with nothing left become Sold
      const itemIds = order.items.map((i) => i.itemId).filter((id): id is string => id !== null);
      await tx.item.updateMany({
        where: { id: { in: itemIds }, businessId, quantity: 0, status: "RESERVED" },
        data: { status: "SOLD", soldAt: now },
      });

      // Upgrade the customer: first completed order → Active, second or more → Repeat buyer
      if (order.customerId) {
        const completed = await tx.order.count({
          where: { customerId: order.customerId, businessId, status: "COMPLETED" },
        });
        await tx.customer.update({
          where: { id: order.customerId },
          data: { status: completed >= 2 ? "REPEAT" : "ACTIVE" },
        });
      }
    });

    refresh(slug, orderId);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function cancelOrder(slug: string, orderId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ORDERS_CANCEL);
  if (!access) return { ok: false, error: "You don't have permission to cancel orders." };
  const businessId = access.business.id;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, businessId }, include: { items: true } });
      if (!order) throw new OrderError("Order not found.");

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      if (count === 0) throw new OrderError("Only pending or confirmed orders can be cancelled.");

      // Put the stock back
      const itemIds: string[] = [];
      for (const line of order.items) {
        if (!line.itemId) continue; // item was deleted since
        itemIds.push(line.itemId);
        await tx.item.updateMany({
          where: { id: line.itemId, businessId },
          data: { quantity: { increment: line.quantity } },
        });
      }

      await tx.item.updateMany({
        where: { id: { in: itemIds }, businessId, status: "RESERVED", quantity: { gt: 0 } },
        data: { status: "AVAILABLE" },
      });
    });

    refresh(slug, orderId);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}