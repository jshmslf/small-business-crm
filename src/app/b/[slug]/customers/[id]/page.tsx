import { notFound } from "next/navigation";
import { CustomerForm } from "../customer-form";
import { can, getActiveMembers, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import Link from "next/link";
import { formatPeso } from "@/src/lib/money";
import { optionBadge, optionLabel, ORDER_STATUSES } from "@/src/lib/order-options";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
        <p className="text-sm text-gray-500">
          Added {customer.createdAt.toLocaleDateString("en-PH")} · Updated {customer.updatedAt.toLocaleDateString("en-PH")}
        </p>
      </div>
      <CustomerForm
        slug={slug}
        members={members}
        customer={formValues}
        canEdit={can(access, PERMISSIONS.CUSTOMERS_EDIT)}
        canDelete={can(access, PERMISSIONS.CUSTOMERS_DELETE)}
      />
            {canOrders && (
        <section className="max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Orders ({orders.length})</h2>
            <p className="text-sm text-gray-500">Total spent: {formatPeso(totalSpent)}</p>
          </div>
          <div className="divide-y rounded-lg border">
            {orders.map((o) => (
              <Link key={o.id} href={`/b/${slug}/orders/${o.id}`}
                className="flex items-center justify-between p-3 text-sm hover:bg-gray-50">
                <div>
                  <p className="font-medium">#{o.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    {o.createdAt.toLocaleDateString("en-PH")} · {o._count.items} item(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatPeso(o.total)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(ORDER_STATUSES, o.status)}`}>
                    {optionLabel(ORDER_STATUSES, o.status)}
                  </span>
                </div>
              </Link>
            ))}
            {orders.length === 0 && <p className="p-3 text-sm text-gray-500">No orders yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}