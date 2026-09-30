"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPeso, parsePeso, centavosToInput } from "@/src/lib/money";
import { imageVariant } from "@/src/lib/image-url";
import { ORDER_CHANNELS, FULFILLMENT_TYPES, PAYMENT_METHODS } from "@/src/lib/order-options";
import { createOrder } from "../actions";

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

  const input = "w-full rounded border p-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Left: items */}
      <div className="space-y-4 lg:col-span-3">
        <div className="relative">
          <input className={input} placeholder="Search items by name, SKU, or category..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full divide-y rounded-lg border bg-white shadow">
              {results.map((item) => (
                <button key={item.id} onClick={() => addItem(item)}
                  className="flex w-full items-center gap-3 p-2 text-left hover:bg-gray-50">
                  {item.imageUrl ? (
                    <img src={imageVariant(item.imageUrl, 80)} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : <div className="h-10 w-10 rounded bg-gray-100" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} in stock</p>
                  </div>
                  <p className="text-sm">{formatPeso(item.sellingPrice)}</p>
                </button>
              ))}
            </div>
          )}
          {search.trim() && results.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">No available items match.</p>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Item</th>
                <th className="w-24 p-3">Qty</th>
                <th className="w-32 p-3">Price (₱)</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line) => {
                const item = itemById.get(line.itemId)!;
                return (
                  <tr key={line.itemId}>
                    <td className="p-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">List price {formatPeso(item.sellingPrice)}</p>
                    </td>
                    <td className="p-3">
                      <input type="number" min={1} max={item.quantity} className="w-full rounded border p-1"
                        value={line.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, Math.min(item.quantity, Number(e.target.value) || 1));
                          updateLine(line.itemId, { quantity: qty });
                        }} />
                    </td>
                    <td className="p-3">
                      <input inputMode="decimal" className="w-full rounded border p-1" value={line.unitPrice}
                        onChange={(e) => updateLine(line.itemId, { unitPrice: e.target.value })} />
                    </td>
                    <td className="p-3 text-right">{formatPeso(toCentavos(line.unitPrice) * line.quantity)}</td>
                    <td className="p-3 text-right">
                      <button className="text-red-600"
                        onClick={() => setLines((prev) => prev.filter((l) => l.itemId !== line.itemId))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">Search above to add items.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          You can change the price per item for haggled deals. The list price stays the same in inventory.
        </p>
      </div>

      {/* Right: details and summary */}
      <div className="space-y-4 lg:col-span-2">
        <div>
          <label className={label}>Customer</label>
          <select className={input} value={customerId} onChange={(e) => chooseCustomer(e.target.value)}>
            <option value="">Walk-in / no customer record</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Channel</label>
            <select className={input} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {ORDER_CHANNELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Fulfillment</label>
            <select className={input} value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value)}>
              {FULFILLMENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {needsAddress && (
          <div>
            <label className={label}>Delivery address</label>
            <input className={input} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </div>
        )}
        <div>
          <label className={label}>Notes</label>
          <textarea className={input} rows={2} placeholder="Meetup place, special requests..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPeso(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <span>Discount (₱)</span>
            <input inputMode="decimal" className="w-28 rounded border p-1 text-right" placeholder="0.00"
              value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Shipping fee (₱)</span>
            <input inputMode="decimal" className="w-28 rounded border p-1 text-right" placeholder="0.00"
              value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span><span>{formatPeso(total)}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-semibold">Payment received now (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <input inputMode="decimal" className={input} placeholder="Amount (₱)" value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <select className={input} value={payment.method}
              onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <input className={input} placeholder="Reference no. (e.g. GCash ref)" value={payment.reference}
            onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
          <button className="text-xs underline"
            onClick={() => setPayment({ ...payment, amount: centavosToInput(Math.max(total, 0)) })}>
            Paid in full
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSave} disabled={saving || lines.length === 0}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50">
          {saving ? "Saving..." : `Create order · ${formatPeso(total)}`}
        </button>
      </div>
    </div>
  );
}