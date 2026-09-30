import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./form";
import { requireSignedIn } from "@/src/lib/session";
import { AuthCard } from "@/src/components/auth-card";

export default async function ChangePasswordPage() {
  const user = await requireSignedIn();

  // Users who don't need to change their password shouldn't be stuck here
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <AuthCard
      title="Set your password"
      description={
        <>
          Welcome, {user.name}! Your account was created with a temporary password.
          Please choose your own password to continue.
        </>
      }
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
