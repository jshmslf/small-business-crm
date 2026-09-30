import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { Handshake, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageHeader } from "@/src/components/page-header";
import { EmptyState } from "@/src/components/empty-state";
import { EmptyRow, EntityCell, TableCard, TableFooterCount } from "@/src/components/data-table";
import { FilterBar, FilterChip, SearchInput, hrefWithout } from "@/src/components/filter-bar";
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

  const canCreate = can(access, PERMISSIONS.INVENTORY_CREATE);

  return (
    <div>
      <PageHeader
        title="Sellers"
        description="People and suppliers you get items from"
        actions={
          canCreate && (
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus aria-hidden />
                Add seller
              </Link>
            </Button>
          )
        }
      />

      <Form action={base}>
        <FilterBar
          search={
            <>
              <SearchInput name="q" defaultValue={q} placeholder="Search name, phone, Facebook..."
                aria-label="Search sellers" />
              <Button type="submit" variant="secondary">Search</Button>
              {q && (
                <Button asChild variant="link" size="sm">
                  <Link href={base}>Clear</Link>
                </Button>
              )}
            </>
          }
          chips={
            search && <FilterChip href={hrefWithout(base, { q }, "q")}>Search: &ldquo;{search}&rdquo;</FilterChip>
          }
        />
      </Form>

      <TableCard footer={<TableFooterCount count={sellers.length} noun={["seller", "sellers"]} />}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="min-w-56">
                  <EntityCell avatar={s.name} name={s.name} href={`${base}/${s.id}`} secondary={s.email} />
                </TableCell>
                <TableCell>
                  {s.phone && <p className="text-gray-700">{s.phone}</p>}
                  {s.facebookName && <p>FB: {s.facebookName}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{s._count.items}</TableCell>
                <TableCell>{s.createdAt.toLocaleDateString("en-PH")}</TableCell>
              </TableRow>
            ))}
            {sellers.length === 0 && (
              <EmptyRow colSpan={4}>
                <EmptyState
                  icon={Handshake}
                  title={q ? "No sellers match your search." : "No sellers yet."}
                  action={
                    !q && canCreate && (
                      <Button asChild>
                        <Link href={`${base}/new`}>
                          <Plus aria-hidden />
                          Add seller
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
