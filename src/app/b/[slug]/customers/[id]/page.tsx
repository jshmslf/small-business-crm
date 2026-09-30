import { notFound } from "next/navigation";
import { CustomerForm } from "../customer-form";
import { can, getActiveMembers, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import Link from "next/link";
import { formatPeso } from "@/src/lib/money";
import { ShoppingBag } from "lucide-react";
import { PageHeader, SectionHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { Meta, TableCard } from "@/src/components/data-table";

export default async function CustomerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.CUSTOMERS_VIEW)) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id, businessId: access.business.id },
  });
  if (!customer) notFound();

  const members = await getActiveMembers(access.business.id);

  const canOrders = can(access, PERMISSIONS.ORDERS_VIEW);
  const orders = canOrders
    ? await prisma.order.findMany({
      where: { customerId: customer.id, businessId: access.business.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, orderNumber: true, createdAt: true, total: true, status: true, _count: { select: { items: true } } }
    })
    : [];
  const totalSpent = orders.filter((o) => o.status === "COMPLETED").reduce((sum, o) => sum + o.total, 0);

  // The form works with plain strings, so turn nulls into ""
  const formValues = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    facebookName: customer.facebookName ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    source: customer.source,
    status: customer.status,
    lookingFor: customer.lookingFor ?? "",
    notes: customer.notes ?? "",
    assignedToId: customer.assignedToId ?? "",
  };

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title={<>{customer.firstName} {customer.lastName}</>}
          description={
            <Meta items={[
              `Added ${customer.createdAt.toLocaleDateString("en-PH")}`,
              `Updated ${customer.updatedAt.toLocaleDateString("en-PH")}`,
            ]} />
          }
        />
        <CustomerForm
          slug={slug}
          members={members}
          customer={formValues}
          canEdit={can(access, PERMISSIONS.CUSTOMERS_EDIT)}
          canDelete={can(access, PERMISSIONS.CUSTOMERS_DELETE)}
        />
      </div>
      {canOrders && (
        <section className="max-w-3xl">
          <SectionHeader
            title={`Orders (${orders.length})`}
            description={<span className="tabular-nums">Total spent: {formatPeso(totalSpent)}</span>}
          />
          <TableCard>
            {orders.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/b/${slug}/orders/${o.id}`}
                      className="flex flex-col gap-2 px-5 py-4 outline-none hover:bg-gray-50 focus-visible:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        <p className="font-medium text-gray-900">#{o.orderNumber}</p>
                        <Meta className="text-sm text-gray-500"
                          items={[o.createdAt.toLocaleDateString("en-PH"), `${o._count.items} item(s)`]} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900 tabular-nums">{formatPeso(o.total)}</span>
                        <StatusBadge kind="order" value={o.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ShoppingBag} title="No orders yet." />
            )}
          </TableCard>
        </section>
      )}
    </div>
  );
}