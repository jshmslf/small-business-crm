import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import { ITEM_STATUSES, conditionLabel, itemStatusInfo } from "@/src/lib/item-options";
import { imageVariant } from "@/src/lib/image-url";

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const { slug } = await params;
  const { q = "", status = "", category = "" } = await searchParams;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_VIEW)) notFound();

  const businessId = access.business.id;
  const canViewCost = can(access, PERMISSIONS.INVENTORY_VIEW_COST);
  const search = q.trim();
  const statusFilter = ITEM_STATUSES.find((s) => s.value === status)?.value;

  const [items, statusCounts, categoryRows] = await Promise.all([
    prisma.item.findMany({
      where: {
        businessId,
        // Hide archived items unless specifically filtered
        status: statusFilter ?? { not: "ARCHIVED" },
        ...(category && { category }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        seller: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } }
      },
    }),
    prisma.item.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    prisma.item.findMany({
      where: { businessId, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const countOf = (value: string) => statusCounts.find((s) => s.status === value)?._count._all ?? 0;
  const base = `/b/${slug}/inventory`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        {can(access, PERMISSIONS.INVENTORY_CREATE) && (
          <Link href={`${base}/new`} className="rounded bg-black px-4 py-2 text-white">+ Add item</Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["AVAILABLE", "RESERVED", "SOLD", "DRAFT"].map((value) => {
          const info = itemStatusInfo(value);
          return (
            <Link key={value} href={`${base}?status=${value}`} className="rounded-lg border p-4 hover:bg-gray-50">
              <p className="text-sm text-gray-500">{info.label}</p>
              <p className="text-2xl font-bold">{countOf(value)}</p>
            </Link>
          );
        })}
      </div>

      <Form action={base} className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, SKU, description..."
          className="min-w-64 flex-1 rounded border p-2" />
        <select name="status" defaultValue={status} className="rounded border p-2">
          <option value="">All (except archived)</option>
          {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="category" defaultValue={category} className="rounded border p-2">
          <option value="">All categories</option>
          {categoryRows.map((r) => <option key={r.category} value={r.category!}>{r.category}</option>)}
        </select>
        <button className="rounded border px-4 py-2">Search</button>
        {(q || status || category) && <Link href={base} className="px-2 py-2 text-sm underline">Clear</Link>}
      </Form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Price</th>
              {canViewCost && <th className="p-3 text-right">Cost</th>}
              {canViewCost && <th className="p-3 text-right">Profit</th>}
              <th className="p-3">Seller</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => {
              const s = itemStatusInfo(item.status);
              const profit = item.costPrice !== null ? item.sellingPrice - item.costPrice : null;
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {item.images[0] ? (
                        <img src={imageVariant(item.images[0].url, 80)} alt=""
                          className="h-10 w-10 shrink-0 rounded object-cover" />
                      ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-gray-100"/>
                      )}
                    </div>
                    <Link href={`${base}/${item.id}`} className="font-medium hover:underline">{item.name}</Link>
                    <p className="text-xs text-gray-500">
                      {[item.category, item.sku].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="p-3 text-gray-600">{conditionLabel(item.condition)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.badge}`}>{s.label}</span>
                  </td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right">{formatPeso(item.sellingPrice)}</td>
                  {canViewCost && <td className="p-3 text-right text-gray-600">{formatPeso(item.costPrice)}</td>}
                  {canViewCost && (
                    <td className={`p-3 text-right ${profit !== null && profit < 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatPeso(profit)}
                    </td>
                  )}
                  <td className="p-3 text-gray-600">{item.seller?.name ?? "—"}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={canViewCost ? 8 : 6} className="p-6 text-center text-gray-500">
                  {q || status || category ? "No items match your filters." : "No items yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}