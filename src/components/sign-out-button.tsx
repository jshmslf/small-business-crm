"use client";

import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.push("/login");
  };
}

export function SignOutButton({ className }: { className?: string }) {
  const signOut = useSignOut();
  return (
    <Button variant="secondary" className={className} onClick={signOut}>
      <LogOut aria-hidden />
      Log out
    </Button>
  );
}
