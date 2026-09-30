import { Label } from "@/src/components/ui/label";
import { cn } from "@/src/lib/utils";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="-ml-1 text-brand-600">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-error-600">{error}</p>
      ) : (
        hint && <p className="text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
} as const;

/** A titled group of fields. Consecutive sections are separated by a divider. */
export function FormSection({
  title,
  description,
  columns = 2,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  columns?: keyof typeof COLS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("border-t border-gray-200 pt-6 first:border-t-0 first:pt-0", className)}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div className={cn("grid gap-5", COLS[columns])}>{children}</div>
    </section>
  );
}

/** Form footer: optional destructive action on the left, the rest pushed right. */
export function FormActions({
  destructive,
  children,
  className,
}: {
  destructive?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center", className)}>
      {destructive && <div className="sm:mr-auto">{destructive}</div>}
      <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">{children}</div>
    </div>
  );
}

/** Tinted message box for success, warning and error notices. */
export function Notice({
  tone,
  className,
  children,
}: {
  tone: "success" | "error" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    success: "border-success-200 bg-success-50 text-success-700",
    error: "border-error-200 bg-error-50 text-error-700",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}
