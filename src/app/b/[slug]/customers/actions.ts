"use server";

import { can, requireBusinessAccess } from "@/src/lib/access";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES, CustomerSourceValue, CustomerStatusValue } from "@/src/lib/customer-options";
import { Permission, PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";


type Result = { ok: true } | { ok: false; error: string };

export type CustomerInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  facebookName: string;
  address: string;
  city: string;
  source: string;
  status: string;
  lookingFor: string;
  notes: string;
  assignedToId: string;
};

async function authorize(slug: string, permission: Permission) {
  const { access } = await requireBusinessAccess(slug);
  return can(access, permission) ? access : null;
}

// Empty text becomes null in the database
function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function validate(input: CustomerInput, businessId: string) {
  const firstName = input.firstName.trim();
  if (!firstName) return { error: "First name is required." };
  if (firstName.length > 100) return { error: "First name is too long." };

  const email = clean(input.email)?.toLowerCase() ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };

  if (!CUSTOMER_SOURCES.some((s) => s.value === input.source)) return { error: "Invalid source." };
  if (!CUSTOMER_STATUSES.some((s) => s.value === input.status)) return { error: "Invalid status." };

  // The assigned team member must belong to THIS business
  const assignedToId = clean(input.assignedToId);
  if (assignedToId) {
    const member = await prisma.membership.findFirst({
      where: { id: assignedToId, businessId, isActive: true },
    });
    if (!member) return { error: "That team member can't be assigned." };
  }

  return {
    data: {
      firstName,
      lastName: clean(input.lastName),
      phone: clean(input.phone),
      email,
      facebookName: clean(input.facebookName),
      address: clean(input.address),
      city: clean(input.city),
      source: input.source as CustomerSourceValue,
      status: input.status as CustomerStatusValue,
      lookingFor: clean(input.lookingFor),
      notes: clean(input.notes),
      assignedToId,
    },
  };
}

export async function createCustomer(slug: string, input: CustomerInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.CUSTOMERS_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to add customers." };

  const result = await validate(input, access.business.id);
  if ("error" in result) return { ok: false, error: result.error! };

  await prisma.customer.create({ data: { ...result.data, businessId: access.business.id } });

  revalidatePath(`/b/${slug}/customers`);
  return { ok: true };
}

export async function updateCustomer(slug: string, customerId: string, input: CustomerInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.CUSTOMERS_EDIT);
  if (!access) return { ok: false, error: "You don't have permission to edit customers." };

  const result = await validate(input, access.business.id);
  if ("error" in result) return { ok: false, error: result.error! };

  // updateMany with businessId: only updates if the customer belongs to this business
  const { count } = await prisma.customer.updateMany({
    where: { id: customerId, businessId: access.business.id },
    data: result.data,
  });
  if (count === 0) return { ok: false, error: "Customer not found." };

  revalidatePath(`/b/${slug}/customers`);
  return { ok: true };
}

export async function deleteCustomer(slug: string, customerId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.CUSTOMERS_DELETE);
  if (!access) return { ok: false, error: "You don't have permission to delete customers." };

  const { count } = await prisma.customer.deleteMany({
    where: { id: customerId, businessId: access.business.id },
  });
  if (count === 0) return { ok: false, error: "Customer not found." };

  revalidatePath(`/b/${slug}/customers`);
  return { ok: true };
}