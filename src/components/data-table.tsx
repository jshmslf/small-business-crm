import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { TableCell, TableRow } from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Rounded, bordered card that holds a table (or a list) and an optional footer. */
export function TableCard({
  header,
  footer,
  children,
  className,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs",
        className
      )}
    >
      {header && <div className="border-b border-gray-200 px-5 py-4 sm:px-6">{header}</div>}
      {children}
      {footer && (
        <div className="border-t border-gray-200 px-5 py-3 text-sm text-gray-500 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}

export function TableFooterCount({ count, noun }: { count: number; noun: [string, string] }) {
  return (
    <p>
      Showing {count} {count === 1 ? noun[0] : noun[1]}
    </p>
  );
}

/** A full-width row for an empty table body. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-auto p-0 whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * First-column cell content: a 40px thumbnail or initials avatar, then a name
 * and an optional secondary line.
 */
export function EntityCell({
  name,
  href,
  secondary,
  image,
  avatar,
}: {
  name: React.ReactNode;
  href?: string;
  secondary?: React.ReactNode;
  /** Pass `image` for a square thumbnail (null shows a placeholder tile). */
  image?: string | null;
  /** Pass `avatar` (a person's name) for a round initials avatar. */
  avatar?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image !== undefined &&
        (image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="size-10 shrink-0 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
            <ImageIcon className="size-4" aria-hidden />
          </div>
        ))}
      {avatar !== undefined && (
        <Avatar>
          <AvatarFallback>{initials(avatar)}</AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        {href ? (
          <Link
            href={href}
            className="block truncate font-medium text-gray-900 outline-none hover:text-brand-700 focus-visible:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate font-medium text-gray-900">{name}</p>
        )}
        {secondary && <div className="truncate text-sm text-gray-500">{secondary}</div>}
      </div>
    </div>
  );
}

/** Shows non-empty meta values side by side with spacing, instead of a dot-joined string. */
export function Meta({ items, className }: { items: React.ReactNode[]; className?: string }) {
  const shown = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "");
  if (shown.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-0.5", className)}>
      {shown.map((item, i) => (
        <span key={i}>{item}</span>
      ))}
    </span>
  );
}
