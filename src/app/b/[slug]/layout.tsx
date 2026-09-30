import { AppSidebar, type NavItem, type ShellProps } from "@/src/components/app-sidebar";
import { MobileNav } from "@/src/components/mobile-nav";
import { can, requireBusinessAccess } from "@/src/lib/access";
import { PERMISSIONS } from "@/src/lib/permissions";

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

    const allNav: (NavItem & { show: boolean })[] = [
        { href: base, label: "Home", icon: "home", group: "main", show: true },
        { href: `${base}/customers`, label: "Customers", icon: "customers", group: "main", show: can(access, PERMISSIONS.CUSTOMERS_VIEW) },
        { href: `${base}/orders`, label: "Orders", icon: "orders", group: "main", show: can(access, PERMISSIONS.ORDERS_VIEW) },
        { href: `${base}/inventory`, label: "Inventory", icon: "inventory", group: "main", show: can(access, PERMISSIONS.INVENTORY_VIEW) },
        { href: `${base}/sellers`, label: "Sellers", icon: "sellers", group: "main", show: can(access, PERMISSIONS.INVENTORY_VIEW) },
        { href: `${base}/team`, label: "Team", icon: "team", group: "main", show: can(access, PERMISSIONS.TEAM_VIEW) },
        { href: `${base}/roles`, label: "Roles", icon: "roles", group: "main", show: can(access, PERMISSIONS.ROLES_MANAGE) },
        { href: `${base}/settings`, label: "Settings", icon: "settings", group: "secondary", show: can(access, PERMISSIONS.BUSINESS_MANAGE) },
    ];
    const nav = allNav.filter((item) => item.show);

    const shell: ShellProps = {
        homeHref: base,
        nav: nav.map(({ href, label, icon, group }) => ({ href, label, icon, group })),
        businessName: access.business.name,
        userName: user.name,
        roleNames: access.roles.map((r) => r.name),
    };

    return (
        <div className="min-h-screen bg-white">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-gray-200 bg-white lg:flex">
                <AppSidebar {...shell} />
            </aside>
            <MobileNav {...shell} />
            <div className="lg:pl-[280px]">
                <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
            </div>
        </div>
    )
}
