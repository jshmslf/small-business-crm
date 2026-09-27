
import { requireUser } from "@/src/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <SignOutButton />
    </main>
  );
}