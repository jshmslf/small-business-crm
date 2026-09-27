"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Invalid email or password");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto mt-20 max-w-sm space-y-4 p-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <input className="w-full rounded border p-2" placeholder="Email" type="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="Password" type="password"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleLogin} disabled={loading}
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50">
        {loading ? "Logging in..." : "Log in"}
      </button>
      <p className="text-sm">
        No account yet? <Link href="/sign-up" className="underline">Sign up</Link>
      </p>
    </main>
  );
}