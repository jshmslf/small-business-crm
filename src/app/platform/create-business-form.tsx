"use client";

import { useState } from "react";
import { createBusinessWithOwner } from "./actions";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Field, FormActions, FormSection, Notice } from "@/src/components/form-field";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>New business</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormSection title="Business">
          <Field label="Business name" htmlFor="businessName">
            <Input id="businessName" placeholder="Business name" value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)} />
          </Field>
          <Field label="Slug" htmlFor="slug" hint="Used in the web address, e.g. /b/juans-shop">
            <Input id="slug" placeholder="slug (e.g. juans-shop)" value={form.slug}
              onChange={(e) => update("slug", e.target.value)} />
          </Field>
        </FormSection>
        <FormSection title="Owner account">
          <Field label="Owner name" htmlFor="ownerName">
            <Input id="ownerName" placeholder="Owner name" value={form.ownerName}
              onChange={(e) => update("ownerName", e.target.value)} />
          </Field>
          <Field label="Owner email" htmlFor="ownerEmail">
            <Input id="ownerEmail" placeholder="Owner email" type="email" value={form.ownerEmail}
              onChange={(e) => update("ownerEmail", e.target.value)} />
          </Field>
          <Field label="Temporary password" htmlFor="tempPassword" className="sm:col-span-2">
            <Input id="tempPassword" placeholder="Temporary password (min 8)" type="text" value={form.tempPassword}
              onChange={(e) => update("tempPassword", e.target.value)} />
          </Field>
        </FormSection>
        {message && <Notice tone={message.type}>{message.text}</Notice>}
      </CardContent>
      <CardFooter className="border-t border-gray-200">
        <FormActions>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create business and owner"}
          </Button>
        </FormActions>
      </CardFooter>
    </Card>
  );
}
