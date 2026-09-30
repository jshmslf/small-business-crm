import { cache } from "react";
import { prisma } from "./prisma";
import { ALL_PERMISSIONS, Permission } from "./permissions";
import { requireUser } from "./session";
import { notFound } from "next/navigation";

export type Access = NonNullable<Awaited<ReturnType<typeof getMemberAccess>>>;

export const requireBusinessAccess = cache(async (slug: string) => {
    const user = await requireUser();

    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) notFound();

    const access = await getMemberAccess(user.id, business.id);
    if (!access) notFound();

    return { user, access };
});

export function can(
    access: NonNullable<Awaited<ReturnType<typeof getMemberAccess>>>,
    permission: Permission
) {
    return access.permissions.has(permission)
}

export const getMemberAccess = cache(async (userId: string, businessId: string) => {
    const membership = await prisma.membership.findUnique({
        where: { userId_businessId: { userId, businessId } },
        include: {
            business: true,
            roles: { include: { role: true } }
        }
    });

    if (!membership || !membership.isActive || membership.business.isSuspended) {
        return null;
    }

    const roles = membership.roles.map((mr) => mr.role);
    const isOwner = roles.some((role) => role.isOwnerRole);

    const permissions = new Set<string>(
        isOwner ? ALL_PERMISSIONS : roles.flatMap((role) => role.permissions)
    );

    const highestPosition = roles.length ? Math.max(...roles.map((r) => r.position)) : -1;

    return { membership, business: membership.business, roles, isOwner, permissions, highestPosition }
});

export async function hasPermission(userId: string, businessId: string, permission: Permission) {
    const access = await getMemberAccess(userId, businessId);
    return access?.permissions.has(permission) ?? false;
}

export async function requirePermission(businessId: string, permission: Permission) {
    const user = await requireUser();
    const access = await getMemberAccess(user.id, businessId);
    if (!access || !access.permissions.has(permission)) {
        throw new Error("You don't have permission to do this.");
    }
    return { user, access };
}

export function canManageRole(access: Access, role: { position: number; isOwnerRole: boolean }) {
    if (role.isOwnerRole) return false;
    return access.isOwner || role.position < access.highestPosition;
}

export async function getActiveMembers(businessId: string) {
    const members = await prisma.membership.findMany({
        where: { businessId, isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { joinedAt: "asc" },
    });
    return members.map((m) => ({ id: m.id, name: m.user.name }));
}

// Inventory
export async function getItemFormOptions(businessId: string) {
    const [sellers, categoryRows] = await Promise.all([
        prisma.seller.findMany({
            where: { businessId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.item.findMany({
            where: { businessId, category: { not: null } },
            select: { category: true },
            distinct: ["category"],
            orderBy: { category: "asc" },
        }),
    ]);
    return { sellers, categories: categoryRows.map((r) => r.category!) };
}

// assign a role if its below yours
export function canAssignRole(
    access: Access,
    role: { position: number; isOwnerRole: boolean;  permissions: string[] }
) {
    if (!canManageRole(access, role)) return false;
    return access.isOwner || role.permissions.every((p) => access.permissions.has(p));
}

// manage a member if they rank below you
export function canManageMember(
    access: Access,
    target: { id: string; roles: { position: number;  isOwnerRole: boolean }[] }
) {
    if (target.id === access.membership.id) return false;
    if (target.roles.some((r) => r.isOwnerRole)) return false;
    const highest = target.roles.length ? Math.max(...target.roles.map((r) => r.position)) : -1;
    return access.isOwner || highest < access.highestPosition;
}