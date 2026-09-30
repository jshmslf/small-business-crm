import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import { startOfTodayPH, startOfMonthPH } from "@/src/lib/dates";
import { ORDER_STATUSES, PAYMENT_STATUSES, optionLabel, optionBadge } from "@/src/lib/order-options";

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const content = (
    <>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg border p-4 hover:bg-gray-50">{content}</Link>
  ) : (
    <div className="rounded-lg border p-4">{content}</div>
  );
}

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
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hello, {user.name}</h1>
          <p className="text-gray-500">
            {new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {can(access, PERMISSIONS.ORDERS_CREATE) && (
          <Link href={`${base}/orders/new`} className="rounded bg-black px-4 py-2 text-white">+ New order</Link>
        )}
      </div>

      {canOrders && (
        <section className="space-y-3">
          <h2 className="font-semibold">Sales</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sales today" value={formatPeso(salesToday?._sum.total ?? 0)}
              hint={`${salesToday?._count ?? 0} completed order(s)`} />
            <Stat label="Collected today" value={formatPeso(collectedToday?._sum.amount ?? 0)}
              hint="All payments received" />
            <Stat label="Sales this month" value={formatPeso(salesMonth?._sum.total ?? 0)}
              hint={`${salesMonth?._count ?? 0} completed order(s)`} />
            {canCost ? (
              <Stat label="Profit this month" value={formatPeso(monthProfit)} hint="From completed orders" />
            ) : (
              <Stat label="Open orders" value={String(openOrders)} href={`${base}/orders?status=PENDING`} />
            )}
          </div>
        </section>
      )}

      {canOrders && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Needs attention</h2>
            <p className="text-sm text-gray-500">
              {openOrders} open order(s) · {formatPeso(unpaid)} still to collect
            </p>
          </div>
          <div className="divide-y rounded-lg border">
            {attention.map((o) => {
              const balance = o.total - o.amountPaid;
              return (
                <Link key={o.id} href={`${base}/orders/${o.id}`}
                  className="flex items-center justify-between p-3 text-sm hover:bg-gray-50">
                  <div>
                    <p className="font-medium">
                      #{o.orderNumber} · {o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ""}` : "Walk-in"}
                    </p>
                    <p className="text-xs text-gray-500">{o.createdAt.toLocaleDateString("en-PH")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {balance > 0 && <span className="text-red-600">{formatPeso(balance)} due</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(PAYMENT_STATUSES, o.paymentStatus)}`}>
                      {optionLabel(PAYMENT_STATUSES, o.paymentStatus)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(ORDER_STATUSES, o.status)}`}>
                      {optionLabel(ORDER_STATUSES, o.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
            {attention.length === 0 && <p className="p-4 text-sm text-gray-500">No open orders. All caught up!</p>}
          </div>
        </section>
      )}

      {(canInventory || canCustomers) && (
        <section className="space-y-3">
          <h2 className="font-semibold">Shop</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {canInventory && (
              <Stat label="Available items" value={String(stockUnits)} href={`${base}/inventory?status=AVAILABLE`} />
            )}
            {canInventory && (
              <Stat label="Reserved" value={String(reservedCount)} href={`${base}/inventory?status=RESERVED`} />
            )}
            {canInventory && (
              <Stat label="Stock value" value={formatPeso(stockValue)}
                hint={canCost ? `Cost ${formatPeso(stockCost)} · potential profit ${formatPeso(stockValue - stockCost)}` : "At selling price"} />
            )}
            {canCustomers && (
              <Stat label="New leads this month" value={String(newLeads)} href={`${base}/customers?status=LEAD`} />
            )}
          </div>
        </section>
      )}

      {!canOrders && !canInventory && !canCustomers && (
        <p className="text-gray-500">
          You&apos;re signed in to {access.business.name}. Ask your owner if you need access to more sections.
        </p>
      )}
    </div>
  );
}