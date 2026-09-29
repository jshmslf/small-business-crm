import { prisma } from "@/src/lib/prisma";
import { CreateBusinessForm } from "./create-business-form";

export default async function PlatformPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { roles: { some: { role: { isOwnerRole: true } } } },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-bold">Platform admin</h1>
      <CreateBusinessForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold">All businesses ({businesses.length})</h2>
        <div className="divide-y rounded-lg border">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {b.name} {b.isSuspended && <span className="text-sm text-red-600">(suspended)</span>}
                </p>
                <p className="text-sm text-gray-500">/{b.slug} · {b._count.members} members</p>
              </div>
              <div className="text-right text-sm">
                {b.members.map((m) => (
                  <p key={m.id}>{m.user.name} · {m.user.email}</p>
                ))}
              </div>
            </div>
          ))}
          {businesses.length === 0 && <p className="p-4 text-sm text-gray-500">No businesses yet.</p>}
        </div>
      </section>
    </main>
  );
}