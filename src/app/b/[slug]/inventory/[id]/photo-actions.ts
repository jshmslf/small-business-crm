"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { cloudinary, itemFolder } from "@/src/lib/cloudinary";

const MAX_PHOTOS = 10;

type Result = { ok: true } | { ok: false; error: string };

// Only people who can edit inventory, and only for items in their own business
async function getEditableItem(slug: string, itemId: string) {
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_EDIT)) return null;

  const item = await prisma.item.findFirst({
    where: { id: itemId, businessId: access.business.id },
    include: { _count: { select: { images: true } } },
  });
  return item ? { businessId: access.business.id, item } : null;
}

function refresh(slug: string, itemId: string) {
  revalidatePath(`/b/${slug}/inventory/${itemId}`);
  revalidatePath(`/b/${slug}/inventory`);
}

export async function getUploadSignature(slug: string, itemId: string): Promise<
  | { ok: true; signature: string; timestamp: number; folder: string; apiKey: string; cloudName: string }
  | { ok: false; error: string }
> {
  const found = await getEditableItem(slug, itemId);
  if (!found) return { ok: false, error: "You can't add photos to this item." };
  if (found.item._count.images >= MAX_PHOTOS) {
    return { ok: false, error: `Items can have up to ${MAX_PHOTOS} photos.` };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = itemFolder(found.businessId, itemId);

  // The signature only allows uploading into this item's folder, and expires after about an hour
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    ok: true,
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export async function addItemImage(
  slug: string,
  itemId: string,
  upload: { publicId: string; url: string }
): Promise<Result> {
  const found = await getEditableItem(slug, itemId);
  if (!found) return { ok: false, error: "You can't add photos to this item." };

  // Make sure this really is an upload from YOUR Cloudinary, in THIS item's folder
  const folder = itemFolder(found.businessId, itemId);
  const expectedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
  if (!upload.publicId.startsWith(`${folder}/`) || !upload.url.startsWith(expectedUrl)) {
    return { ok: false, error: "Invalid upload." };
  }

  if (found.item._count.images >= MAX_PHOTOS) {
    await cloudinary.uploader.destroy(upload.publicId).catch(() => {});
    return { ok: false, error: `Items can have up to ${MAX_PHOTOS} photos.` };
  }

  const last = await prisma.itemImage.aggregate({
    where: { itemId },
    _max: { position: true },
  });

  await prisma.itemImage.create({
    data: {
      itemId,
      url: upload.url,
      publicId: upload.publicId,
      position: (last._max.position ?? -1) + 1,
    },
  });

  refresh(slug, itemId);
  return { ok: true };
}

export async function deleteItemImage(slug: string, itemId: string, imageId: string): Promise<Result> {
  const found = await getEditableItem(slug, itemId);
  if (!found) return { ok: false, error: "You can't edit this item's photos." };

  const image = await prisma.itemImage.findFirst({ where: { id: imageId, itemId } });
  if (!image) return { ok: false, error: "Photo not found." };

  await prisma.itemImage.delete({ where: { id: image.id } });
  await cloudinary.uploader.destroy(image.publicId).catch(() => {}); // don't fail if Cloudinary is slow

  refresh(slug, itemId);
  return { ok: true };
}

export async function makeCoverImage(slug: string, itemId: string, imageId: string): Promise<Result> {
  const found = await getEditableItem(slug, itemId);
  if (!found) return { ok: false, error: "You can't edit this item's photos." };

  const images = await prisma.itemImage.findMany({ where: { itemId }, orderBy: { position: "asc" } });
  const target = images.find((img) => img.id === imageId);
  if (!target) return { ok: false, error: "Photo not found." };

  // Move the chosen photo to the front, keep the rest in order
  const ordered = [target, ...images.filter((img) => img.id !== imageId)];
  await prisma.$transaction(
    ordered.map((img, index) =>
      prisma.itemImage.update({ where: { id: img.id }, data: { position: index } })
    )
  );

  refresh(slug, itemId);
  return { ok: true };
}