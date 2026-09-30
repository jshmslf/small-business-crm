import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

/** Layout for a list page's filter form: filters left, search right, active chips below. */
export function FilterBar({
  filters,
  search,
  chips,
  className,
}: {
  filters?: React.ReactNode;
  search: React.ReactNode;
  chips?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {filters && <div className="flex flex-wrap items-center gap-3">{filters}</div>}
        <div className="flex w-full items-center gap-3 lg:ml-auto lg:w-auto">{search}</div>
      </div>
      {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
    </div>
  );
}

export function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative w-full lg:w-80", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
      <Input type="search" className="pl-10" {...props} />
    </div>
  );
}

/** Link that removes one filter from the current URL. */
export function FilterChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 pr-2 pl-2.5 text-xs font-medium text-brand-700 outline-none hover:bg-brand-100 focus-visible:ring-4 focus-visible:ring-brand-100"
    >
      {children}
      <X className="size-3.5" aria-hidden />
      <span className="sr-only">Remove filter</span>
    </Link>
  );
}

/** Build `base?...` from params, dropping empty values and the `omit` key. */
export function hrefWithout(
  base: string,
  params: Record<string, string | undefined>,
  omit: string
) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== omit && value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}
