"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer, deleteCustomer, type CustomerInput } from "./actions";
import { CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "@/src/lib/customer-options";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/src/components/ui/native-select";
import { Textarea } from "@/src/components/ui/textarea";
import { Field, FormActions, FormSection, Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { CancelButton } from "@/src/components/cancel-button";
import { hasChanges, useWarnOnLeave } from "@/src/lib/unsaved-changes";

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

  const isDirty = hasChanges(form, customer ?? emptyCustomer);
  useWarnOnLeave(isDirty);

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
    if (!customer) return;
    const result = await deleteCustomer(slug, customer.id);
    if (!result.ok) return setError(result.error);
    router.push(listUrl);
  }

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <fieldset disabled={!canEdit} className="space-y-6">
          <FormSection title="Contact details">
            <Field label="First name" htmlFor="firstName" required>
              <Input id="firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
            </Field>
            <Field label="Last name" htmlFor="lastName">
              <Input id="lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" placeholder="09XX XXX XXXX" value={form.phone}
                onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Facebook name" htmlFor="facebookName">
              <Input id="facebookName" value={form.facebookName} onChange={(e) => update("facebookName", e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" className="sm:col-span-2">
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Delivery address" htmlFor="address" className="sm:col-span-2">
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </Field>
            <Field label="City / Municipality" htmlFor="city">
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
          </FormSection>

          <FormSection title="Status and assignment" columns={3}>
            <Field label="Status" htmlFor="status">
              <NativeSelect id="status" value={form.status} onChange={(e) => update("status", e.target.value)}>
                {CUSTOMER_STATUSES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Found us through" htmlFor="source">
              <NativeSelect id="source" value={form.source} onChange={(e) => update("source", e.target.value)}>
                {CUSTOMER_SOURCES.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Handled by" htmlFor="assignedToId">
              <NativeSelect id="assignedToId" value={form.assignedToId} onChange={(e) => update("assignedToId", e.target.value)}>
                <NativeSelectOption value="">Unassigned</NativeSelectOption>
                {members.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </FormSection>

          <FormSection title="Notes" columns={1}>
            <Field label="Looking for" htmlFor="lookingFor">
              <Textarea id="lookingFor" rows={2} placeholder="Items they want that you don't have yet"
                value={form.lookingFor} onChange={(e) => update("lookingFor", e.target.value)} />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </Field>
          </FormSection>
        </fieldset>

        {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      </CardContent>

      <CardFooter className="border-t border-gray-200">
        <FormActions
          destructive={
            canDelete && customer && (
              <ConfirmDialog
                trigger={<Button variant="destructive">Delete customer</Button>}
                title="Delete customer?"
                description={`Delete ${customer.firstName}? This can't be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
              />
            )
          }
        >
          <CancelButton dirty={isDirty} onCancel={() => router.push(listUrl)}>
            {canEdit ? "Cancel" : "Back"}
          </CancelButton>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : customer ? "Save changes" : "Add customer"}
            </Button>
          )}
        </FormActions>
      </CardFooter>
    </Card>
  );
}
