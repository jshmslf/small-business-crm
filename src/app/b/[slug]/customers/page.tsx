import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { CUSTOMER_STATUSES, sourceLabel, statusInfo } from "@/src/lib/customer-options";
import { prisma } from "@/src/lib/prisma";


export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { slug } = await params;
  const { q = "", status = "" } = await searchParams;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.CUSTOMERS_VIEW)) notFound();

  const search = q.trim();
  const statusFilter = CUSTOMER_STATUSES.find((s) => s.value === status)?.value;

  const customers = await prisma.customer.findMany({
    where: {
      businessId: access.business.id,
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { facebookName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { assignedTo: { include: { user: { select: { name: true } } } } },
  });

  const base = `/b/${slug}/customers`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500">{customers.length} shown</p>
        </div>
        {can(access, PERMISSIONS.CUSTOMERS_CREATE) && (
          <Link href={`${base}/new`} className="rounded bg-black px-4 py-2 text-white">
            + Add customer
          </Link>
        )}
      </div>

      <Form action={base} className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone, Facebook, email..."
          className="min-w-64 flex-1 rounded border p-2" />
        <select name="status" defaultValue={status} className="rounded border p-2">
          <option value="">All statuses</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="rounded border px-4 py-2">Search</button>
        {(q || status) && <Link href={base} className="px-2 py-2 text-sm underline">Clear</Link>}
      </Form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Status</th>
              <th className="p-3">Source</th>
              <th className="p-3">Handled by</th>
              <th className="p-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => {
              const s = statusInfo(c.status);
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`${base}/${c.id}`} className="font-medium hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">
                    {c.phone && <p>{c.phone}</p>}
                    {c.facebookName && <p>FB: {c.facebookName}</p>}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.badge}`}>{s.label}</span>
                  </td>
                  <td className="p-3 text-gray-600">{sourceLabel(c.source)}</td>
                  <td className="p-3 text-gray-600">{c.assignedTo?.user.name ?? "—"}</td>
                  <td className="p-3 text-gray-600">{c.createdAt.toLocaleDateString("en-PH")}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  {q || status ? "No customers match your search." : "No customers yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}