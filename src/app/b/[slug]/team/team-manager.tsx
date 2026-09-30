"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createMember, updateMemberRoles, setMemberActive, resetMemberPassword } from "./actions";
import { cn } from "@/src/lib/utils";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/status-badge";
import { TableCard, initials } from "@/src/components/data-table";
import { Field, FormActions, FormSection, Notice } from "@/src/components/form-field";
import { ConfirmDialog } from "@/src/components/confirm-dialog";

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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
      <span className="size-2 rounded-full" style={{ backgroundColor: role.color ?? "#9ca3af" }} />
      {role.name}
    </span>
  );
}

function RoleCheckboxes({ roles, selected, onChange, idPrefix }: {
  roles: RoleChip[]; selected: string[]; onChange: (ids: string[]) => void; idPrefix: string;
}) {
  if (roles.length === 0) {
    return <p className="text-sm text-gray-500">No roles you can assign yet. Create one on the Roles page first.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const checked = selected.includes(role.id);
        return (
          <label key={role.id} htmlFor={`${idPrefix}-${role.id}`}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border bg-white py-2 pr-3 pl-2.5 text-sm transition-colors",
              checked ? "border-brand-300 bg-brand-25" : "border-gray-200 hover:bg-gray-50"
            )}>
            <Checkbox id={`${idPrefix}-${role.id}`} checked={checked}
              onCheckedChange={() => onChange(checked
                ? selected.filter((id) => id !== role.id)
                : [...selected, role.id])} />
            <Chip role={role} />
          </label>
        );
      })}
    </div>
  );
}

export function TeamManager({ slug, members, assignableRoles, canCreate, canEditRoles, canDeactivate, description }: {
  slug: string; members: Member[]; assignableRoles: RoleChip[];
  canCreate: boolean; canEditRoles: boolean; canDeactivate: boolean; description?: React.ReactNode;
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

  async function handleReset(member: Member, password: string) {
    if (!password) return;
    const ok = await run(member.id, () => resetMemberPassword(slug, member.id, password));
    if (ok) setNotice(`Password reset. Send ${member.name} their temporary password: ${password}`);
  }

  function toggleActiveMessage(member: Member) {
    return member.isActive
      ? `Deactivate ${member.name}? They'll lose access immediately. Their orders and history are kept.`
      : `Reactivate ${member.name}?`;
  }

  async function handleToggleActive(member: Member) {
    await run(member.id, () => setMemberActive(slug, member.id, !member.isActive));
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Team"
        description={description}
        actions={
          canCreate && !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              Add staff account
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {canCreate && adding && (
          <AddMemberForm slug={slug} roles={assignableRoles}
            onDone={(msg) => { setAdding(false); if (msg) setNotice(msg); }} />
        )}

        {notice && <Notice tone="success">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <TableCard>
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li key={member.id}
                className={cn(
                  "space-y-4 px-5 py-4 sm:px-6",
                  !member.isActive && "bg-gray-50",
                  busyId === member.id && "opacity-50"
                )}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-gray-900">
                        {member.name}
                        {member.isYou && <span className="text-sm font-normal text-gray-500">(you)</span>}
                        {!member.isActive && <Badge tone="error">Deactivated</Badge>}
                        {member.pendingPassword && member.isActive && (
                          <Badge tone="warning">Hasn&apos;t set a password yet</Badge>
                        )}
                      </p>
                      <p className="truncate text-sm text-gray-500">{member.email}</p>
                      {member.roles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {member.roles.map((role) => <Chip key={role.id} role={role} />)}
                        </div>
                      )}
                    </div>
                  </div>

                  {member.canManage && (
                    <div className="flex flex-wrap gap-2">
                      {canEditRoles && member.isActive && (
                        <Button variant="secondary" size="sm"
                          onClick={() => setEditingId(editingId === member.id ? null : member.id)}>
                          Edit roles
                        </Button>
                      )}
                      {canCreate && member.isActive && (
                        <ResetPasswordDialog member={member} disabled={!!busyId}
                          onReset={(password) => handleReset(member, password)} />
                      )}
                      {canDeactivate && (
                        <ConfirmDialog
                          trigger={
                            <Button variant={member.isActive ? "destructive" : "secondary"} size="sm" disabled={!!busyId}>
                              {member.isActive ? "Deactivate" : "Reactivate"}
                            </Button>
                          }
                          title={member.isActive ? "Deactivate member?" : "Reactivate member?"}
                          description={toggleActiveMessage(member)}
                          confirmLabel={member.isActive ? "Deactivate" : "Reactivate"}
                          destructive={member.isActive}
                          onConfirm={() => handleToggleActive(member)}
                        />
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
              </li>
            ))}
          </ul>
        </TableCard>
      </div>
    </div>
  );
}

function ResetPasswordDialog({ member, disabled, onReset }: {
  member: Member; disabled: boolean; onReset: (password: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const inputId = `reset-${member.id}`;

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (next) setPassword(generatePassword());
    setOpen(next);
  }

  async function handleConfirm() {
    setPending(true);
    try {
      await onReset(password);
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled}>Reset password</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            New temporary password for {member.name} (they&apos;ll be asked to change it on next login):
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input id={inputId} aria-label="Temporary password" className="font-mono" value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <Button variant="secondary" onClick={() => setPassword(generatePassword())}>Generate</Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!password || pending}>Reset password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoles({ member, roles, onSave, onCancel }: {
  member: Member; roles: RoleChip[]; onSave: (ids: string[]) => void; onCancel: () => void;
}) {
  const assignableIds = new Set(roles.map((r) => r.id));
  const locked = member.roles.filter((r) => !assignableIds.has(r.id));
  const [selected, setSelected] = useState(member.roles.filter((r) => assignableIds.has(r.id)).map((r) => r.id));

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:ml-[52px]">
      <RoleCheckboxes roles={roles} selected={selected} onChange={setSelected} idPrefix={`edit-${member.id}`} />
      {locked.length > 0 && (
        <p className="text-sm text-gray-500">
          Kept (you can&apos;t change these): {locked.map((r) => r.name).join(", ")}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(selected)}>Save roles</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>New staff account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormSection>
          <Field label="Full name" htmlFor="member-name">
            <Input id="member-name" placeholder="Full name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="member-email">
            <Input id="member-email" placeholder="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Temporary password" htmlFor="member-password" className="sm:col-span-2"
            hint="They'll be asked to set their own password on first login.">
            <div className="flex gap-2">
              <Input id="member-password" className="font-mono" value={form.tempPassword}
                onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
              <Button variant="secondary" onClick={() => setForm({ ...form, tempPassword: generatePassword() })}>
                Generate
              </Button>
            </div>
          </Field>
        </FormSection>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Roles</p>
          <RoleCheckboxes roles={roles} selected={roleIds} onChange={setRoleIds} idPrefix="new-member" />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </CardContent>
      <CardFooter className="border-t border-gray-200">
        <FormActions>
          <Button variant="secondary" onClick={() => onDone()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating..." : "Create account"}
          </Button>
        </FormActions>
      </CardFooter>
    </Card>
  );
}
