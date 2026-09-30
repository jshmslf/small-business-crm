import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { EmptyRow, EntityCell, Meta, TableCard, TableFooterCount } from "@/src/components/data-table";
import { FilterBar, FilterChip, SearchInput, hrefWithout } from "@/src/components/filter-bar";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_STATUSES, optionLabel,
} from "@/src/lib/order-options";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; payment?: string }>;
}) {
  const { slug } = await params;
  const { q = "", status = "", payment = "" } = await searchParams;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.ORDERS_VIEW)) notFound();

  const search = q.trim();
  const statusFilter = ORDER_STATUSES.find((s) => s.value === status)?.value;
  const paymentFilter = PAYMENT_STATUSES.find((s) => s.value === payment)?.value;
  const orderNumber = /^#?\d+$/.test(search) ? Number(search.replace("#", "")) : null;

  const orders = await prisma.order.findMany({
    where: {
      businessId: access.business.id,
      ...(statusFilter && { status: statusFilter }),
      ...(paymentFilter && { paymentStatus: paymentFilter }),
      ...(search && (orderNumber !== null
        ? { orderNumber }
        : {
            customer: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            },
          })),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
  });

  const base = `/b/${slug}/orders`;

  const canCreate = can(access, PERMISSIONS.ORDERS_CREATE);
  const activeParams = { q, status, payment };
  const filtered = Boolean(q || status || payment);

  return (
    <div>
      <PageHeader
        title="Orders"
        actions={
          canCreate && (
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus aria-hidden />
                New order
              </Link>
            </Button>
          )
        }
      />

      <Form action={base}>
        <FilterBar
          filters={
            <>
              <NativeSelect name="status" defaultValue={status} aria-label="Order status" wrapperClassName="w-full sm:w-44">
                <NativeSelectOption value="">All statuses</NativeSelectOption>
                {ORDER_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
              <NativeSelect name="payment" defaultValue={payment} aria-label="Payment status" wrapperClassName="w-full sm:w-44">
                <NativeSelectOption value="">All payments</NativeSelectOption>
                {PAYMENT_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
            </>
          }
          search={
            <>
              <SearchInput name="q" defaultValue={q} placeholder="Order # or customer name/phone..."
                aria-label="Search orders" />
              <Button type="submit" variant="secondary">Search</Button>
              {filtered && (
                <Button asChild variant="link" size="sm">
                  <Link href={base}>Clear</Link>
                </Button>
              )}
            </>
          }
          chips={
            (search || statusFilter || paymentFilter) && (
              <>
                {search && <FilterChip href={hrefWithout(base, activeParams, "q")}>Search: &ldquo;{search}&rdquo;</FilterChip>}
                {statusFilter && (
                  <FilterChip href={hrefWithout(base, activeParams, "status")}>{optionLabel(ORDER_STATUSES, statusFilter)}</FilterChip>
                )}
                {paymentFilter && (
                  <FilterChip href={hrefWithout(base, activeParams, "payment")}>{optionLabel(PAYMENT_STATUSES, paymentFilter)}</FilterChip>
                )}
              </>
            )
          }
        />
      </Form>

      <TableCard footer={<TableFooterCount count={orders.length} noun={["order", "orders"]} />}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fulfillment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <EntityCell
                    name={`#${o.orderNumber}`}
                    href={`${base}/${o.id}`}
                    secondary={<Meta items={[o.createdAt.toLocaleDateString("en-PH"), `${o._count.items} item(s)`]} />}
                  />
                </TableCell>
                <TableCell className="text-gray-700">
                  {o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ""}` : <span className="text-gray-400">Walk-in</span>}
                </TableCell>
                <TableCell className="text-right font-medium text-gray-900 tabular-nums">{formatPeso(o.total)}</TableCell>
                <TableCell>
                  <StatusBadge kind="payment" value={o.paymentStatus} />
                </TableCell>
                <TableCell>
                  <StatusBadge kind="order" value={o.status} />
                </TableCell>
                <TableCell>{optionLabel(FULFILLMENT_STATUSES, o.fulfillmentStatus)}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <EmptyRow colSpan={6}>
                <EmptyState
                  icon={ShoppingBag}
                  title={filtered ? "No orders match your filters." : "No orders yet."}
                  action={
                    !filtered && canCreate && (
                      <Button asChild>
                        <Link href={`${base}/new`}>
                          <Plus aria-hidden />
                          New order
                        </Link>
                      </Button>
                    )
                  }
                />
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
