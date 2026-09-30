"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSeller, updateSeller, deleteSeller, type SellerInput } from "./actions";

const emptySeller: SellerInput = { name: "", phone: "", email: "", facebookName: "", address: "", notes: "" };

export function SellerForm({
  slug,
  seller,
  itemCount = 0,
  canEdit = true,
  canDelete = false,
}: {
  slug: string;
  seller?: SellerInput & { id: string };
  itemCount?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SellerInput>(seller ?? emptySeller);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const listUrl = `/b/${slug}/sellers`;

  function update(field: keyof SellerInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = seller ? await updateSeller(slug, seller.id, form) : await createSeller(slug, form);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  async function handleDelete() {
    if (!seller) return;
    const warning = itemCount > 0
      ? `Delete ${seller.name}? Their ${itemCount} item(s) will be kept but no longer linked to a seller.`
      : `Delete ${seller.name}?`;
    if (!confirm(warning)) return;
    const result = await deleteSeller(slug, seller.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  const input = "w-full rounded border p-2 disabled:bg-gray-50";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="max-w-2xl space-y-6">
      <fieldset disabled={!canEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Name *</label>
          <input className={input} value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={input} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <label className={label}>Facebook name</label>
          <input className={input} value={form.facebookName} onChange={(e) => update("facebookName", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Email</label>
          <input className={input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Address</label>
          <input className={input} value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <textarea className={input} rows={3} placeholder="What they usually sell, reliability, pricing..."
            value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Saving..." : seller ? "Save changes" : "Add seller"}
          </button>
        )}
        <button onClick={() => router.push(listUrl)} className="rounded border px-4 py-2">
          {canEdit ? "Cancel" : "Back"}
        </button>
        {canDelete && seller && (
          <button onClick={handleDelete} className="ml-auto rounded border px-4 py-2 text-red-600">
            Delete seller
          </button>
        )}
      </div>
    </div>
  );
}