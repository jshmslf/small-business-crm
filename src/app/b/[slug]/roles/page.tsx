import { can, canManageRole, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { notFound } from "next/navigation";
import { RolesManager } from "./roles-manager";


export default async function RolesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.ROLES_MANAGE)) notFound();

  const roles = await prisma.role.findMany({
    where: { businessId: access.business.id },
    orderBy: { position: "desc" },
    include: { _count: { select: { members: true } } },
  });

  const rows = roles.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    isOwnerRole: r.isOwnerRole,
    permissions: r.permissions,
    memberCount: r._count.members,
    canManage: canManageRole(access, r),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="text-gray-500">
          Roles are listed from highest to lowest. You can only manage roles below your own.
        </p>
      </div>
      <RolesManager slug={slug} roles={rows} grantable={[...access.permissions]} />
    </div>
  );
}