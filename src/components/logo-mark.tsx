import { cn } from "@/src/lib/utils";

/** Indigo tile with the first letter of a name. Used for businesses and the app. */
export function LogoMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-xs",
        className
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
