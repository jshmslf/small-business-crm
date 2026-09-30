import { LogoMark } from "@/src/components/logo-mark";
import { cn } from "@/src/lib/utils";

export const APP_NAME = "Buy n Sell";

/** Centered single-card page used by the login, password and picker screens. */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-gray-50 px-4 py-12 sm:justify-center sm:py-16">
      <div className={cn("w-full max-w-[400px]", className)}>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2.5">
            <LogoMark name={APP_NAME} />
            <span className="text-base font-semibold text-gray-900">{APP_NAME}</span>
          </div>
          <h1 className="text-2xl leading-8 font-semibold tracking-tight text-gray-900 sm:text-[30px] sm:leading-[38px]">
            {title}
          </h1>
          {description && <div className="mt-2 text-base text-gray-500">{description}</div>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs sm:p-8">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </main>
  );
}
