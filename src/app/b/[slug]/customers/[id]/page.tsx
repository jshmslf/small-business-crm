import { notFound } from "next/navigation";
import { CustomerForm } from "../customer-form";
import { can, getActiveMembers, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";

export default async function CustomerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.CUSTOMERS_VIEW)) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id, businessId: access.business.id },
  });
  if (!customer) notFound();

  const members = await getActiveMembers(access.business.id);

  // The form works with plain strings, so turn nulls into ""
  const formValues = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    facebookName: customer.facebookName ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    source: customer.source,
    status: customer.status,
    lookingFor: customer.lookingFor ?? "",
    notes: customer.notes ?? "",
    assignedToId: customer.assignedToId ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
        <p className="text-sm text-gray-500">
          Added {customer.createdAt.toLocaleDateString("en-PH")} · Updated {customer.updatedAt.toLocaleDateString("en-PH")}
        </p>
      </div>
      <CustomerForm
        slug={slug}
        members={members}
        customer={formValues}
        canEdit={can(access, PERMISSIONS.CUSTOMERS_EDIT)}
        canDelete={can(access, PERMISSIONS.CUSTOMERS_DELETE)}
      />
    </div>
  );
}