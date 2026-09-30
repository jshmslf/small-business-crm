import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";


export default async function SellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q = "" } = await searchParams;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_VIEW)) notFound();

  const search = q.trim();
  const sellers = await prisma.seller.findMany({
    where: {
      businessId: access.business.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { facebookName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });

  const base = `/b/${slug}/sellers`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sellers</h1>
          <p className="text-gray-500">People and suppliers you get items from</p>
        </div>
        {can(access, PERMISSIONS.INVENTORY_CREATE) && (
          <Link href={`${base}/new`} className="rounded bg-black px-4 py-2 text-white">+ Add seller</Link>
        )}
      </div>

      <Form action={base} className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone, Facebook..."
          className="flex-1 rounded border p-2" />
        <button className="rounded border px-4 py-2">Search</button>
        {q && <Link href={base} className="px-2 py-2 text-sm underline">Clear</Link>}
      </Form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Items</th>
              <th className="p-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sellers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <Link href={`${base}/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                </td>
                <td className="p-3 text-gray-600">
                  {s.phone && <p>{s.phone}</p>}
                  {s.facebookName && <p>FB: {s.facebookName}</p>}
                </td>
                <td className="p-3 text-gray-600">{s._count.items}</td>
                <td className="p-3 text-gray-600">{s.createdAt.toLocaleDateString("en-PH")}</td>
              </tr>
            ))}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  {q ? "No sellers match your search." : "No sellers yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}