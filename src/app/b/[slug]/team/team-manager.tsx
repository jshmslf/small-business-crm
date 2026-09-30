"use client";

import { useState } from "react";
import { createMember, updateMemberRoles, setMemberActive, resetMemberPassword } from "./actions";

type RoleChip = { id: string; name: string; color: string | null };
type Member = {
  id: string; name: string; email: string; isActive: boolean; pendingPassword: boolean;
  isYou: boolean; roles: RoleChip[]; canManage: boolean;
};

// Readable random password (no 0/O or 1/l/I to avoid confusion)
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

function Chip({ role }: { role: RoleChip }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color ?? "#9ca3af" }} />
      {role.name}
    </span>
  );
}

function RoleCheckboxes({ roles, selected, onChange }: {
  roles: RoleChip[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  if (roles.length === 0) {
    return <p className="text-sm text-gray-500">No roles you can assign yet. Create one on the Roles page first.</p>;
  }
  return (
    <div className="flex flex-wrap gap-3">
      {roles.map((role) => (
        <label key={role.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(role.id)}
            onChange={() => onChange(selected.includes(role.id)
              ? selected.filter((id) => id !== role.id)
              : [...selected, role.id])} />
          <Chip role={role} />
        </label>
      ))}
    </div>
  );
}

export function TeamManager({ slug, members, assignableRoles, canCreate, canEditRoles, canDeactivate }: {
  slug: string; members: Member[]; assignableRoles: RoleChip[];
  canCreate: boolean; canEditRoles: boolean; canDeactivate: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(memberId: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError("");
    setNotice("");
    setBusyId(memberId);
    const result = await action();
    setBusyId(null);
    if (!result.ok) setError(result.error);
    return result.ok;
  }

  async function handleReset(member: Member) {
    const password = prompt(
      `New temporary password for ${member.name} (they'll be asked to change it on next login):`,
      generatePassword()
    );
    if (!password) return;
    const ok = await run(member.id, () => resetMemberPassword(slug, member.id, password));
    if (ok) setNotice(`Password reset. Send ${member.name} their temporary password: ${password}`);
  }

  async function handleToggleActive(member: Member) {
    const message = member.isActive
      ? `Deactivate ${member.name}? They'll lose access immediately. Their orders and history are kept.`
      : `Reactivate ${member.name}?`;
    if (!confirm(message)) return;
    await run(member.id, () => setMemberActive(slug, member.id, !member.isActive));
  }

  return (
    <div className="space-y-4">
      {canCreate && (adding ? (
        <AddMemberForm slug={slug} roles={assignableRoles}
          onDone={(msg) => { setAdding(false); if (msg) setNotice(msg); }} />
      ) : (
        <button onClick={() => setAdding(true)} className="rounded bg-black px-4 py-2 text-white">
          + Add staff account
        </button>
      ))}

      {notice && <p className="rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y rounded-lg border">
        {members.map((member) => (
          <div key={member.id} className={`space-y-3 p-4 ${!member.isActive ? "bg-gray-50" : ""} ${busyId === member.id ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {member.name}
                  {member.isYou && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                  {!member.isActive && <span className="ml-2 text-xs text-red-600">Deactivated</span>}
                  {member.pendingPassword && member.isActive && (
                    <span className="ml-2 text-xs text-orange-600">Hasn&apos;t set a password yet</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{member.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {member.roles.map((role) => <Chip key={role.id} role={role} />)}
                </div>
              </div>

              {member.canManage && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {canEditRoles && member.isActive && (
                    <button onClick={() => setEditingId(editingId === member.id ? null : member.id)}
                      className="rounded border px-3 py-1">Edit roles</button>
                  )}
                  {canCreate && member.isActive && (
                    <button onClick={() => handleReset(member)} disabled={!!busyId}
                      className="rounded border px-3 py-1">Reset password</button>
                  )}
                  {canDeactivate && (
                    <button onClick={() => handleToggleActive(member)} disabled={!!busyId}
                      className={`rounded border px-3 py-1 ${member.isActive ? "text-red-600" : ""}`}>
                      {member.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {editingId === member.id && (
              <EditRoles
                member={member}
                roles={assignableRoles}
                onSave={async (ids) => {
                  const ok = await run(member.id, () => updateMemberRoles(slug, member.id, ids));
                  if (ok) setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditRoles({ member, roles, onSave, onCancel }: {
  member: Member; roles: RoleChip[]; onSave: (ids: string[]) => void; onCancel: () => void;
}) {
  const assignableIds = new Set(roles.map((r) => r.id));
  const locked = member.roles.filter((r) => !assignableIds.has(r.id));
  const [selected, setSelected] = useState(member.roles.filter((r) => assignableIds.has(r.id)).map((r) => r.id));

  return (
    <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
      <RoleCheckboxes roles={roles} selected={selected} onChange={setSelected} />
      {locked.length > 0 && (
        <p className="text-xs text-gray-500">
          Kept (you can&apos;t change these): {locked.map((r) => r.name).join(", ")}
        </p>
      )}
      <div className="flex gap-2 text-sm">
        <button onClick={() => onSave(selected)} className="rounded bg-black px-3 py-1 text-white">Save roles</button>
        <button onClick={onCancel} className="rounded border px-3 py-1">Cancel</button>
      </div>
    </div>
  );
}

function AddMemberForm({ slug, roles, onDone }: {
  slug: string; roles: RoleChip[]; onDone: (message?: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", tempPassword: generatePassword() });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = await createMember(slug, { ...form, roleIds });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    onDone(`Account created. Send ${form.name} their login: ${form.email} / temporary password ${form.tempPassword}`);
  }

  const input = "w-full rounded border p-2";

  return (
    <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
      <h2 className="font-semibold">New staff account</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Full name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input} placeholder="Email" type="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <input className={`${input} font-mono`} value={form.tempPassword}
          onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
        <button onClick={() => setForm({ ...form, tempPassword: generatePassword() })}
          className="shrink-0 rounded border px-3 text-sm">Generate</button>
      </div>
      <p className="text-xs text-gray-500">They&apos;ll be asked to set their own password on first login.</p>
      <div>
        <p className="mb-2 text-sm font-medium">Roles</p>
        <RoleCheckboxes roles={roles} selected={roleIds} onChange={setRoleIds} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Creating..." : "Create account"}
        </button>
        <button onClick={() => onDone()} className="rounded border px-4 py-2">Cancel</button>
      </div>
    </div>
  );
}