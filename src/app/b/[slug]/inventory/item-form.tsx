"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/src/lib/item-options";
import { formatPeso, parsePeso } from "@/src/lib/money";
import { createItem, updateItem, deleteItem, type ItemInput } from "./actions";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Textarea } from "@/src/components/ui/textarea";
import { Field, FormActions, FormSection, Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { uploadOne } from "./upload-photo";

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

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

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

    if (item) {
      const result = await updateItem(slug, item.id, form);
      setSaving(false);
      if (!result.ok) return setError(result.error);
      return router.push(listUrl);
    }

    const result = await createItem(slug, form);
    if (!result.ok || !result.id) {
      setSaving(false);
      return setError(result.ok ? "Could not save the item." : result.error);
    }

    let failed = false;
    for (const p of photos) {
      try { await uploadOne(slug, result.id, p.file); }
      catch { failed = true; break };
    }

    router.push(`${listUrl}/${result.id}${failed ? "?photos=failed" : ""}`)
  }

  async function handleDelete() {
    if (!item) return;
    const result = await deleteItem(slug, item.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <fieldset disabled={!canEdit} className="space-y-6">
          <FormSection title="Details">
            <Field label="Item name" htmlFor="name" required className="sm:col-span-2">
              <Input id="name" placeholder="e.g. iPhone 13 128GB Blue" value={form.name}
                onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" list="categories" placeholder="e.g. Phones" value={form.category}
                onChange={(e) => update("category", e.target.value)} />
              <datalist id="categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="SKU / Code" htmlFor="sku">
              <Input id="sku" placeholder="Optional" value={form.sku}
                onChange={(e) => update("sku", e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" rows={3} placeholder="Specs, inclusions, flaws..."
                value={form.description} onChange={(e) => update("description", e.target.value)} />
            </Field>
          </FormSection>

          <FormSection title="Condition and stock" columns={3}>
            <Field label="Condition" htmlFor="condition">
              <NativeSelect id="condition" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
                {ITEM_CONDITIONS.map((c) => <NativeSelectOption key={c.value} value={c.value}>{c.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Status" htmlFor="status">
              <NativeSelect id="status" value={form.status} onChange={(e) => update("status", e.target.value)}>
                {ITEM_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Quantity" htmlFor="quantity">
              <Input id="quantity" inputMode="numeric" value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)} />
            </Field>
          </FormSection>

          <FormSection title="Pricing">
            <Field label="Selling price (₱)" htmlFor="sellingPrice" required>
              <Input id="sellingPrice" inputMode="decimal" placeholder="0.00" value={form.sellingPrice}
                onChange={(e) => update("sellingPrice", e.target.value)} />
            </Field>
            {canViewCost && (
              <Field label="Buying price (₱)" htmlFor="costPrice">
                <Input id="costPrice" inputMode="decimal" placeholder="0.00" value={form.costPrice}
                  onChange={(e) => update("costPrice", e.target.value)} />
              </Field>
            )}
            {canViewCost && profit !== null && (
              <p className={`text-sm font-medium tabular-nums sm:col-span-2 ${profit >= 0 ? "text-success-700" : "text-error-700"}`}>
                Profit per unit: {formatPeso(profit)}{margin !== null && ` (${margin}% margin)`}
              </p>
            )}
          </FormSection>

          <FormSection title="Source">
            <Field label="Seller" htmlFor="sellerId">
              <NativeSelect id="sellerId" value={form.sellerId} onChange={(e) => update("sellerId", e.target.value)}>
                <NativeSelectOption value="">No seller / unknown</NativeSelectOption>
                {sellers.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Date acquired" htmlFor="acquiredAt">
              <Input id="acquiredAt" type="date" value={form.acquiredAt}
                onChange={(e) => update("acquiredAt", e.target.value)} />
            </Field>
          </FormSection>
        </fieldset>

        {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      </CardContent>

      <CardFooter className="border-t border-gray-200">
        <FormActions
          destructive={
            canDelete && item && (
              <ConfirmDialog
                trigger={<Button variant="destructive">Delete item</Button>}
                title="Delete item?"
                description={`Delete "${item.name}"? This can't be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
              />
            )
          }
        >
          <Button variant="secondary" onClick={() => router.push(listUrl)}>
            {canEdit ? "Cancel" : "Back"}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : item ? "Save changes" : "Add item"}
            </Button>
          )}
        </FormActions>
      </CardFooter>
    </Card>
  );
}
