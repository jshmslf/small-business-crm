"use client";

import { useEffect, useRef, useState } from "react";
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
import { checkPhoto, MAX_PHOTOS, uploadOne } from "./upload-photo";
import { ImagePlus, Star, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { IconButton } from "@/src/components/icon-button";
import { Badge } from "@/src/components/status-badge";

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
  canAddPhotos = false,
  existingPhotoCount = 0,
}: {
  slug: string;
  sellers: { id: string; name: string }[];
  categories: string[];
  item?: ItemInput & { id: string };
  canEdit?: boolean;
  canDelete?: boolean;
  canAddPhotos?: boolean;
  existingPhotoCount?: number;
  canViewCost?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ItemInput>(item ?? emptyItem);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const listUrl = `/b/${slug}/inventory`;
  const [progress, setProgress] = useState("");

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  function update(field: keyof ItemInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePick(files: FileList | null) {
    if (!files?.length) return;
    setError("");

    const picked: { file: File; preview: string }[] = [];
    for (const file of Array.from(files)) {
      const problem = checkPhoto(file);
      if (problem) { setError(problem); continue; }
      if (existingPhotoCount + photos.length + picked.length >= MAX_PHOTOS) {
        setError(`Items can have up to ${MAX_PHOTOS} photos.`);
        break;
      }
      picked.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos((prev) => [...prev, ...picked]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Move a staged photo to the front; it uploads first, so it becomes the cover
  function makeStagedCover(index: number) {
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  function handleCancel() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setForm(item ?? emptyItem);
    setError("");
    router.push(listUrl);
  }

  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  const initial = item ?? emptyItem;
  const isDirty =
    photos.length > 0 ||
    (Object.keys(emptyItem) as (keyof ItemInput)[]).some((key) => form[key] !== initial[key]);

  useEffect(() => {
    if (!isDirty) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // Live profit preview
  const cost = parsePeso(form.costPrice);
  const selling = parsePeso(form.sellingPrice);
  const profit =
    cost.ok && selling.ok && cost.value !== null && selling.value !== null ? selling.value - cost.value : null;
  const margin = profit !== null && selling.ok && selling.value ? Math.round((profit / selling.value) * 100) : null;

  // Uploads the staged photos in order. Returns true if any failed.
  async function uploadStaged(itemId: string) {
    for (const [i, p] of photos.entries()) {
      setProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
      try { await uploadOne(slug, itemId, p.file); }
      catch { return true; }
    }
    return false;
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    if (item) {
      const result = await updateItem(slug, item.id, form);
      if (!result.ok) {
        setSaving(false);
        return setError(result.error);
      }

      const failed = await uploadStaged(item.id);
      if (failed) {
        // We stay on this same page, so the form is not remounted: reset it ourselves
        photos.forEach((p) => URL.revokeObjectURL(p.preview));
        setPhotos([]);
        setSaving(false);
        setProgress("");
        return router.push(`${listUrl}/${item.id}?photos=failed`);
      }
      return router.push(listUrl);
    }

    const result = await createItem(slug, form);
    if (!result.ok || !result.id) {
      setSaving(false);
      return setError(result.ok ? "Could not save the item." : result.error);
    }

    const failed = await uploadStaged(result.id);
    router.push(`${listUrl}/${result.id}${failed ? "?photos=failed" : ""}`);
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
        <fieldset disabled={!canEdit || saving} className="space-y-6">
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

          {canAddPhotos && (
            <FormSection
              title={item ? "New photos" : "Photos"}
              description={item ? "These upload when you save changes." : "Optional. The first photo becomes the cover."}
              columns={1}
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {photos.map((p, index) => (
                  <div key={p.preview} className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
                    {index === 0 && existingPhotoCount === 0 && <Badge tone="brand" className="absolute top-2 left-2 shadow-xs">Cover</Badge>}
                    <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                      {index !== 0 && existingPhotoCount === 0 && (
                        <IconButton label="Make cover" size="icon-xs" variant="secondary"
                          onClick={() => makeStagedCover(index)}>
                          <Star />
                        </IconButton>
                      )}
                      <IconButton label="Remove" size="icon-xs" variant="secondary"
                        onClick={() => removePhoto(index)}>
                        <X />
                      </IconButton>
                    </div>
                  </div>
                ))}

                {existingPhotoCount + photos.length < MAX_PHOTOS && (
                  <label
                    className={cn(
                      "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-25 text-sm text-gray-500 hover:bg-gray-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
                      dragging && "border-brand-300 bg-brand-25 text-brand-700"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      if (!saving) handlePick(e.dataTransfer.files);
                    }}
                  >
                    <ImagePlus aria-hidden className="pointer-events-none" />
                    {dragging ? "Drop to add" : "Add photos"}
                    <input type="file" accept="image/*" multiple className="sr-only"
                      onChange={(e) => { handlePick(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </FormSection>
          )}
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
          {isDirty ? (
            <ConfirmDialog
              trigger={<Button variant="secondary">Cancel</Button>}
              title="Discard changes?"
              description="You have unsaved changes. If you leave now, they'll be lost."
              confirmLabel="Discard"
              cancelLabel="Keep editing"
              destructive
              onConfirm={handleCancel}
            />
          ) : (
            <Button variant="secondary" onClick={handleCancel}>
              {canEdit ? "Cancel" : "Back"}
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (progress || "Saving...") : item ? "Save changes" : "Add item"}
            </Button>
          )}
        </FormActions>
      </CardFooter>
    </Card>
  );
}
