import { PageHeader } from "@/src/components/page-header";
import { notFound } from "next/navigation";
import { CustomerForm } from "../customer-form";
import { PERMISSIONS } from "@/src/lib/permissions";
import { can, getActiveMembers, requireBusinessAccess } from "@/src/lib/access";

export default async function NewCustomerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.CUSTOMERS_CREATE)) notFound();

  const members = await getActiveMembers(access.business.id);

  return (
    <div>
      <PageHeader title="Add customer" />
      <CustomerForm slug={slug} members={members} />
    </div>
  );
}