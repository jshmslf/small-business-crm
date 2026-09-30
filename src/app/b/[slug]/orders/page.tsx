import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_STATUSES, optionLabel, optionBadge,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        {can(access, PERMISSIONS.ORDERS_CREATE) && (
          <Link href={`${base}/new`} className="rounded bg-black px-4 py-2 text-white">+ New order</Link>
        )}
      </div>

      <Form action={base} className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Order # or customer name/phone..."
          className="min-w-64 flex-1 rounded border p-2" />
        <select name="status" defaultValue={status} className="rounded border p-2">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="payment" defaultValue={payment} className="rounded border p-2">
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="rounded border px-4 py-2">Search</button>
        {(q || status || payment) && <Link href={base} className="px-2 py-2 text-sm underline">Clear</Link>}
      </Form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Fulfillment</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <Link href={`${base}/${o.id}`} className="font-medium hover:underline">#{o.orderNumber}</Link>
                  <p className="text-xs text-gray-500">
                    {o.createdAt.toLocaleDateString("en-PH")} · {o._count.items} item(s)
                  </p>
                </td>
                <td className="p-3">
                  {o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ""}` : <span className="text-gray-400">Walk-in</span>}
                </td>
                <td className="p-3 text-right">{formatPeso(o.total)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(PAYMENT_STATUSES, o.paymentStatus)}`}>
                    {optionLabel(PAYMENT_STATUSES, o.paymentStatus)}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${optionBadge(ORDER_STATUSES, o.status)}`}>
                    {optionLabel(ORDER_STATUSES, o.status)}
                  </span>
                </td>
                <td className="p-3 text-gray-600">{optionLabel(FULFILLMENT_STATUSES, o.fulfillmentStatus)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  {q || status || payment ? "No orders match your filters." : "No orders yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}