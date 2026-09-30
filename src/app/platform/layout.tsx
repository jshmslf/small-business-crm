import { requireSuperAdmin } from "@/src/lib/session";
import { APP_NAME } from "@/src/components/auth-card";
import { LogoMark } from "@/src/components/logo-mark";

export default async function PlatfromLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-2.5 px-4 sm:px-8">
          <LogoMark name={APP_NAME} />
          <span className="text-base font-semibold text-gray-900">{APP_NAME}</span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
