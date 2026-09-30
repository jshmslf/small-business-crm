"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can, canAssignRole, canManageMember, type Access } from "@/src/lib/access";
import { PERMISSIONS, type Permission } from "@/src/lib/permissions";

type Result = { ok: true } | { ok: false; error: string };

async function authorize(slug: string, permission: Permission) {
  const { access } = await requireBusinessAccess(slug);
  return can(access, permission) ? access : null;
}

// Returns the roles only if every one of them belongs to this business and is assignable by you
async function resolveAssignableRoles(access: Access, roleIds: string[]) {
  const unique = [...new Set(roleIds)];
  const roles = await prisma.role.findMany({ where: { id: { in: unique }, businessId: access.business.id } });
  if (roles.length !== unique.length) return null;
  if (!roles.every((role) => canAssignRole(access, role))) return null;
  return roles;
}

async function loadMember(access: Access, membershipId: string) {
  const member = await prisma.membership.findFirst({
    where: { id: membershipId, businessId: access.business.id },
    include: {
      roles: { include: { role: true } },
      user: { select: { id: true, role: true } },
    },
  });
  if (!member) return null;
  return { ...member, roleList: member.roles.map((mr) => mr.role) };
}

function refresh(slug: string) {
  revalidatePath(`/b/${slug}/team`);
}

// ---------------------------------------------------------------------------
// Create a staff account with a temporary password
// ---------------------------------------------------------------------------
export async function createMember(
  slug: string,
  input: { name: string; email: string; tempPassword: string; roleIds: string[] }
): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.TEAM_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to create accounts." };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Name is required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email." };
  if (input.tempPassword.length < 8) return { ok: false, error: "Temporary password must be at least 8 characters." };
  if (input.roleIds.length === 0) return { ok: false, error: "Give them at least one role." };

  const roles = await resolveAssignableRoles(access, input.roleIds);
  if (!roles) return { ok: false, error: "You can only assign roles below your own." };

  if (await prisma.user.findUnique({ where: { email } })) {
    return {
      ok: false,
      error: "An account with that email already exists. Contact the platform admin if this person needs access.",
    };
  }

  let userId: string;
  try {
    const { user } = await auth.api.createUser({
      body: { name, email, password: input.tempPassword, role: "user", data: { mustChangePassword: true } },
    });
    userId = user.id;
  } catch {
    return { ok: false, error: "Could not create the account." };
  }

  try {
    await prisma.membership.create({
      data: {
        userId,
        businessId: access.business.id,
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
    });
  } catch {
    await prisma.user.delete({ where: { id: userId } }); // no orphan accounts
    return { ok: false, error: "Could not add them to the team. Nothing was saved." };
  }

  refresh(slug);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Change a member's roles
// ---------------------------------------------------------------------------
export async function updateMemberRoles(slug: string, membershipId: string, roleIds: string[]): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.ROLES_MANAGE);
  if (!access) return { ok: false, error: "You don't have permission to change roles." };

  const member = await loadMember(access, membershipId);
  if (!member) return { ok: false, error: "Member not found." };
  if (!canManageMember(access, { id: member.id, roles: member.roleList })) {
    return { ok: false, error: "You can't change roles for someone ranked at or above you." };
  }

  const requested = await resolveAssignableRoles(access, roleIds);
  if (!requested) return { ok: false, error: "You can only assign roles below your own." };

  // Roles you can't assign stay exactly as they were
  const kept = member.roleList.filter((role) => !canAssignRole(access, role));
  const finalIds = [...new Set([...requested.map((r) => r.id), ...kept.map((r) => r.id)])];
  if (finalIds.length === 0) return { ok: false, error: "A member needs at least one role." };

  await prisma.$transaction([
    prisma.membershipRole.deleteMany({ where: { membershipId: member.id } }),
    prisma.membershipRole.createMany({ data: finalIds.map((roleId) => ({ membershipId: member.id, roleId })) }),
  ]);

  refresh(slug);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Deactivate / reactivate (instead of deleting, to keep order history)
// ---------------------------------------------------------------------------
export async function setMemberActive(slug: string, membershipId: string, active: boolean): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.TEAM_REMOVE);
  if (!access) return { ok: false, error: "You don't have permission to deactivate members." };

  const member = await loadMember(access, membershipId);
  if (!member) return { ok: false, error: "Member not found." };
  if (!canManageMember(access, { id: member.id, roles: member.roleList })) {
    return { ok: false, error: "You can't change someone ranked at or above you." };
  }

  await prisma.membership.update({ where: { id: member.id }, data: { isActive: active } });

  // If this was their only active business, log them out everywhere
  if (!active) {
    const otherActive = await prisma.membership.count({
      where: { userId: member.userId, isActive: true, id: { not: member.id } },
    });
    if (otherActive === 0) await prisma.session.deleteMany({ where: { userId: member.userId } });
  }

  refresh(slug);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reset password (for staff who forgot theirs)
// ---------------------------------------------------------------------------
export async function resetMemberPassword(slug: string, membershipId: string, tempPassword: string): Promise<Result> {
  const access = await authorize(slug, PERMISSIONS.TEAM_CREATE);
  if (!access) return { ok: false, error: "You don't have permission to reset passwords." };
  if (tempPassword.length < 8) return { ok: false, error: "Temporary password must be at least 8 characters." };

  const member = await loadMember(access, membershipId);
  if (!member) return { ok: false, error: "Member not found." };
  if (!canManageMember(access, { id: member.id, roles: member.roleList })) {
    return { ok: false, error: "You can't reset the password of someone ranked at or above you." };
  }

  // Safety: never reset an account that also belongs to another business, or the platform admin
  const otherMemberships = await prisma.membership.count({
    where: { userId: member.userId, id: { not: member.id } },
  });
  if (member.user.role === "admin" || otherMemberships > 0) {
    return { ok: false, error: "This account can only be reset by the platform admin." };
  }

  const hash = await hashPassword(tempPassword);

  await prisma.$transaction([
    prisma.account.updateMany({
      where: { userId: member.userId, providerId: "credential" },
      data: { password: hash },
    }),
    prisma.user.update({ where: { id: member.userId }, data: { mustChangePassword: true } }),
    prisma.session.deleteMany({ where: { userId: member.userId } }), // log out everywhere
  ]);

  refresh(slug);
  return { ok: true };
}