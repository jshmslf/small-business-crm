import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { notFound } from "next/navigation";
import { NewOrderForm } from "./new-order-form";

export default async function NewOrderPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const { access } = await requireBusinessAccess(slug);
    if (!can(access, PERMISSIONS.ORDERS_CREATE)) notFound();
    const businessId = access.business.id;

    const [customers, items] = await Promise.all([
        prisma.customer.findMany({
            where: { businessId },
            select: { id: true, firstName: true, lastName: true, phone: true, address: true, },
            orderBy: { firstName: "asc" },
            take: 500,
        }),
        prisma.item.findMany({
            where: { businessId, status: "AVAILABLE", quantity: { gt: 0 } },
            select: {
                id: true, name: true, sku: true, category: true, quantity: true, sellingPrice: true,
                images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">New order</h1>
            <NewOrderForm
                slug={slug}
                customers={customers.map((c) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
                    phone: c.phone,
                    address: c.address,
                }))}
                items={items.map((i) => ({
                    id: i.id,
                    name: i.name,
                    sku: i.sku,
                    category: i.category,
                    quantity: i.quantity,
                    sellingPrice: i.sellingPrice,
                    imageUrl: i.images[0]?.url ?? null,
                }))}
            />
        </div>
    )
}