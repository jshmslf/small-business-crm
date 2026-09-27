"use server";

import { auth } from "@/src/lib/auth";
import { ALL_PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { requireSuperAdmin } from "@/src/lib/session";



export async function createBusinessWithOwner(input: {
  businessName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
}) {
  await requireSuperAdmin(); 
  
  // 1. Create the owner's login account
  const { user } = await auth.api.createUser({
    body: {
      name: input.ownerName,
      email: input.ownerEmail,
      password: input.tempPassword,
      role: "user",
      data: { mustChangePassword: true },
    },
  });

  // 2. Create the business, Owner role, and membership together
  try {
    return await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: input.businessName, slug: input.slug },
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
          userId: user.id,
          businessId: business.id,
          roles: { create: { roleId: ownerRole.id } },
        },
      });

      return business;
    });
  } catch (error) {
    // If the business setup fails, remove the account so there's no orphan user
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }
}