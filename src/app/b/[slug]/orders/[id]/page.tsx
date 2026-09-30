import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, ORDER_CHANNELS, FULFILLMENT_TYPES,
  optionLabel, optionBadge,
} from "@/src/lib/order-options";
import { OrderActions } from "./order-actions";

export default async function OrderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.ORDERS_VIEW)) notFound();

  const order = await prisma.order.findFirst({
    where: { id, businessId: access.business.id },
    include: {
      items: true,
      customer: true,
      createdBy: { include: { user: { select: { name: true } } } },
      payments: {
        orderBy: { paidAt: "asc" },
        include: { recordedBy: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!order) notFound();

  const canViewCost = can(access, PERMISSIONS.INVENTORY_VIEW_COST);
  const missingCost = order.items.some((i) => i.unitCost === null);
  const profit =
    order.items.reduce((sum, i) => sum + (i.unitPrice - (i.unitCost ?? 0)) * i.quantity, 0) - order.discount;
  const balance = order.total - order.amountPaid;
  const base = `/b/${slug}`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(ORDER_STATUSES, order.status)}`}>
          {optionLabel(ORDER_STATUSES, order.status)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(PAYMENT_STATUSES, order.paymentStatus)}`}>
          {optionLabel(PAYMENT_STATUSES, order.paymentStatus)}
        </span>
      </div>
      <p className="-mt-4 text-sm text-gray-500">
        {order.createdAt.toLocaleString("en-PH")} · {optionLabel(ORDER_CHANNELS, order.channel)}
        {order.createdBy && ` · Recorded by ${order.createdBy.user.name}`}
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* Items */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((line) => (
                  <tr key={line.id}>
                    <td className="p-3">
                      {line.itemId ? (
                        <Link href={`${base}/inventory/${line.itemId}`} className="hover:underline">{line.name}</Link>
                      ) : (
                        <span>{line.name} <span className="text-xs text-gray-400">(deleted)</span></span>
                      )}
                    </td>
                    <td className="p-3 text-right">{line.quantity}</td>
                    <td className="p-3 text-right">{formatPeso(line.unitPrice)}</td>
                    <td className="p-3 text-right">{formatPeso(line.unitPrice * line.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPeso(order.subtotal)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><span>Discount</span><span>−{formatPeso(order.discount)}</span></div>
              )}
              {order.shippingFee > 0 && (
                <div className="flex justify-between"><span>Shipping</span><span>{formatPeso(order.shippingFee)}</span></div>
              )}
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPeso(order.total)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span>{formatPeso(order.amountPaid)}</span></div>
              {balance > 0 && order.status !== "CANCELLED" && (
                <div className="flex justify-between font-medium text-red-600"><span>Balance</span><span>{formatPeso(balance)}</span></div>
              )}
              {canViewCost && (
                <div className="flex justify-between text-green-700">
                  <span>Profit{missingCost && " (some items have no buying price)"}</span>
                  <span>{formatPeso(profit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payments */}
          <div className="rounded-lg border">
            <p className="border-b p-3 font-semibold">Payments</p>
            {order.payments.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="divide-y text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex justify-between p-3">
                    <div>
                      <p className="font-medium">{optionLabel(PAYMENT_METHODS, p.method)}</p>
                      <p className="text-xs text-gray-500">
                        {p.paidAt.toLocaleString("en-PH")}
                        {p.reference && ` · Ref ${p.reference}`}
                        {p.recordedBy && ` · ${p.recordedBy.user.name}`}
                      </p>
                    </div>
                    <p>{formatPeso(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm">
            <p className="mb-2 font-semibold">Customer</p>
            {order.customer ? (
              <>
                <Link href={`${base}/customers/${order.customer.id}`} className="font-medium hover:underline">
                  {order.customer.firstName} {order.customer.lastName}
                </Link>
                {order.customer.phone && <p className="text-gray-600">{order.customer.phone}</p>}
                {order.customer.facebookName && <p className="text-gray-600">FB: {order.customer.facebookName}</p>}
              </>
            ) : <p className="text-gray-500">Walk-in</p>}
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <p className="mb-2 font-semibold">{optionLabel(FULFILLMENT_TYPES, order.fulfillmentType)}</p>
            {order.deliveryAddress && <p className="text-gray-600">{order.deliveryAddress}</p>}
            {order.notes && <p className="mt-2 whitespace-pre-wrap text-gray-600">{order.notes}</p>}
          </div>

          <OrderActions
            slug={slug}
            orderId={order.id}
            status={order.status}
            fulfillmentStatus={order.fulfillmentStatus}
            balance={balance}
            amountPaid={order.amountPaid}
            canManage={can(access, PERMISSIONS.ORDERS_MANAGE)}
            canCancel={can(access, PERMISSIONS.ORDERS_CANCEL)}
          />
        </div>
      </div>
    </div>
  );
}