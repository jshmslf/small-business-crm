"use server"

import { Access, can, canManageRole, requireBusinessAccess } from "@/src/lib/access";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };
type RoleInput = { name: string; color: string; permissions: string[] };

async function getRoleManager(slug: string) {
    const { access } = await requireBusinessAccess(slug);
    return can(access, PERMISSIONS.ROLES_MANAGE) ? access : null;
}

function cleanPermissions(requested: string[], access: Access, original: string[] = []) {
    const valid = requested.filter((p) => (ALL_PERMISSIONS as string[]).includes(p));
    const granted = valid.filter((p) => access.permissions.has(p));
    const untouchable = original.filter((p) => !access.permissions.has(p));
    return [...new Set([...granted, ...untouchable])];
}

function cleanInput(input: RoleInput) {
    const name = input.name.trim();
    const color = /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : null;
    return { name, color };
}

function isDuplicateName(error: unknown) {
    return (error as { code?: string })?.code === "P2002";
}

export async function createRole(slug: string, input: RoleInput): Promise<Result> {
    const access = await getRoleManager(slug);
    if (!access) return { ok: false, error: "You don't have permission to manage roles." };

    const { name, color } = cleanInput(input);
    if (!name || name.length > 32) return { ok: false, error: "Role name must be 1 to 32 characters." };
    if (name.toLowerCase() === "owner") return { ok: false, error: "That name is reserved." }

    const lowest = await prisma.role.aggregate({
        where: { businessId: access.business.id, isOwnerRole: false },
        _min: { position: true },
    });
    const position = lowest._min.position !== null ? lowest._min.position - 1 : 500;

    try {
        await prisma.role.create({
            data: {
                businessId: access.business.id,
                name,
                color,
                position,
                permissions: cleanPermissions(input.permissions, access),
            },
        });
    } catch (error) {
        if (isDuplicateName(error)) return { ok: false, error: "A role with that name already exists." };
        return { ok: false, error: "Could not create the role." }
    }

    revalidatePath(`/b/${slug}/roles`);
    return { ok: true };
}

export async function updateRole(slug: string, roleId: string, input: RoleInput): Promise<Result> {
  const access = await getRoleManager(slug);
  if (!access) return { ok: false, error: "You don't have permission to manage roles." };

  // Always filter by businessId so nobody can edit another business's role
  const role = await prisma.role.findFirst({ where: { id: roleId, businessId: access.business.id } });
  if (!role) return { ok: false, error: "Role not found." };
  if (!canManageRole(access, role)) return { ok: false, error: "You can't edit a role at or above your own." };

  const { name, color } = cleanInput(input);
  if (!name || name.length > 32) return { ok: false, error: "Role name must be 1 to 32 characters." };
  if (name.toLowerCase() === "owner") return { ok: false, error: "That name is reserved." };

  try {
    await prisma.role.update({
      where: { id: role.id },
      data: { name, color, permissions: cleanPermissions(input.permissions, access, role.permissions) },
    });
  } catch (error) {
    if (isDuplicateName(error)) return { ok: false, error: "A role with that name already exists." };
    return { ok: false, error: "Could not update the role." };
  }

  revalidatePath(`/b/${slug}/roles`);
  return { ok: true };
}

export async function deleteRole(slug: string, roleId: string): Promise<Result> {
  const access = await getRoleManager(slug);
  if (!access) return { ok: false, error: "You don't have permission to manage roles." };

  const role = await prisma.role.findFirst({
    where: { id: roleId, businessId: access.business.id },
    include: { _count: { select: { members: true } } },
  });
  if (!role) return { ok: false, error: "Role not found." };
  if (!canManageRole(access, role)) return { ok: false, error: "You can't delete a role at or above your own." };
  if (role._count.members > 0) {
    return { ok: false, error: `${role._count.members} member(s) still have this role. Reassign them first.` };
  }

  await prisma.role.delete({ where: { id: role.id } });
  revalidatePath(`/b/${slug}/roles`);
  return { ok: true };
}