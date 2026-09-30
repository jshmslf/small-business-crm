import Link from "next/link";
import { CheckCircle2, Plus, Store } from "lucide-react";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import { startOfTodayPH, startOfMonthPH } from "@/src/lib/dates";
import { Button } from "@/src/components/ui/button";
import { PageHeader, SectionHeader } from "@/src/components/page-header";
import { StatCard } from "@/src/components/stat-card";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { Meta, TableCard } from "@/src/components/data-table";

const STAT_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4";

export default async function BusinessHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, access } = await requireBusinessAccess(slug);
  const businessId = access.business.id;
  const base = `/b/${slug}`;

  const canOrders = can(access, PERMISSIONS.ORDERS_VIEW);
  const canInventory = can(access, PERMISSIONS.INVENTORY_VIEW);
  const canCost = can(access, PERMISSIONS.INVENTORY_VIEW_COST);
  const canCustomers = can(access, PERMISSIONS.CUSTOMERS_VIEW);

  const today = startOfTodayPH();
  const monthStart = startOfMonthPH();
  const openStatuses = ["PENDING", "CONFIRMED"] as const;

  // Only query what this person is allowed to see
  const [
    salesToday, salesMonth, collectedToday, openOrders, openBalance, attention,
    monthLines, availableStock, reservedCount, newLeads,
  ] = await Promise.all([
    canOrders
      ? prisma.order.aggregate({
          where: { businessId, status: "COMPLETED", completedAt: { gte: today } },
          _sum: { total: true }, _count: true,
        })
      : null,
    canOrders
      ? prisma.order.aggregate({
          where: { businessId, status: "COMPLETED", completedAt: { gte: monthStart } },
          _sum: { total: true, discount: true }, _count: true,
        })
      : null,
    canOrders
      ? prisma.payment.aggregate({
          where: { paidAt: { gte: today }, order: { businessId, status: { not: "CANCELLED" } } },
          _sum: { amount: true },
        })
      : null,
    canOrders ? prisma.order.count({ where: { businessId, status: { in: [...openStatuses] } } }) : 0,
    canOrders
      ? prisma.order.aggregate({
          where: { businessId, status: { in: [...openStatuses] } },
          _sum: { total: true, amountPaid: true },
        })
      : null,
    canOrders
      ? prisma.order.findMany({
          where: { businessId, status: { in: [...openStatuses] } },
          orderBy: { createdAt: "asc" }, // oldest first: these have waited longest
          take: 6,
          include: { customer: { select: { firstName: true, lastName: true } } },
        })
      : [],
    canOrders && canCost
      ? prisma.orderItem.findMany({
          where: { order: { businessId, status: "COMPLETED", completedAt: { gte: monthStart } } },
          select: { unitPrice: true, unitCost: true, quantity: true },
        })
      : [],
    canInventory
      ? prisma.item.findMany({
          where: { businessId, status: "AVAILABLE", quantity: { gt: 0 } },
          select: { sellingPrice: true, costPrice: true, quantity: true },
        })
      : [],
    canInventory ? prisma.item.count({ where: { businessId, status: "RESERVED" } }) : 0,
    canCustomers
      ? prisma.customer.count({ where: { businessId, status: "LEAD", createdAt: { gte: monthStart } } })
      : 0,
  ]);

  const monthProfit =
    monthLines.reduce((sum, l) => sum + (l.unitPrice - (l.unitCost ?? 0)) * l.quantity, 0) -
    (salesMonth?._sum.discount ?? 0);
  const stockValue = availableStock.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
  const stockCost = availableStock.reduce((sum, i) => sum + (i.costPrice ?? 0) * i.quantity, 0);
  const stockUnits = availableStock.reduce((sum, i) => sum + i.quantity, 0);
  const unpaid = (openBalance?._sum.total ?? 0) - (openBalance?._sum.amountPaid ?? 0);

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name}`}
        description={new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}
        actions={
          can(access, PERMISSIONS.ORDERS_CREATE) && (
            <Button asChild>
              <Link href={`${base}/orders/new`}>
                <Plus aria-hidden />
                New order
              </Link>
            </Button>
          )
        }
      />

      <div className="space-y-10">
        {canOrders && (
          <section>
            <SectionHeader title="Sales" />
            <div className={STAT_GRID}>
              <StatCard label="Sales today" value={formatPeso(salesToday?._sum.total ?? 0)}
                hint={`${salesToday?._count ?? 0} completed order(s)`} />
              <StatCard label="Collected today" value={formatPeso(collectedToday?._sum.amount ?? 0)}
                hint="All payments received" />
              <StatCard label="Sales this month" value={formatPeso(salesMonth?._sum.total ?? 0)}
                hint={`${salesMonth?._count ?? 0} completed order(s)`} />
              {canCost ? (
                <StatCard label="Profit this month" value={formatPeso(monthProfit)} hint="From completed orders" />
              ) : (
                <StatCard label="Open orders" value={String(openOrders)} href={`${base}/orders?status=PENDING`} />
              )}
            </div>
          </section>
        )}

        {canOrders && (
          <section>
            <SectionHeader title="Needs attention" />
            <TableCard
              header={
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-2xl leading-8 font-semibold tracking-tight text-gray-900 tabular-nums">
                      {formatPeso(unpaid)}
                    </span>
                    <span className="text-sm text-gray-500">still to collect</span>
                  </p>
                  <p className="text-sm text-gray-500">{openOrders} open order(s)</p>
                </div>
              }
            >
              {attention.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {attention.map((o) => {
                    const balance = o.total - o.amountPaid;
                    return (
                      <li key={o.id}>
                        <Link href={`${base}/orders/${o.id}`}
                          className="flex flex-col gap-3 px-5 py-4 outline-none hover:bg-gray-50 focus-visible:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ""}` : "Walk-in"}
                            </p>
                            <Meta
                              className="text-sm text-gray-500"
                              items={[`#${o.orderNumber}`, o.createdAt.toLocaleDateString("en-PH")]}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {balance > 0 && (
                              <span className="mr-1 font-medium text-error-700 tabular-nums">{formatPeso(balance)} due</span>
                            )}
                            <StatusBadge kind="payment" value={o.paymentStatus} />
                            <StatusBadge kind="order" value={o.status} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={CheckCircle2} title="No open orders." description="All caught up!" />
              )}
            </TableCard>
          </section>
        )}

        {(canInventory || canCustomers) && (
          <section>
            <SectionHeader title="Shop" />
            <div className={STAT_GRID}>
              {canInventory && (
                <StatCard label="Available items" value={String(stockUnits)} href={`${base}/inventory?status=AVAILABLE`} />
              )}
              {canInventory && (
                <StatCard label="Reserved" value={String(reservedCount)} href={`${base}/inventory?status=RESERVED`} />
              )}
              {canInventory && (
                <StatCard label="Stock value" value={formatPeso(stockValue)}
                  hint={canCost ? (
                    <Meta items={[`Cost ${formatPeso(stockCost)}`, `potential profit ${formatPeso(stockValue - stockCost)}`]} />
                  ) : "At selling price"} />
              )}
              {canCustomers && (
                <StatCard label="New leads this month" value={String(newLeads)} href={`${base}/customers?status=LEAD`} />
              )}
            </div>
          </section>
        )}

        {!canOrders && !canInventory && !canCustomers && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
            <EmptyState
              icon={Store}
              title={`You're signed in to ${access.business.name}.`}
              description="Ask your owner if you need access to more sections."
            />
          </div>
        )}
      </div>
    </div>
  );
}