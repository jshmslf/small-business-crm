import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can, getItemFormOptions } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { centavosToInput } from "@/src/lib/money";
import { ItemForm } from "../item-form";
import { ItemPhotos } from "./item-photos";
import { PageHeader } from "@/src/components/page-header";
import { Meta } from "@/src/components/data-table";
import { Notice } from "@/src/components/form-field";

export default async function ItemPage({
  params,
  searchParams,
}: {
    params: Promise<{ slug: string; id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
  const { slug, id } = await params;
  const { photos } = await searchParams;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_VIEW)) notFound();

  const item = await prisma.item.findFirst({
    where: { id, businessId: access.business.id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!item) notFound();

  const { sellers, categories } = await getItemFormOptions(access.business.id);
  const canViewCost = can(access, PERMISSIONS.INVENTORY_VIEW_COST);

  const formValues = {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    category: item.category ?? "",
    sku: item.sku ?? "",
    condition: item.condition,
    status: item.status,
    quantity: String(item.quantity),
    // Never send the buying price to the browser without permission
    costPrice: canViewCost ? centavosToInput(item.costPrice) : "",
    sellingPrice: centavosToInput(item.sellingPrice),
    sellerId: item.sellerId ?? "",
    acquiredAt: item.acquiredAt ? item.acquiredAt.toISOString().slice(0, 10) : "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-2"
        title={item.name}
        description={
          <Meta items={[
            `Added ${item.createdAt.toLocaleDateString("en-PH")}`,
            item.soldAt && `Sold ${item.soldAt.toLocaleDateString("en-PH")}`,
          ]} />
        }
      />
      {photos === "failed" && (
        <Notice tone="warning" className="max-w-3xl">
          The item was saved, but some photos didn&apos;t upload. You can add them below.
        </Notice>
      )}
      <ItemPhotos
        slug={slug}
        itemId={item.id}
        photos={item.images.map((img) => ({ id: img.id, url: img.url }))}
        canEdit={can(access, PERMISSIONS.INVENTORY_EDIT)}
      />
      <ItemForm
        slug={slug}
        sellers={sellers}
        categories={categories}
        item={formValues}
        canEdit={can(access, PERMISSIONS.INVENTORY_EDIT)}
        canDelete={can(access, PERMISSIONS.INVENTORY_DELETE)}
        canViewCost={canViewCost}
      />
    </div>
  );
}