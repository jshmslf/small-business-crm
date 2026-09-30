import { prisma } from "@/src/lib/prisma";
import { CreateBusinessForm } from "./create-business-form";
import { Store } from "lucide-react";
import { PageHeader, SectionHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { LogoMark } from "@/src/components/logo-mark";
import { Meta, TableCard } from "@/src/components/data-table";

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
    <main>
      <PageHeader title="Platform admin" />
      <div className="space-y-10">
        <CreateBusinessForm />

        <section>
          <SectionHeader title={`All businesses (${businesses.length})`} />
          <TableCard>
            {businesses.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {businesses.map((b) => (
                  <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <LogoMark name={b.name} className="size-10" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                          {b.name}
                          {b.isSuspended && <Badge tone="error">Suspended</Badge>}
                        </p>
                        <Meta className="text-sm text-gray-500" items={[`/${b.slug}`, `${b._count.members} members`]} />
                      </div>
                    </div>
                    <div className="space-y-0.5 text-sm sm:text-right">
                      {b.members.map((m) => (
                        <p key={m.id}>
                          <span className="font-medium text-gray-700">{m.user.name}</span>{" "}
                          <span className="text-gray-500">{m.user.email}</span>
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Store} title="No businesses yet." />
            )}
          </TableCard>
        </section>
      </div>
    </main>
  );
}
