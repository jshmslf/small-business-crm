"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  Handshake,
  House,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { initials } from "@/src/components/data-table";
import { LogoMark } from "@/src/components/logo-mark";
import { useSignOut } from "@/src/components/sign-out-button";
import { cn } from "@/src/lib/utils";

const ICONS = {
  home: House,
  customers: Users,
  orders: ShoppingBag,
  inventory: Package,
  sellers: Handshake,
  team: UsersRound,
  roles: ShieldCheck,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group: "main" | "secondary";
};

export type ShellProps = {
  homeHref: string;
  nav: NavItem[];
  businessName: string;
  userName: string;
  roleNames: string[];
};

export function AppSidebar({
  homeHref,
  nav,
  businessName,
  userName,
  roleNames,
  onNavigate,
}: ShellProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const main = nav.filter((item) => item.group === "main");
  const secondary = nav.filter((item) => item.group === "secondary");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <LogoMark name={businessName} />
        <span className="truncate text-base font-semibold text-gray-900">{businessName}</span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-4 pt-2">
        <ul className="flex flex-col gap-1">
          {main.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(item.href)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 px-4 pb-5">
        {secondary.length > 0 && (
          <ul className="mb-5 flex flex-col gap-1">
            {secondary.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href)} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-gray-200 pt-5">
          <UserMenu userName={userName} roleNames={roleNames} />
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
        active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className={cn("size-5 shrink-0", active ? "text-brand-600" : "text-gray-500")} aria-hidden />
      {item.label}
    </Link>
  );
}

function UserMenu({ userName, roleNames }: { userName: string; roleNames: string[] }) {
  const signOut = useSignOut();
  const roles = roleNames.join(", ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-brand-100 data-[state=open]:bg-gray-50">
        <Avatar>
          <AvatarFallback>{initials(userName)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{userName}</span>
          {roles && <span className="block truncate text-sm text-gray-500">{roles}</span>}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-gray-400" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block truncate text-sm font-semibold text-gray-900">{userName}</span>
          {roles && <span className="block truncate text-xs font-normal text-gray-500">{roles}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
