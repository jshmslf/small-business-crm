"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSeller, updateSeller, deleteSeller, type SellerInput } from "./actions";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Field, FormActions, FormSection, Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";

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

  const deleteWarning = seller
    ? itemCount > 0
      ? `Delete ${seller.name}? Their ${itemCount} item(s) will be kept but no longer linked to a seller.`
      : `Delete ${seller.name}?`
    : "";

  async function handleDelete() {
    if (!seller) return;
    const result = await deleteSeller(slug, seller.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <fieldset disabled={!canEdit}>
          <FormSection>
            <Field label="Name" htmlFor="name" required className="sm:col-span-2">
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Facebook name" htmlFor="facebookName">
              <Input id="facebookName" value={form.facebookName} onChange={(e) => update("facebookName", e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" className="sm:col-span-2">
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Address" htmlFor="address" className="sm:col-span-2">
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" rows={3} placeholder="What they usually sell, reliability, pricing..."
                value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </Field>
          </FormSection>
        </fieldset>

        {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      </CardContent>

      <CardFooter className="border-t border-gray-200">
        <FormActions
          destructive={
            canDelete && seller && (
              <ConfirmDialog
                trigger={<Button variant="destructive">Delete seller</Button>}
                title="Delete seller?"
                description={deleteWarning}
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
              {saving ? "Saving..." : seller ? "Save changes" : "Add seller"}
            </Button>
          )}
        </FormActions>
      </CardFooter>
    </Card>
  );
}
