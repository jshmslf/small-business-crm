"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can, type Access } from "@/src/lib/access";
import { PERMISSIONS, type Permission } from "@/src/lib/permissions";
import { parsePeso } from "@/src/lib/money";
import {
  ITEM_CONDITIONS,
  ITEM_STATUSES,
  type ItemConditionValue,
  type ItemStatusValue,
} from "@/src/lib/item-options";
import { cloudflare } from "better-auth";
import { cloudinary } from "@/src/lib/cloudinary";

type Result = { ok: true;  id?: string } | { ok: false; error: string };

export type ItemInput = {
  name: string;
  description: string;
  category: string;
  sku: string;
  condition: string;
  status: string;
  quantity: string;
  costPrice: string;
  sellingPrice: string;
  sellerId: string;
  acquiredAt: string; // "YYYY-MM-DD" or ""
};

type ExistingItem = { costPrice: number | null; status: string; soldAt: Date | null };

async function authorize(slug: string, permission: Permission) {
  const { access } = await requireBusinessAccess(slug);
  return can(access, permission) ? access : null;
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function validate(input: ItemInput, access: Access, existing?: ExistingItem) {
  const name = input.name.trim();
  if (!name) return { error: "Item name is required." };
  if (name.length > 200) return { error: "Item name is too long." };

  if (!ITEM_CONDITIONS.some((c) => c.value === input.condition)) return { error: "Invalid condition." };
  if (!ITEM_STATUSES.some((s) => s.value === input.status)) return { error: "Invalid status." };

  if (!/^\d{1,7}$/.test(input.quantity.trim())) return { error: "Quantity must be a whole number." };
  const quantity = Number(input.quantity.trim());

  const selling = parsePeso(input.sellingPrice);
  if (!selling.ok || selling.value === null) return { error: "Please enter a valid selling price." };

  // Only people who can see buying prices can change them.
  // Everyone else keeps whatever was there before.
  let costPrice = existing?.costPrice ?? null;
  if (can(access, PERMISSIONS.INVENTORY_VIEW_COST)) {
    const cost = parsePeso(input.costPrice);
    if (!cost.ok) return { error: "Please enter a valid buying price." };
    costPrice = cost.value;
  }

  // The seller must belong to this business
  const sellerId = clean(input.sellerId);
  if (sellerId) {
    const seller = await prisma.seller.findFirst({ where: { id: sellerId, businessId: access.business.id } });
    if (!seller) return { error: "That seller wasn't found." };
  }

  let acquiredAt: Date | null = null;
  if (clean(input.acquiredAt)) {
    acquiredAt = new Date(`${input.acquiredAt.trim()}T00:00:00Z`);
    if (isNaN(acquiredAt.getTime())) return { error: "Invalid acquired date." };
  }

  // Record when an item becomes Sold; clear it if it's no longer Sold
  const status = input.status as ItemStatusValue;
  let soldAt: Date | null = null;
  if (status === "SOLD") {
    soldAt = existing?.status === "SOLD" && existing.soldAt ? existing.soldAt : new Date();
  }

  return {
    data: {
      name,
      description: clean(input.description),
      category: clean(input.category),
      sku: clean(input.sku),
      condition: input.condition as ItemConditionValue,
      status,
      quantity,
      costPrice,
      sellingPrice: selling.value,
      sellerId,
      acquiredAt,
      soldAt,
    },
  };
}

function isDuplicateSku(error: unknown) {
  return (error as { code?: string })?.code === "P2002";
}

export async function createItem(slug: string, input: ItemInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to add items." };

  const result = await validate(input, access);
  if ("error" in result) return { ok: false, error: result.error! };

  try {
    await prisma.item.create({ data: { ...result.data, businessId: access.business.id } });
  } catch (error) {
    if (isDuplicateSku(error)) return { ok: false, error: "Another item already uses that SKU." };
    return { ok: false, error: "Could not save the item." };
  }

  let created;
  try {
    created = await prisma.item.create({ data: { ...result.data, businessId: access.business.id } });    
  } catch (error) {
    if (isDuplicateSku(error)) return { ok: false, error: "Another item already uses that SKU." };
    return { ok: false, error: "Could not save the item."}
  }

  revalidatePath(`/b/${slug}/inventory`);
  return { ok: true, id: created.id};
}

export async function updateItem(slug: string, itemId: string, input: ItemInput): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_EDIT);
  if (!access) return { ok: false, error: "You don't have permission to edit items." };

  const existing = await prisma.item.findFirst({ where: { id: itemId, businessId: access.business.id } });
  if (!existing) return { ok: false, error: "Item not found." };

  const result = await validate(input, access, existing);
  if ("error" in result) return { ok: false, error: result.error! };

  try {
    await prisma.item.update({ where: { id: existing.id }, data: result.data });
  } catch (error) {
    if (isDuplicateSku(error)) return { ok: false, error: "Another item already uses that SKU." };
    return { ok: false, error: "Could not save the item." };
  }

  revalidatePath(`/b/${slug}/inventory`);
  return { ok: true };
}

export async function deleteItem(slug: string, itemId: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.INVENTORY_DELETE);
  if (!access) return { ok: false, error: "You don't have permission to delete items." };

  const images = await prisma.itemImage.findMany({
    where: { itemId, item: { businessId: access.business.id } },
    select: { publicId: true },
  })

  const { count } = await prisma.item.deleteMany({ where: { id: itemId, businessId: access.business.id } });
  if (count === 0) return { ok: false, error: "Item not found." };

  if (images.length > 0) {
    await cloudinary.api.delete_resources(images.map((img) => img.publicId)).catch(() => { });
  }

  revalidatePath(`/b/${slug}/inventory`);
  return { ok: true };
}