import { PageHeader } from "@/src/components/page-header";
import { notFound } from "next/navigation";
import { requireBusinessAccess, can, getItemFormOptions } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { ItemForm } from "../item-form";

export default async function NewItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_CREATE)) notFound();

  const { sellers, categories } = await getItemFormOptions(access.business.id);

  return (
    <div>
      <PageHeader title="Add item" />
      <ItemForm
        slug={slug}
        sellers={sellers}
        categories={categories}
        canViewCost={can(access, PERMISSIONS.INVENTORY_VIEW_COST)}
      />
    </div>
  );
}