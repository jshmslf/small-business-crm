import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireBusinessAccess, can } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import { formatPeso } from "@/src/lib/money";
import {
  PAYMENT_METHODS, ORDER_CHANNELS, FULFILLMENT_TYPES,
  optionLabel,
} from "@/src/lib/order-options";
import { OrderActions } from "./order-actions";
import { cn } from "@/src/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { Meta, TableCard } from "@/src/components/data-table";

export default async function OrderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { access } = await requireBusinessAccess(slug);
  if (!can(access, PERMISSIONS.ORDERS_VIEW)) notFound();

  const order = await prisma.order.findFirst({
    where: { id, businessId: access.business.id },
    include: {
      items: true,
      customer: true,
      createdBy: { include: { user: { select: { name: true } } } },
      payments: {
        orderBy: { paidAt: "asc" },
        include: { recordedBy: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!order) notFound();

  const canViewCost = can(access, PERMISSIONS.INVENTORY_VIEW_COST);
  const missingCost = order.items.some((i) => i.unitCost === null);
  const profit =
    order.items.reduce((sum, i) => sum + (i.unitPrice - (i.unitCost ?? 0)) * i.quantity, 0) - order.discount;
  const balance = order.total - order.amountPaid;
  const base = `/b/${slug}`;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            Order #{order.orderNumber}
            <span className="flex items-center gap-2">
              <StatusBadge kind="order" value={order.status} />
              <StatusBadge kind="payment" value={order.paymentStatus} />
            </span>
          </span>
        }
        description={
          <Meta items={[
            order.createdAt.toLocaleString("en-PH"),
            optionLabel(ORDER_CHANNELS, order.channel),
            order.createdBy && `Recorded by ${order.createdBy.user.name}`,
          ]} />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Items */}
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="h-16 min-w-48 whitespace-normal">
                      {line.itemId ? (
                        <Link href={`${base}/inventory/${line.itemId}`}
                          className="font-medium text-gray-900 hover:text-brand-700">{line.name}</Link>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {line.name} <span className="text-xs font-normal text-gray-400">(deleted)</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="h-16 text-right tabular-nums">{line.quantity}</TableCell>
                    <TableCell className="h-16 text-right tabular-nums">{formatPeso(line.unitPrice)}</TableCell>
                    <TableCell className="h-16 text-right font-medium text-gray-900 tabular-nums">
                      {formatPeso(line.unitPrice * line.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <dl className="ml-auto max-w-sm space-y-2 border-t border-gray-200 px-5 py-4 text-sm tabular-nums sm:px-6">
              <TotalRow label="Subtotal" value={formatPeso(order.subtotal)} />
              {order.discount > 0 && <TotalRow label="Discount" value={`−${formatPeso(order.discount)}`} />}
              {order.shippingFee > 0 && <TotalRow label="Shipping" value={formatPeso(order.shippingFee)} />}
              <TotalRow label="Total" value={formatPeso(order.total)}
                className="border-t border-gray-200 pt-2 text-base font-semibold text-gray-900" />
              <TotalRow label="Paid" value={formatPeso(order.amountPaid)} />
              {balance > 0 && order.status !== "CANCELLED" && (
                <TotalRow label="Balance" value={formatPeso(balance)} className="font-medium text-error-700" />
              )}
              {canViewCost && (
                <TotalRow
                  label={<>Profit{missingCost && " (some items have no buying price)"}</>}
                  value={formatPeso(profit)}
                  className="text-success-700"
                />
              )}
            </dl>
          </TableCard>

          {/* Payments */}
          <TableCard header={<h2 className="text-base font-semibold text-gray-900">Payments</h2>}>
            {order.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500 sm:px-6">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{optionLabel(PAYMENT_METHODS, p.method)}</p>
                      <Meta className="text-gray-500" items={[
                        p.paidAt.toLocaleString("en-PH"),
                        p.reference && `Ref ${p.reference}`,
                        p.recordedBy && p.recordedBy.user.name,
                      ]} />
                    </div>
                    <p className="font-medium text-gray-900 tabular-nums">{formatPeso(p.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </TableCard>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 text-sm">
              {order.customer ? (
                <>
                  <Link href={`${base}/customers/${order.customer.id}`}
                    className="font-medium text-gray-900 hover:text-brand-700">
                    {order.customer.firstName} {order.customer.lastName}
                  </Link>
                  {order.customer.phone && <p className="text-gray-600">{order.customer.phone}</p>}
                  {order.customer.facebookName && <p className="text-gray-600">FB: {order.customer.facebookName}</p>}
                </>
              ) : <p className="text-gray-500">Walk-in</p>}
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-base">{optionLabel(FULFILLMENT_TYPES, order.fulfillmentType)}</CardTitle>
            </CardHeader>
            {(order.deliveryAddress || order.notes) && (
              <CardContent className="text-sm">
                {order.deliveryAddress && <p className="text-gray-600">{order.deliveryAddress}</p>}
                {order.notes && <p className="mt-2 whitespace-pre-wrap text-gray-600">{order.notes}</p>}
              </CardContent>
            )}
          </Card>

          <OrderActions
            slug={slug}
            orderId={order.id}
            status={order.status}
            fulfillmentStatus={order.fulfillmentStatus}
            balance={balance}
            amountPaid={order.amountPaid}
            canManage={can(access, PERMISSIONS.ORDERS_MANAGE)}
            canCancel={can(access, PERMISSIONS.ORDERS_CANCEL)}
          />
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4 text-gray-600", className)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
