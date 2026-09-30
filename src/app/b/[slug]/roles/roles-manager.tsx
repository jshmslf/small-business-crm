"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { createRole, updateRole, deleteRole } from "./actions";
import { PERMISSION_GROUPS, PERMISSION_LABELS, type Permission } from "@/src/lib/permissions";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { PageHeader } from "@/src/components/page-header";
import { Meta, TableCard } from "@/src/components/data-table";
import { Field, FormActions, Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { IconButton } from "@/src/components/icon-button";

export type RoleRow = {
  id: string;
  name: string;
  color: string | null;
  isOwnerRole: boolean;
  permissions: string[];
  memberCount: number;
  canManage: boolean;
};

export function RolesManager({ slug, roles, grantable, description }: {
  slug: string; roles: RoleRow[]; grantable: string[]; description?: React.ReactNode;
}) {
  const [editing, setEditing] = useState<string | null>(null); // a role id, "new", or null
  const [error, setError] = useState("");

  async function handleDelete(role: RoleRow) {
    setError("");
    const result = await deleteRole(slug, role.id);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Roles"
        description={description}
        actions={
          editing !== "new" && (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden />
              New role
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {editing === "new" && (
          <RoleEditor slug={slug} grantable={grantable} onDone={() => setEditing(null)} />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <TableCard>
          <ul className="divide-y divide-gray-200">
            {roles.map((role) =>
              editing === role.id ? (
                <li key={role.id} className="bg-gray-50 p-4 sm:p-5">
                  <RoleEditor slug={slug} role={role} grantable={grantable} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li key={role.id} className="flex min-h-[72px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color ?? "#9ca3af" }} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 font-medium text-gray-900">
                        {role.name}
                        {role.isOwnerRole && (
                          <span className="inline-flex items-center gap-1 text-sm font-normal text-gray-500">
                            <Lock className="size-3.5" aria-hidden />
                            all permissions
                          </span>
                        )}
                      </p>
                      <Meta className="text-sm text-gray-500" items={[
                        `${role.memberCount} member(s)`,
                        !role.isOwnerRole && `${role.permissions.length} permission(s)`,
                      ]} />
                    </div>
                  </div>
                  {role.canManage && (
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Edit" onClick={() => setEditing(role.id)}>
                        <Pencil />
                      </IconButton>
                      <ConfirmDialog
                        trigger={
                          <IconButton label="Delete" className="hover:text-error-700">
                            <Trash2 />
                          </IconButton>
                        }
                        title="Delete role?"
                        description={`Delete the role "${role.name}"?`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => handleDelete(role)}
                      />
                    </div>
                  )}
                </li>
              )
            )}
          </ul>
        </TableCard>
      </div>
    </div>
  );
}

function RoleEditor({
  slug,
  role,
  grantable,
  onDone,
}: {
  slug: string;
  role?: RoleRow;
  grantable: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [color, setColor] = useState(role?.color ?? "#6b7280");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(permission: string) {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const input = { name, color, permissions };
    const result = role ? await updateRole(slug, role.id, input) : await createRole(slug, input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  const idPrefix = role?.id ?? "new";

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-3">
          <Field label="Role name" htmlFor={`${idPrefix}-name`} className="flex-1">
            <Input id={`${idPrefix}-name`} placeholder="Role name (e.g. Cashier)"
              value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Color" htmlFor={`${idPrefix}-color`}>
            <input id={`${idPrefix}-color`} type="color"
              className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 shadow-xs outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100"
              value={color} onChange={(e) => setColor(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-gray-700">Permissions</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-900">{group.label}</p>
                <div className="space-y-2.5">
                  {group.permissions.map((permission) => {
                    const allowed = grantable.includes(permission);
                    const id = `${idPrefix}-perm-${permission}`;
                    return (
                      <div key={permission} className="flex items-start gap-2.5">
                        <Checkbox id={id} disabled={!allowed} className="mt-0.5"
                          checked={permissions.includes(permission)} onCheckedChange={() => toggle(permission)} />
                        <Label htmlFor={id} className={cn("font-normal", allowed ? "text-gray-700" : "text-gray-400")}>
                          <span>
                            {PERMISSION_LABELS[permission as Permission]}
                            {!allowed && <span className="ml-1 text-xs">(you don&apos;t have this)</span>}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
      </CardContent>

      <CardFooter className="border-t border-gray-200">
        <FormActions>
          <Button variant="secondary" onClick={onDone}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : role ? "Save changes" : "Create role"}
          </Button>
        </FormActions>
      </CardFooter>
    </Card>
  );
}
