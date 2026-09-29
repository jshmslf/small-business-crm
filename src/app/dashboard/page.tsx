
import { requireUser } from "@/src/lib/session";
import { SignOutButton } from "../../components/sign-out-button";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, isActive: true, business: { isSuspended: false } },
    include: { business: true },
    orderBy: { joinedAt: "asc" },
  });

  const isSuperAdmin = user.role === "admin";

  if (memberships.length === 1 && !isSuperAdmin) {
    redirect(`/b/${memberships[0].business.slug}`);
  }

  return (
        <main className="mx-auto mt-16 max-w-md space-y-6 p-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>

      {isSuperAdmin && (
        <Link href="/platform" className="block rounded-lg border p-4 hover:bg-gray-50">
          <p className="font-medium">Platform admin</p>
          <p className="text-sm text-gray-500">Manage all businesses and owners</p>
        </Link>
      )}

      {memberships.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Your businesses</p>
          {memberships.map((m) => (
            <Link key={m.id} href={`/b/${m.business.slug}`}
              className="block rounded-lg border p-4 hover:bg-gray-50">
              {m.business.name}
            </Link>
          ))}
        </div>
      )}

      {memberships.length === 0 && !isSuperAdmin && (
        <p className="text-gray-600">
          You&apos;re not part of any business yet, or your access has been paused.
          Please contact your business owner.
        </p>
      )}

      <SignOutButton />
    </main>
  );
}