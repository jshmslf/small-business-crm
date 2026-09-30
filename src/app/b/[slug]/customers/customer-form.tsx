"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer, deleteCustomer, type CustomerInput } from "./actions";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "@/src/lib/customer-options";

const emptyCustomer: CustomerInput = {
  firstName: "", lastName: "", phone: "", email: "", facebookName: "",
  address: "", city: "", source: "FACEBOOK", status: "LEAD",
  lookingFor: "", notes: "", assignedToId: "",
};

export function CustomerForm({
  slug,
  members,
  customer,
  canEdit = true,
  canDelete = false,
}: {
  slug: string;
  members: { id: string; name: string }[];
  customer?: CustomerInput & { id: string };
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerInput>(customer ?? emptyCustomer);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const listUrl = `/b/${slug}/customers`;

  function update(field: keyof CustomerInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = customer
      ? await updateCustomer(slug, customer.id, form)
      : await createCustomer(slug, form);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  async function handleDelete() {
    if (!customer || !confirm(`Delete ${customer.firstName}? This can't be undone.`)) return;
    const result = await deleteCustomer(slug, customer.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  const input = "w-full rounded border p-2 disabled:bg-gray-50";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="max-w-2xl space-y-6">
      <fieldset disabled={!canEdit} className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>First name *</label>
            <input className={input} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input className={input} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} placeholder="09XX XXX XXXX" value={form.phone}
              onChange={(e) => update("phone", e.target.value)} />
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
            <label className={label}>Delivery address</label>
            <input className={input} value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div>
            <label className={label}>City / Municipality</label>
            <input className={input} value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={(e) => update("status", e.target.value)}>
              {CUSTOMER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Found us through</label>
            <select className={input} value={form.source} onChange={(e) => update("source", e.target.value)}>
              {CUSTOMER_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Handled by</label>
            <select className={input} value={form.assignedToId} onChange={(e) => update("assignedToId", e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <label className={label}>Looking for</label>
            <textarea className={input} rows={2} placeholder="Items they want that you don't have yet"
              value={form.lookingFor} onChange={(e) => update("lookingFor", e.target.value)} />
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={input} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </section>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Saving..." : customer ? "Save changes" : "Add customer"}
          </button>
        )}
        <button onClick={() => router.push(listUrl)} className="rounded border px-4 py-2">
          {canEdit ? "Cancel" : "Back"}
        </button>
        {canDelete && customer && (
          <button onClick={handleDelete} className="ml-auto rounded border px-4 py-2 text-red-600">
            Delete customer
          </button>
        )}
      </div>
    </div>
  );
}