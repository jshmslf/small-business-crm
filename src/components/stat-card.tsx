import Link from "next/link";
import { cn } from "@/src/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl leading-[38px] font-semibold tracking-tight text-gray-900 tabular-nums">
        {value}
      </p>
      {hint && <div className="mt-1 text-sm text-gray-500">{hint}</div>}
    </>
  );
  const classes = cn(
    "block rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          classes,
          "transition-colors outline-none hover:border-gray-300 hover:bg-gray-25 focus-visible:ring-4 focus-visible:ring-brand-100"
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
