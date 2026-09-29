"use client";

import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button className="rounded border px-3 py-1"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
      }}>
      Log out
    </button>
  );
}