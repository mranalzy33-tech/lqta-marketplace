import { useMemo, useState } from "react";
import { Check, Search, ShieldCheck, UserCog, X } from "lucide-react";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type StaffRecord = {
  id: string;
  name: string;
  email: string;
  is_banned: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
};

function AdminStaffContent() {
  const { t, language } = useLocale();
  const permissionText: Record<string, [string, string]> = {
    "admin.listings.read": ["View listings", "View listings and their review status."],
    "admin.listings.manage": ["Manage listings", "Publish, feature, return for review, reject, or delete listings."],
    "admin.ads.read": ["View sponsored campaigns", "View company and institution campaigns scheduled for the marketplace."],
    "admin.ads.manage": ["Manage sponsored campaigns", "Upload campaign images, edit content and schedule, and activate or pause campaigns."],
  };
  const permissionName = (id: string, label: string) => language === "en" ? permissionText[id]?.[0] ?? label : label;
  const permissionDescription = (id: string, description: string) => language === "en" ? permissionText[id]?.[1] ?? description : description;
  const [queryText, setQueryText] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StaffRecord | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const input = useMemo(() => ({ query: search || undefined, page: 1, pageSize: 50 }), [search]);
  const staff = trpc.admin.staff.useQuery(input);
  const catalog = trpc.admin.permissionCatalog.useQuery();
  const utils = trpc.useUtils();
  const assign = trpc.admin.assignStaffPermissions.useMutation({
    onSuccess: () => { toast.success(t("adminStaff.permissionsSaved")); setSelected(null); utils.admin.staff.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.removeStaffPermissions.useMutation({
    onSuccess: () => { toast.success(t("adminStaff.permissionsRemoved")); setSelected(null); utils.admin.staff.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const openEditor = (member: StaffRecord) => { setSelected(member); setChosen(member.permissions); };
  const togglePermission = (permission: string) => setChosen(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);

  return (
    <>
      <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><UserCog className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("adminStaff.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminStaff.heroDescription")}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <form onSubmit={event => { event.preventDefault(); setSearch(queryText.trim()); }} className="flex gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder={t("adminStaff.searchPlaceholder")} className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm" />
            <Button className="bg-[#0b2343] hover:bg-[#163961]"><Search className="ml-1 h-4 w-4" /> {t("adminStaff.search")}</Button>
          </form>

          {staff.isLoading ? (
            <div className="mt-6"><LoadingPanel label={t("adminStaff.loading")} /></div>
          ) : staff.isError ? (
            <div className="mt-6"><ErrorPanel onRetry={() => staff.refetch()} /></div>
          ) : staff.data?.items.length ? (
            <div className="mt-6 space-y-3">
              {staff.data.items.map(member => (
                <article key={member.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#0b2343]">{member.name}</p>
                        {member.isSuperAdmin ? (
                          <span className="rounded-full bg-[#f8e6b4] px-2.5 py-1 text-xs font-bold text-[#7a5314]">{t("adminStaff.superAdminBadge")}</span>
                        ) : member.permissions.length ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{t("adminStaff.staffMemberBadge")}</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{t("adminStaff.noPermissionsBadge")}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {member.permissions.length ? (
                          member.permissions.map(permission => (
                            <span key={permission} className="rounded-lg bg-[#f6f9fb] px-2 py-1 text-xs text-[#0b2343]">{permissionName(permission, catalog.data?.find(item => item.id === permission)?.label ?? permission)}</span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">{t("adminStaff.noPermissionsAssigned")}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={member.isSuperAdmin || member.is_banned} onClick={() => openEditor(member)} className="border-[#d7b15e] text-[#0b2343]">
                      {member.permissions.length ? t("adminStaff.editPermissions") : t("adminStaff.assignPermissions")}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6"><EmptyPanel title={t("adminStaff.emptyTitle")} description={t("adminStaff.emptyDescription")} /></div>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#b87f1c]" />
            <h3 className="font-bold text-[#0b2343]">{selected ? `${t("adminStaff.permissionsOf")} ${selected.name}` : t("adminStaff.selectMember")}</h3>
          </div>
          {selected ? (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500">{t("adminStaff.chooseCarefully")}</p>
              <div className="mt-4 space-y-2">
                {catalog.data?.map(permission => (
                  <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-[#d7b15e]">
                    <input type="checkbox" checked={chosen.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="mt-1 h-4 w-4 accent-[#0b2343]" />
                    <span>
                      <span className="block text-sm font-bold text-[#0b2343]">{permissionName(permission.id, permission.label)}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{permissionDescription(permission.id, permission.description)}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button disabled={!chosen.length || assign.isPending} onClick={() => assign.mutate({ userId: selected.id, permissions: chosen as never[] })} className="bg-[#0b2343] hover:bg-[#163961]">
                  <Check className="ml-1 h-4 w-4" /> {t("adminStaff.savePermissions")}
                </Button>
                {selected.permissions.length ? (
                  <Button variant="outline" disabled={remove.isPending} onClick={() => remove.mutate({ userId: selected.id })} className="border-rose-200 text-rose-700">
                    <X className="ml-1 h-4 w-4" /> {t("adminStaff.removeAdmin")}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-500">{t("adminStaff.selectFromList")}</p>
          )}
        </aside>
      </section>
    </>
  );
}

export default function AdminStaff() {
  const { t } = useLocale();
  return (
    <MarketplaceDashboardLayout eyebrow={t("adminStaff.eyebrow")} title={t("adminStaff.title")}>
      <AdminAccessGate superAdminOnly>
        <AdminStaffContent />
      </AdminAccessGate>
    </MarketplaceDashboardLayout>
  );
}
