import { Link } from "wouter";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { AdminPermission } from "../../../shared/adminPermissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminAccessGate({
  children,
  permission,
  superAdminOnly = false,
}: {
  children: React.ReactNode;
  permission?: AdminPermission;
  superAdminOnly?: boolean;
}) {
  const { t } = useLocale();
  const access = trpc.admin.access.useQuery(undefined, { retry: false });
  const allowed = access.data && (superAdminOnly ? access.data.isSuperAdmin : !permission || access.data.isSuperAdmin || access.data.permissions.includes(permission));

  if (access.isLoading) {
    return <div className="grid min-h-[300px] place-items-center rounded-2xl border border-slate-100 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">{t("adminGate.checkingPermission")}</div>;
  }

  if (!allowed) {
    return (
      <section className="grid min-h-[320px] place-items-center rounded-[1.5rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
        <div className="max-w-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-700"><LockKeyhole className="h-6 w-6" /></span>
          <h2 className="mt-5 text-xl font-black text-[#0b2343]">{t("adminGate.noAccessTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("adminGate.noAccessDescription")}</p>
          <Button asChild className="mt-6 bg-[#0b2343] hover:bg-[#163961]"><Link href="/">{t("adminGate.backToHome")}</Link></Button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

export function AdminAccessNotice({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useLocale();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#edd9a1] bg-[#fffaf0] p-4 text-sm text-[#624a16]">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{isSuperAdmin ? t("adminGate.noticeSuperAdmin") : t("adminGate.noticeLimited")}</p>
    </div>
  );
}
