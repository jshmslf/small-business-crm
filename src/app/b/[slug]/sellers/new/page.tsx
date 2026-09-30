import { notFound } from "next/navigation";
import { SellerForm } from "../seller-form";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";

export default async function NewSellerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.INVENTORY_CREATE)) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add seller</h1>
      <SellerForm slug={slug} />
    </div>
  );
}