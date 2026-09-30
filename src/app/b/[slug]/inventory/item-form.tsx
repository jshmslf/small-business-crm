"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/src/lib/item-options";
import { formatPeso, parsePeso } from "@/src/lib/money";
import { createItem, updateItem, deleteItem, type ItemInput } from "./actions";

const emptyItem: ItemInput = {
  name: "", description: "", category: "", sku: "", condition: "GOOD", status: "AVAILABLE",
  quantity: "1", costPrice: "", sellingPrice: "", sellerId: "", acquiredAt: "",
};

export function ItemForm({
  slug,
  sellers,
  categories,
  item,
  canEdit = true,
  canDelete = false,
  canViewCost = false,
}: {
  slug: string;
  sellers: { id: string; name: string }[];
  categories: string[];
  item?: ItemInput & { id: string };
  canEdit?: boolean;
  canDelete?: boolean;
  canViewCost?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ItemInput>(item ?? emptyItem);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const listUrl = `/b/${slug}/inventory`;

  function update(field: keyof ItemInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Live profit preview
  const cost = parsePeso(form.costPrice);
  const selling = parsePeso(form.sellingPrice);
  const profit =
    cost.ok && selling.ok && cost.value !== null && selling.value !== null ? selling.value - cost.value : null;
  const margin = profit !== null && selling.ok && selling.value ? Math.round((profit / selling.value) * 100) : null;

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = item ? await updateItem(slug, item.id, form) : await createItem(slug, form);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.push(!item && result.id ? `${listUrl}/${result.id}` : listUrl);
  }

  async function handleDelete() {
    if (!item || !confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    const result = await deleteItem(slug, item.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  const input = "w-full rounded border p-2 disabled:bg-gray-50";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="max-w-2xl space-y-6">
      <fieldset disabled={!canEdit} className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Item name *</label>
            <input className={input} placeholder="e.g. iPhone 13 128GB Blue" value={form.name}
              onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Category</label>
            <input className={input} list="categories" placeholder="e.g. Phones" value={form.category}
              onChange={(e) => update("category", e.target.value)} />
            <datalist id="categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className={label}>SKU / Code</label>
            <input className={input} placeholder="Optional" value={form.sku}
              onChange={(e) => update("sku", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Description</label>
            <textarea className={input} rows={3} placeholder="Specs, inclusions, flaws..."
              value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Condition</label>
            <select className={input} value={form.condition} onChange={(e) => update("condition", e.target.value)}>
              {ITEM_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={(e) => update("status", e.target.value)}>
              {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Quantity</label>
            <input className={input} inputMode="numeric" value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Selling price (₱) *</label>
            <input className={input} inputMode="decimal" placeholder="0.00" value={form.sellingPrice}
              onChange={(e) => update("sellingPrice", e.target.value)} />
          </div>
          {canViewCost && (
            <div>
              <label className={label}>Buying price (₱)</label>
              <input className={input} inputMode="decimal" placeholder="0.00" value={form.costPrice}
                onChange={(e) => update("costPrice", e.target.value)} />
            </div>
          )}
          {canViewCost && profit !== null && (
            <p className={`text-sm sm:col-span-2 ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
              Profit per unit: {formatPeso(profit)}{margin !== null && ` (${margin}% margin)`}
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Seller</label>
            <select className={input} value={form.sellerId} onChange={(e) => update("sellerId", e.target.value)}>
              <option value="">No seller / unknown</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Date acquired</label>
            <input className={input} type="date" value={form.acquiredAt}
              onChange={(e) => update("acquiredAt", e.target.value)} />
          </div>
        </section>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Saving..." : item ? "Save changes" : "Add item"}
          </button>
        )}
        <button onClick={() => router.push(listUrl)} className="rounded border px-4 py-2">
          {canEdit ? "Cancel" : "Back"}
        </button>
        {canDelete && item && (
          <button onClick={handleDelete} className="ml-auto rounded border px-4 py-2 text-red-600">
            Delete item
          </button>
        )}
      </div>
    </div>
  );
}