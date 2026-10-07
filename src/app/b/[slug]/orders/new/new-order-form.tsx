"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPeso, parsePeso, centavosToInput } from "@/src/lib/money";
import { imageVariant } from "@/src/lib/image-url";
import { ORDER_CHANNELS, FULFILLMENT_TYPES, PAYMENT_METHODS } from "@/src/lib/order-options";
import { createOrder } from "../actions";
import { ImageIcon, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Textarea } from "@/src/components/ui/textarea";
import { Field, Notice } from "@/src/components/form-field";
import { EmptyState } from "@/src/components/empty-state";
import { EmptyRow, TableCard } from "@/src/components/data-table";
import { SearchInput } from "@/src/components/filter-bar";
import { IconButton } from "@/src/components/icon-button";
import { useWarnOnLeave } from "@/src/lib/unsaved-changes";

type PickerItem = {
  id: string; name: string; sku: string | null; category: string | null;
  quantity: number; sellingPrice: number; imageUrl: string | null;
};
type PickerCustomer = { id: string; name: string; phone: string | null; address: string | null };
type Line = { itemId: string; quantity: number; unitPrice: string };

export function NewOrderForm({ slug, customers, items }: {
  slug: string; customers: PickerCustomer[]; items: PickerItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState("FACEBOOK");
  const [fulfillmentType, setFulfillmentType] = useState("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [payment, setPayment] = useState({ amount: "", method: "CASH", reference: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((i) => [i.name, i.sku, i.category].some((v) => v?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [search, items]);

  function addItem(item: PickerItem) {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, quantity: Math.min(l.quantity + 1, item.quantity) } : l
        );
      }
      return [...prev, { itemId: item.id, quantity: 1, unitPrice: centavosToInput(item.sellingPrice) }];
    });
    setSearch("");
  }

  function updateLine(itemId: string, changes: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...changes } : l)));
  }

  function chooseCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    if (customer?.address && !deliveryAddress) setDeliveryAddress(customer.address);
  }

  // Live totals (the server recalculates everything; this is just a preview)
  const toCentavos = (value: string) => {
    const r = parsePeso(value);
    return r.ok ? r.value ?? 0 : 0;
  };
  const subtotal = lines.reduce((sum, l) => sum + toCentavos(l.unitPrice) * l.quantity, 0);
  const total = subtotal - toCentavos(discount) + toCentavos(shippingFee);
  const needsAddress = fulfillmentType === "DELIVERY" || fulfillmentType === "SHIPPING";

  const isDirty =
    lines.length > 0 ||
    channel !== "FACEBOOK" ||
    fulfillmentType !== "PICKUP" ||
    [customerId, deliveryAddress, notes, discount, shippingFee, payment.amount, payment.reference]
      .some((value) => value.trim() !== "");
  useWarnOnLeave(isDirty);

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = await createOrder(slug, {
      customerId, channel, fulfillmentType, deliveryAddress, notes, discount, shippingFee, lines,
      payment: payment.amount.trim() ? payment : null,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.push(`/b/${slug}/orders/${result.id}`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
      {/* Left: items */}
      <div className="min-w-0 space-y-4 lg:col-span-3">
        <div className="relative">
          <SearchInput className="lg:w-full" aria-label="Search items" placeholder="Search items by name, SKU, or category..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
                {results.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => addItem(item)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none hover:bg-gray-50 focus-visible:bg-gray-50">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageVariant(item.imageUrl, 80)} alt=""
                          className="size-10 shrink-0 rounded-lg border border-gray-200 object-cover" />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                          <ImageIcon className="size-4" aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.quantity} in stock</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 tabular-nums">{formatPeso(item.sellingPrice)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {search.trim() && results.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No available items match.</p>
          )}
        </div>

        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-36">Price (₱)</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"><span className="sr-only">Remove</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const item = itemById.get(line.itemId)!;
                return (
                  <TableRow key={line.itemId}>
                    <TableCell className="min-w-48 whitespace-normal">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500 tabular-nums">List price {formatPeso(item.sellingPrice)}</p>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} max={item.quantity} className="h-9 w-20 tabular-nums"
                        aria-label={`Quantity for ${item.name}`}
                        value={line.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, Math.min(item.quantity, Number(e.target.value) || 1));
                          updateLine(line.itemId, { quantity: qty });
                        }} />
                    </TableCell>
                    <TableCell>
                      <Input inputMode="decimal" className="h-9 w-32 tabular-nums" aria-label={`Price for ${item.name}`}
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.itemId, { unitPrice: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900 tabular-nums">
                      {formatPeso(toCentavos(line.unitPrice) * line.quantity)}
                    </TableCell>
                    <TableCell className="pl-0 text-right">
                      <IconButton label="Remove" className="hover:text-error-700"
                        onClick={() => setLines((prev) => prev.filter((l) => l.itemId !== line.itemId))}>
                        <Trash2 />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lines.length === 0 && (
                <EmptyRow colSpan={5}>
                  <EmptyState icon={ShoppingBag} title="Search above to add items." className="py-10" />
                </EmptyRow>
              )}
            </TableBody>
          </Table>
        </TableCard>
        <p className="text-sm text-gray-500">
          You can change the price per item for haggled deals. The list price stays the same in inventory.
        </p>
      </div>

      {/* Right: details and summary */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Customer" htmlFor="customerId">
              <NativeSelect id="customerId" value={customerId} onChange={(e) => chooseCustomer(e.target.value)}>
                <NativeSelectOption value="">Walk-in / no customer record</NativeSelectOption>
                {customers.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Channel" htmlFor="channel">
                <NativeSelect id="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {ORDER_CHANNELS.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <Field label="Fulfillment" htmlFor="fulfillmentType">
                <NativeSelect id="fulfillmentType" value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value)}>
                  {FULFILLMENT_TYPES.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>
            {needsAddress && (
              <Field label="Delivery address" htmlFor="deliveryAddress">
                <Input id="deliveryAddress" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </Field>
            )}
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" rows={2} placeholder="Meetup place, special requests..."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 sm:py-0">
          <dl className="space-y-3 px-5 py-5 text-sm tabular-nums sm:px-6">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal</dt><dd>{formatPeso(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 text-gray-600">
              <dt><label htmlFor="discount">Discount (₱)</label></dt>
              <dd>
                <Input id="discount" inputMode="decimal" className="h-9 w-28 text-right" placeholder="0.00"
                  value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 text-gray-600">
              <dt><label htmlFor="shippingFee">Shipping fee (₱)</label></dt>
              <dd>
                <Input id="shippingFee" inputMode="decimal" className="h-9 w-28 text-right" placeholder="0.00"
                  value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
              </dd>
            </div>
          </dl>
          <div className="flex justify-between border-t border-gray-200 px-5 py-4 text-base font-semibold text-gray-900 tabular-nums sm:px-6">
            <span>Total</span><span>{formatPeso(total)}</span>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment received now (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input inputMode="decimal" aria-label="Amount" placeholder="Amount (₱)" value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
              <NativeSelect aria-label="Payment method" value={payment.method}
                onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <NativeSelectOption key={m.value} value={m.value}>{m.label}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <Input aria-label="Reference number" placeholder="Reference no. (e.g. GCash ref)" value={payment.reference}
              onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <Button type="button" variant="link" size="xs"
              onClick={() => setPayment({ ...payment, amount: centavosToInput(Math.max(total, 0)) })}>
              Paid in full
            </Button>
          </CardContent>
        </Card>

        {error && <Notice tone="error">{error}</Notice>}

        <Button size="lg" onClick={handleSave} disabled={saving || lines.length === 0} className="w-full">
          {saving ? "Saving..." : `Create order · ${formatPeso(total)}`}
        </Button>
      </div>
    </div>
  );
}
