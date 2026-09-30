import { notFound } from "next/navigation";
import { SellerForm } from "../seller-form";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";

export default async function SellerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_VIEW)) notFound();

  const seller = await prisma.seller.findFirst({
    where: { id, businessId: access.business.id },
    include: { _count: { select: { items: true } } },
  });
  if (!seller) notFound();

  const formValues = {
    id: seller.id,
    name: seller.name,
    phone: seller.phone ?? "",
    email: seller.email ?? "",
    facebookName: seller.facebookName ?? "",
    address: seller.address ?? "",
    notes: seller.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{seller.name}</h1>
        <p className="text-sm text-gray-500">{seller._count.items} item(s) from this seller</p>
      </div>
      <SellerForm
        slug={slug}
        seller={formValues}
        itemCount={seller._count.items}
        canEdit={can(access, PERMISSIONS.INVENTORY_EDIT)}
        canDelete={can(access, PERMISSIONS.INVENTORY_DELETE)}
      />
    </div>
  );
}