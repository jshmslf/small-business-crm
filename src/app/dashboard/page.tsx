import { requireUser } from "@/src/lib/session";
import { SignOutButton } from "@/src/components/sign-out-button";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Store } from "lucide-react";
import { AuthCard } from "@/src/components/auth-card";
import { EmptyState } from "@/src/components/empty-state";
import { LogoMark } from "@/src/components/logo-mark";

const ROW =
  "flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-brand-100";

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
    <AuthCard title={`Welcome, ${user.name}`} description="Choose where you want to go.">
      <div className="space-y-6">
        {isSuperAdmin && (
          <Link href="/platform" className={ROW}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-gray-900">Platform admin</span>
              <span className="block text-sm text-gray-500">Manage all businesses and owners</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
          </Link>
        )}

        {memberships.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Your businesses</p>
            {memberships.map((m) => (
              <Link key={m.id} href={`/b/${m.business.slug}`} className={ROW}>
                <LogoMark name={m.business.name} />
                <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{m.business.name}</span>
                <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
              </Link>
            ))}
          </div>
        )}

        {memberships.length === 0 && !isSuperAdmin && (
          <EmptyState
            icon={Store}
            className="px-0 py-2"
            title="No businesses yet"
            description="You're not part of any business yet, or your access has been paused. Please contact your business owner."
          />
        )}

        <SignOutButton className="w-full" />
      </div>
    </AuthCard>
  );
}
