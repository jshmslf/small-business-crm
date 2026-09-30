import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { CUSTOMER_STATUSES, sourceLabel, statusInfo } from "@/src/lib/customer-options";
import { prisma } from "@/src/lib/prisma";
import { Plus, Users } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { EmptyRow, EntityCell, TableCard } from "@/src/components/data-table";
import { FilterBar, FilterChip, SearchInput, hrefWithout } from "@/src/components/filter-bar";


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

  const canCreate = can(access, PERMISSIONS.CUSTOMERS_CREATE);
  const activeParams = { q, status };

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} shown`}
        actions={
          canCreate && (
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus aria-hidden />
                Add customer
              </Link>
            </Button>
          )
        }
      />

      <Form action={base}>
        <FilterBar
          filters={
            <NativeSelect name="status" defaultValue={status} aria-label="Status" wrapperClassName="w-full sm:w-48">
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {CUSTOMER_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
            </NativeSelect>
          }
          search={
            <>
              <SearchInput name="q" defaultValue={q} placeholder="Search name, phone, Facebook, email..."
                aria-label="Search customers" />
              <Button type="submit" variant="secondary">Search</Button>
              {(q || status) && (
                <Button asChild variant="link" size="sm">
                  <Link href={base}>Clear</Link>
                </Button>
              )}
            </>
          }
          chips={
            (search || statusFilter) && (
              <>
                {search && <FilterChip href={hrefWithout(base, activeParams, "q")}>Search: &ldquo;{search}&rdquo;</FilterChip>}
                {statusFilter && (
                  <FilterChip href={hrefWithout(base, activeParams, "status")}>{statusInfo(statusFilter).label}</FilterChip>
                )}
              </>
            )
          }
        />
      </Form>

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Handled by</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="min-w-56">
                  <EntityCell
                    avatar={`${c.firstName} ${c.lastName ?? ""}`}
                    name={<>{c.firstName} {c.lastName}</>}
                    href={`${base}/${c.id}`}
                    secondary={c.email}
                  />
                </TableCell>
                <TableCell>
                  {c.phone && <p className="text-gray-700">{c.phone}</p>}
                  {c.facebookName && <p>FB: {c.facebookName}</p>}
                </TableCell>
                <TableCell>
                  <StatusBadge kind="customer" value={c.status} />
                </TableCell>
                <TableCell>{sourceLabel(c.source)}</TableCell>
                <TableCell>{c.assignedTo?.user.name ?? "—"}</TableCell>
                <TableCell>{c.createdAt.toLocaleDateString("en-PH")}</TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <EmptyRow colSpan={6}>
                <EmptyState
                  icon={Users}
                  title={q || status ? "No customers match your search." : "No customers yet."}
                  action={
                    !(q || status) && canCreate && (
                      <Button asChild>
                        <Link href={`${base}/new`}>
                          <Plus aria-hidden />
                          Add customer
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
