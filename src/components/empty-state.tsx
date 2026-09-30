import type { LucideIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full border-[6px] border-brand-25 bg-brand-100 text-brand-600 box-content">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
