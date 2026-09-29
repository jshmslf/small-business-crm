import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./form";
import { requireSignedIn } from "@/src/lib/session";

export default async function ChangePasswordPage() {
  const user = await requireSignedIn();

  // Users who don't need to change their password shouldn't be stuck here
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <main className="mx-auto mt-20 max-w-sm space-y-4 p-4">
      <h1 className="text-2xl font-bold">Set your password</h1>
      <p className="text-sm text-gray-600">
        Welcome, {user.name}! Your account was created with a temporary password.
        Please choose your own password to continue.
      </p>
      <ChangePasswordForm />
    </main>
  );
}