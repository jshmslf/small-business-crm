import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can, canAssignRole, canManageMember } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { TeamManager } from "./team-manager";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.TEAM_VIEW)) notFound();

  const [memberships, roles] = await Promise.all([
    prisma.membership.findMany({
      where: { businessId: access.business.id },
      include: {
        user: { select: { name: true, email: true, mustChangePassword: true } },
        roles: { include: { role: true } },
      },
    }),
    prisma.role.findMany({ where: { businessId: access.business.id }, orderBy: { position: "desc" } }),
  ]);

  const members = memberships
    .map((m) => {
      const memberRoles = m.roles.map((mr) => mr.role).sort((a, b) => b.position - a.position);
      return {
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        isActive: m.isActive,
        pendingPassword: m.user.mustChangePassword ?? false,
        isYou: m.id === access.membership.id,
        rank: memberRoles[0]?.position ?? -1,
        roles: memberRoles.map((r) => ({ id: r.id, name: r.name, color: r.color })),
        canManage: canManageMember(access, { id: m.id, roles: memberRoles }),
      };
    })
    // Active members first, then highest rank first
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.rank - a.rank);

  const assignableRoles = roles
    .filter((r) => canAssignRole(access, r))
    .map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return (
    <TeamManager
      slug={slug}
      members={members}
      assignableRoles={assignableRoles}
      canCreate={can(access, PERMISSIONS.TEAM_CREATE)}
      canEditRoles={can(access, PERMISSIONS.ROLES_MANAGE)}
      canDeactivate={can(access, PERMISSIONS.TEAM_REMOVE)}
      description={`${members.filter((m) => m.isActive).length} active member(s)`}
    />
  );
}