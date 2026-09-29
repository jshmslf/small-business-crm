import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";

export default async function BusinessHomePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const { user, access } = await requireBusinessAccess(slug);

    const memberCount = can(access, PERMISSIONS.TEAM_VIEW)
        ? await prisma.membership.count({ where: { businessId: access.business.id, isActive: true } })
        : null;
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Hello, {user.name} 👋</h1>
                <p className="text-gray-500">
                You&apos;re signed in to {access.business.name} as {access.roles.map((r) => r.name).join(", ")}.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {memberCount !== null && (
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Team members</p>
                    <p className="text-2xl font-bold">{memberCount}</p>
                </div>
                )}
                <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Your permissions</p>
                <p className="text-2xl font-bold">{access.isOwner ? "All" : access.permissions.size}</p>
                </div>
            </div>
        </div>
    )
}