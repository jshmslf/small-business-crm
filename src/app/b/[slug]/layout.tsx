import { SignOutButton } from "@/src/components/sign-out-button";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";
import Link from "next/link";

export default async function BusinessLayout({
    children,
    params,
}: {
        children: React.ReactNode;
        params: Promise<{ slug: string }>;
    }) {
    const { slug } = await params;
    const { user, access } = await requireBusinessAccess(slug);
    const base = `/b/${slug}`;

    const nav = [
        { href: base, label: "Home", show: true },
        { href: `${base}/customers`, label: "Customers", show: can(access, PERMISSIONS.CUSTOMERS_VIEW) },
        { href: `${base}/team`, label: "Team", show: can(access, PERMISSIONS.TEAM_VIEW) },
        { href: `${base}/roles`, label: "Roles", show: can(access, PERMISSIONS.ROLES_MANAGE) },
        { href: `${base}/settings`, label: "Settings", show: can(access, PERMISSIONS.BUSINESS_MANAGE) },
    ].filter((item) => item.show);

    return (
        <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r p-4">
        <p className="mb-6 text-lg font-bold">{access.business.name}</p>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded px-3 py-2 hover:bg-gray-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t pt-4 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-gray-500">{access.roles.map((r) => r.name).join(", ")}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
    )
}