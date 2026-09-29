"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "./actions";
import { authClient } from "@/src/lib/auth-client";

export function ChangePasswordForm() {
  const router = useRouter();
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

  const input = "w-full rounded border p-2";

  return (
    <div className="space-y-3">
      <input className={input} type="password" placeholder="Temporary password"
        value={form.currentPassword}
        onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <input className={input} type="password" placeholder="New password (min 8)"
        value={form.newPassword}
        onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
      <input className={input} type="password" placeholder="Confirm new password"
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleSubmit} disabled={loading}
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50">
        {loading ? "Saving..." : "Set new password"}
      </button>
      <button
        onClick={async () => {
          await authClient.signOut();
          router.push("/login");
        }}
        className="w-full text-sm text-gray-500 underline">
        Log out
      </button>
    </div>
  );
}