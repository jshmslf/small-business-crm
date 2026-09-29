"use server";

import { auth } from "@/src/lib/auth";
import { ALL_PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { requireSuperAdmin } from "@/src/lib/session";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

export async function createBusinessWithOwner(input: {
  businessName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
}): Promise<Result> {
  await requireSuperAdmin(); 
  
  const businessName = input.businessName.trim();
  const slug = input.slug.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();

  if (!businessName || !ownerName || !ownerEmail) {
    return { ok: false, error: "Please fill in all fields." };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "Slug can only use lowercase letters, numbers, and dashes." };
  }
  if (input.tempPassword.length < 8) {
    return { ok: false, error: "Temporary password must be at least 8 characters." };
  }
  if (await prisma.business.findUnique({ where: { slug } })) {
    return { ok: false, error: "That slug is already taken." };
  }
  if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
    return { ok: false, error: "An account with that email already exists." };
  }

  // 1. Create the owner's login account
  let userId: string;
  try {
    const { user } = await auth.api.createUser({
      body: {
        name: ownerName,
        email: ownerEmail,
        password: input.tempPassword,
        role: "user",
        data: { mustChangePassword: true },
      },
    });
    userId = user.id;
  } catch {
    return { ok: false, error: "Could not create the owner account." };
  }

  // 2. Create the business, Owner role, and membership together
  try {
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: businessName, slug },
      });

      const ownerRole = await tx.role.create({
        data: {
          businessId: business.id,
          name: "Owner",
          isOwnerRole: true,
          position: 1000, // always the highest
          permissions: ALL_PERMISSIONS,
        },
      });

      await tx.membership.create({
        data: {
          userId,
          businessId: business.id,
          roles: { create: { roleId: ownerRole.id } },
        },
      });
    });
  } catch {
    // If the business setup fails, remove the account so there's no orphan user
    await prisma.user.delete({ where: { id: userId } });
    return { ok: false, error: "Could not create the business. Nothing was saved." };
  }

  revalidatePath("/platform");
  return { ok: true }
}