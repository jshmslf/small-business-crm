"use server";

import { can, requireBusinessAccess } from "@/src/lib/access";
import { Permission, PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";


type Result = { ok: true } | { ok: false; error: string };

export type SellerInput = {
  name: string;
  phone: string;
  email: string;
  facebookName: string;
  address: string;
  notes: string;
};

async function authorize(slug: string, permission: Permission) {
  const { access } = await requireBusinessAccess(slug);
  return can(access, permission) ? access : null;
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function validate(input: SellerInput) {
  const name = input.name.trim();
  if (!name) return { error: "Seller name is required." };
  if (name.length > 150) return { error: "Name is too long." };

  const email = clean(input.email)?.toLowerCase() ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };

  return {
    data: {
      name,
      phone: clean(input.phone),
      email,
      facebookName: clean(input.facebookName),
      address: clean(input.address),
      notes: clean(input.notes),
    },
  };
}

export async function createSeller(slug: string, input: SellerInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to add sellers." };

  const result = validate(input);
  if ("error" in result) return { ok: false, error: result.error! };

  await prisma.seller.create({ data: { ...result.data, businessId: access.business.id } });
  revalidatePath(`/b/${slug}/sellers`);
  return { ok: true };
}

export async function updateSeller(slug: string, sellerId: string, input: SellerInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_EDIT);
  if (!access) return { ok: false, error: "You don't have permission to edit sellers." };

  const result = validate(input);
  if ("error" in result) return { ok: false, error: result.error! };

  const { count } = await prisma.seller.updateMany({
    where: { id: sellerId, businessId: access.business.id },
    data: result.data,
  });
  if (count === 0) return { ok: false, error: "Seller not found." };

  revalidatePath(`/b/${slug}/sellers`);
  return { ok: true };
}

export async function deleteSeller(slug: string, sellerId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_DELETE);
  if (!access) return { ok: false, error: "You don't have permission to delete sellers." };

  // Items from this seller are kept; they just lose the seller link (onDelete: SetNull)
  const { count } = await prisma.seller.deleteMany({
    where: { id: sellerId, businessId: access.business.id },
  });
  if (count === 0) return { ok: false, error: "Seller not found." };

  revalidatePath(`/b/${slug}/sellers`);
  return { ok: true };
}