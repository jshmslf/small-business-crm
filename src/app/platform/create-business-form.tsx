"use client";

import { useState } from "react";
import { createBusinessWithOwner } from "./actions";

const empty = { businessName: "", slug: "", ownerName: "", ownerEmail: "", tempPassword: "" };

function toSlug(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CreateBusinessForm() {
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof empty, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      // auto-fill slug from business name
      ...(field === "businessName" ? { slug: toSlug(value) } : {}),
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);
    const result = await createBusinessWithOwner(form);
    setLoading(false);
    if (result.ok) {
      setMessage({ type: "success", text: `Created ${form.businessName}. Send the owner their temporary password securely.` });
      setForm(empty);
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const input = "w-full rounded border p-2";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">New business</h2>
      <input className={input} placeholder="Business name" value={form.businessName}
        onChange={(e) => update("businessName", e.target.value)} />
      <input className={input} placeholder="slug (e.g. juans-shop)" value={form.slug}
        onChange={(e) => update("slug", e.target.value)} />
      <h3 className="pt-2 font-medium">Owner account</h3>
      <input className={input} placeholder="Owner name" value={form.ownerName}
        onChange={(e) => update("ownerName", e.target.value)} />
      <input className={input} placeholder="Owner email" type="email" value={form.ownerEmail}
        onChange={(e) => update("ownerEmail", e.target.value)} />
      <input className={input} placeholder="Temporary password (min 8)" type="text" value={form.tempPassword}
        onChange={(e) => update("tempPassword", e.target.value)} />
      {message && (
        <p className={message.type === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
          {message.text}
        </p>
      )}
      <button onClick={handleSubmit} disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {loading ? "Creating..." : "Create business and owner"}
      </button>
    </div>
  );
}