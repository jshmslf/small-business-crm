"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "./actions";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, Notice } from "@/src/components/form-field";
import { useSignOut } from "@/src/components/sign-out-button";

export function ChangePasswordForm() {
  const router = useRouter();
  const signOut = useSignOut();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    const result = await changePassword(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Field label="Temporary password" htmlFor="currentPassword">
        <Input id="currentPassword" type="password" placeholder="Temporary password" autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      </Field>
      <Field label="New password" htmlFor="newPassword">
        <Input id="newPassword" type="password" placeholder="New password (min 8)" autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <Input id="confirmPassword" type="password" placeholder="Confirm new password" autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : "Set new password"}
      </Button>
      <div className="text-center">
        <Button type="button" variant="link" className="text-gray-500 hover:text-gray-700" onClick={signOut}>
          Log out
        </Button>
      </div>
    </form>
  );
}
