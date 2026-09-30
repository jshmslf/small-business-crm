"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar, type ShellProps } from "@/src/components/app-sidebar";
import { LogoMark } from "@/src/components/logo-mark";
import { Button } from "@/src/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet";

export function MobileNav(props: ShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark name={props.businessName} />
        <span className="truncate text-base font-semibold text-gray-900">{props.businessName}</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="size-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] gap-0 p-0 sm:max-w-[280px]">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <AppSidebar {...props} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
