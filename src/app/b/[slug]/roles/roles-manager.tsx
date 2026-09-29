"use client";

import { useState } from "react";
import { createRole, updateRole, deleteRole } from "./actions";
import { PERMISSION_GROUPS, PERMISSION_LABELS, type Permission } from "@/src/lib/permissions";

export type RoleRow = {
  id: string;
  name: string;
  color: string | null;
  isOwnerRole: boolean;
  permissions: string[];
  memberCount: number;
  canManage: boolean;
};

export function RolesManager({ slug, roles, grantable }: { slug: string; roles: RoleRow[]; grantable: string[] }) {
  const [editing, setEditing] = useState<string | null>(null); // a role id, "new", or null
  const [error, setError] = useState("");

  async function handleDelete(role: RoleRow) {
    if (!confirm(`Delete the role "${role.name}"?`)) return;
    setError("");
    const result = await deleteRole(slug, role.id);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <RoleEditor slug={slug} grantable={grantable} onDone={() => setEditing(null)} />
      ) : (
        <button onClick={() => setEditing("new")} className="rounded bg-black px-4 py-2 text-white">
          + New role
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y rounded-lg border">
        {roles.map((role) =>
          editing === role.id ? (
            <div key={role.id} className="p-4">
              <RoleEditor slug={slug} role={role} grantable={grantable} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <div key={role.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color ?? "#9ca3af" }} />
                <div>
                  <p className="font-medium">
                    {role.name} {role.isOwnerRole && <span className="text-sm text-gray-400">🔒 all permissions</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {role.memberCount} member(s)
                    {!role.isOwnerRole && ` · ${role.permissions.length} permission(s)`}
                  </p>
                </div>
              </div>
              {role.canManage && (
                <div className="flex gap-2 text-sm">
                  <button onClick={() => setEditing(role.id)} className="rounded border px-3 py-1">Edit</button>
                  <button onClick={() => handleDelete(role)} className="rounded border px-3 py-1 text-red-600">
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        )}
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

  return (
    <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
      <div className="flex gap-3">
        <input className="flex-1 rounded border p-2" placeholder="Role name (e.g. Cashier)"
          value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" className="h-10 w-12 rounded border" value={color}
          onChange={(e) => setColor(e.target.value)} />
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-sm font-semibold">{group.label}</p>
          <div className="space-y-1">
            {group.permissions.map((permission) => {
              const allowed = grantable.includes(permission);
              return (
                <label key={permission}
                  className={`flex items-center gap-2 text-sm ${allowed ? "" : "text-gray-400"}`}>
                  <input type="checkbox" disabled={!allowed}
                    checked={permissions.includes(permission)} onChange={() => toggle(permission)} />
                  {PERMISSION_LABELS[permission as Permission]}
                  {!allowed && <span className="text-xs">(you don&apos;t have this)</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Saving..." : role ? "Save changes" : "Create role"}
        </button>
        <button onClick={onDone} className="rounded border px-4 py-2">Cancel</button>
      </div>
    </div>
  );
}