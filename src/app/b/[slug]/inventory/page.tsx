import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageHeader } from "@/src/components/page-header";
import { StatCard } from "@/src/components/stat-card";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { EmptyRow, EntityCell, Meta, TableCard, TableFooterCount } from "@/src/components/data-table";
import { FilterBar, FilterChip, SearchInput, hrefWithout } from "@/src/components/filter-bar";
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

  const canCreate = can(access, PERMISSIONS.INVENTORY_CREATE);
  const activeParams = { q, status, category };
  const filtered = Boolean(q || status || category);

  return (
    <div>
      <PageHeader
        title="Inventory"
        actions={
          canCreate && (
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus aria-hidden />
                Add item
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
        {["AVAILABLE", "RESERVED", "SOLD", "DRAFT"].map((value) => (
          <StatCard key={value} label={itemStatusInfo(value).label} value={countOf(value)} href={`${base}?status=${value}`} />
        ))}
      </div>

      <Form action={base}>
        <FilterBar
          filters={
            <>
              <NativeSelect name="status" defaultValue={status} aria-label="Status" wrapperClassName="w-full sm:w-52">
                <NativeSelectOption value="">All (except archived)</NativeSelectOption>
                {ITEM_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
              <NativeSelect name="category" defaultValue={category} aria-label="Category" wrapperClassName="w-full sm:w-48">
                <NativeSelectOption value="">All categories</NativeSelectOption>
                {categoryRows.map((r) => <NativeSelectOption key={r.category} value={r.category!}>{r.category}</NativeSelectOption>)}
              </NativeSelect>
            </>
          }
          search={
            <>
              <SearchInput name="q" defaultValue={q} placeholder="Search name, SKU, description..."
                aria-label="Search items" />
              <Button type="submit" variant="secondary">Search</Button>
              {filtered && (
                <Button asChild variant="link" size="sm">
                  <Link href={base}>Clear</Link>
                </Button>
              )}
            </>
          }
          chips={
            (search || statusFilter || category) && (
              <>
                {search && <FilterChip href={hrefWithout(base, activeParams, "q")}>Search: &ldquo;{search}&rdquo;</FilterChip>}
                {statusFilter && (
                  <FilterChip href={hrefWithout(base, activeParams, "status")}>{itemStatusInfo(statusFilter).label}</FilterChip>
                )}
                {category && <FilterChip href={hrefWithout(base, activeParams, "category")}>{category}</FilterChip>}
              </>
            )
          }
        />
      </Form>

      <TableCard footer={<TableFooterCount count={items.length} noun={["item", "items"]} />}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {canViewCost && <TableHead className="text-right">Cost</TableHead>}
              {canViewCost && <TableHead className="text-right">Profit</TableHead>}
              <TableHead>Seller</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const profit = item.costPrice !== null ? item.sellingPrice - item.costPrice : null;
              return (
                <TableRow key={item.id}>
                  <TableCell className="min-w-64">
                    <EntityCell
                      image={item.images[0] ? imageVariant(item.images[0].url, 80) : null}
                      name={item.name}
                      href={`${base}/${item.id}`}
                      secondary={<Meta items={[item.category, item.sku]} />}
                    />
                  </TableCell>
                  <TableCell>{conditionLabel(item.condition)}</TableCell>
                  <TableCell>
                    <StatusBadge kind="item" value={item.status} />
                  </TableCell>
                  <TableCell className="text-right text-gray-700 tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium text-gray-900 tabular-nums">{formatPeso(item.sellingPrice)}</TableCell>
                  {canViewCost && <TableCell className="text-right tabular-nums">{formatPeso(item.costPrice)}</TableCell>}
                  {canViewCost && (
                    <TableCell className={`text-right font-medium tabular-nums ${profit !== null && profit < 0 ? "text-error-700" : "text-success-700"}`}>
                      {formatPeso(profit)}
                    </TableCell>
                  )}
                  <TableCell>{item.seller?.name ?? "—"}</TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <EmptyRow colSpan={canViewCost ? 8 : 6}>
                <EmptyState
                  icon={Package}
                  title={filtered ? "No items match your filters." : "No items yet."}
                  action={
                    !filtered && canCreate && (
                      <Button asChild>
                        <Link href={`${base}/new`}>
                          <Plus aria-hidden />
                          Add item
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
