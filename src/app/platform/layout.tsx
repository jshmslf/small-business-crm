import { requireSuperAdmin } from "@/src/lib/session";

export default async function PlatfromLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <div className="mx-auto max-w-4xl p-8">{ children }</div>
}