import { useMemo, useState } from "react";
import { Ban, Check, CheckCircle2, Crown, Search, ShieldCheck, UserCog, UsersRound, X } from "lucide-react";
import type { AdminPermission } from "../../../shared/adminPermissions";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AccountGroup = "regular" | "administrators" | "supervisors";
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "support_staff" | "super_admin";
  is_seller: boolean;
  is_banned: boolean;
  accountGroup: AccountGroup;
  permissions: AdminPermission[];
};

function AdminUsersContent() {
  const { t } = useLocale();
  const groupTabs: Array<{ id: AccountGroup; label: string; hint: string }> = [
    { id: "regular", label: t("adminUsers.tabRegularLabel"), hint: t("adminUsers.tabRegularHint") },
    { id: "administrators", label: t("adminUsers.tabAdminsLabel"), hint: t("adminUsers.tabAdminsHint") },
    { id: "supervisors", label: t("adminUsers.tabSupervisorsLabel"), hint: t("adminUsers.tabSupervisorsHint") },
  ];
  const groupBadge = (group: AccountGroup) => {
    if (group === "supervisors") return <span className="inline-flex items-center gap-1 rounded-full bg-[#f8e6b4] px-2.5 py-1 text-xs font-bold text-[#7a5314]"><Crown className="h-3.5 w-3.5" /> {t("adminUsers.badgeSupervisor")}</span>;
    if (group === "administrators") return <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf5ed] px-2.5 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> {t("adminUsers.badgeAdmin")}</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{t("adminUsers.badgeRegular")}</span>;
  };

  const [queryText, setQueryText] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<AccountGroup>("regular");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [chosen, setChosen] = useState<AdminPermission[]>([]);
  const input = useMemo(() => ({ query: search || undefined, group, page, pageSize: 20 }), [search, group, page]);
  const users = trpc.admin.users.useQuery(input);
  const access = trpc.admin.access.useQuery();
  const isSuperAdmin = Boolean(access.data?.isSuperAdmin);
  const catalog = trpc.admin.permissionCatalog.useQuery(undefined, { enabled: isSuperAdmin });
  const utils = trpc.useUtils();
  const canManageUsers = Boolean(isSuperAdmin || access.data?.permissions.includes("admin.users.manage"));
  const updateBan = trpc.admin.setUserBan.useMutation({
    onSuccess: () => { toast.success(t("adminUsers.userStatusUpdated")); utils.admin.users.invalidate(); utils.admin.overview.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const assign = trpc.admin.assignStaffPermissions.useMutation({
    onSuccess: () => { toast.success(t("adminUsers.permissionsSaved")); setSelected(null); setChosen([]); utils.admin.users.invalidate(); utils.admin.staff.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.removeStaffPermissions.useMutation({
    onSuccess: () => { toast.success(t("adminUsers.permissionsRemoved")); setSelected(null); setChosen([]); utils.admin.users.invalidate(); utils.admin.staff.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const changeGroup = (next: AccountGroup) => { setGroup(next); setPage(1); setSelected(null); setChosen([]); };
  const openPermissions = (user: ManagedUser) => { setSelected(user); setChosen(user.permissions); };
  const togglePermission = (permission: AdminPermission) => setChosen(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);

  return (
    <>
      <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><UsersRound className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("adminUsers.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminUsers.heroDescription")}</p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div>
          <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm sm:grid-cols-3">
            {groupTabs.map(tab => (
              <button key={tab.id} type="button" onClick={() => changeGroup(tab.id)} className={`rounded-xl p-3 text-right transition ${group === tab.id ? "bg-[#0b2343] text-white shadow-sm" : "text-slate-600 hover:bg-[#f6f9fb]"}`}>
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className={`mt-1 block text-xs ${group === tab.id ? "text-slate-300" : "text-slate-500"}`}>{tab.hint}</span>
              </button>
            ))}
          </div>

          <form onSubmit={event => { event.preventDefault(); setSearch(queryText.trim()); setPage(1); }} className="mt-4 flex gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder={t("adminUsers.searchPlaceholder")} className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm" />
            <Button className="bg-[#0b2343] hover:bg-[#163961]"><Search className="ml-1 h-4 w-4" /> {t("adminUsers.search")}</Button>
          </form>

          {users.isLoading ? (
            <div className="mt-6"><LoadingPanel label={t("adminUsers.loading")} /></div>
          ) : users.isError ? (
            <div className="mt-6"><ErrorPanel onRetry={() => users.refetch()} /></div>
          ) : users.data?.items.length ? (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-right text-sm">
                  <thead className="bg-[#f6f9fb] text-[#0b2343]">
                    <tr>
                      <th className="p-4">{t("adminUsers.colAccount")}</th>
                      <th className="p-4">{t("adminUsers.colGroup")}</th>
                      <th className="p-4">{t("adminUsers.colStatus")}</th>
                      <th className="p-4">{t("adminUsers.colAdminPermissions")}</th>
                      <th className="p-4">{t("adminUsers.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.data.items.map(user => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="p-4">
                          <p className="font-bold text-[#0b2343]">{user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{user.role === "support_staff" ? t("adminUsers.roleSupport") : user.is_seller ? t("adminUsers.roleSeller") : t("adminUsers.roleUser")}</p>
                        </td>
                        <td className="p-4">{groupBadge(user.accountGroup)}</td>
                        <td className="p-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.is_banned ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {user.is_banned ? t("adminUsers.statusBanned") : t("adminUsers.statusActive")}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.accountGroup === "supervisors" ? (
                            <span className="text-xs font-bold text-[#7a5314]">{t("adminUsers.fullPermissions")}</span>
                          ) : user.permissions.length ? (
                            <span className="text-xs text-slate-600">{user.permissions.length} {t("adminUsers.permissionsCount")}</span>
                          ) : (
                            <span className="text-xs text-slate-500">{t("adminUsers.noPermissions")}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBan.mutate({ userId: user.id, isBanned: !user.is_banned })}
                              disabled={!canManageUsers || updateBan.isPending || user.accountGroup === "supervisors"}
                              className={user.is_banned ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}
                            >
                              {user.is_banned ? <><CheckCircle2 className="ml-1 h-4 w-4" /> {t("adminUsers.unban")}</> : <><Ban className="ml-1 h-4 w-4" /> {t("adminUsers.ban")}</>}
                            </Button>
                            {isSuperAdmin && user.accountGroup !== "supervisors" ? (
                              <Button size="sm" variant="outline" onClick={() => openPermissions(user)} disabled={user.is_banned} className="border-[#d7b15e] text-[#0b2343]">
                                <UserCog className="ml-1 h-4 w-4" /> {user.accountGroup === "administrators" ? t("adminUsers.editAdmin") : t("adminUsers.addToAdmin")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(current => current - 1)}>{t("adminUsers.previous")}</Button>
                <span className="text-sm text-slate-500">{t("adminUsers.pageLabel")} {page}</span>
                <Button variant="outline" disabled={!users.data.hasMore} onClick={() => setPage(current => current + 1)}>{t("adminUsers.next")}</Button>
              </div>
            </section>
          ) : (
            <div className="mt-6">
              <EmptyPanel
                title={`${t("adminUsers.emptyTitlePrefix")} ${groupTabs.find(tab => tab.id === group)?.label ?? t("adminUsers.accountsFallback")}`}
                description={group === "regular" ? t("adminUsers.emptyRegularDescription") : t("adminUsers.emptyOtherDescription")}
              />
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#b87f1c]" />
            <h3 className="font-bold text-[#0b2343]">{selected ? `${t("adminUsers.permissionsOf")} ${selected.name}` : t("adminUsers.addAccountToAdmin")}</h3>
          </div>
          {!isSuperAdmin ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">{t("adminUsers.superAdminOnly")}</p>
          ) : selected ? (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500">{t("adminUsers.selectOnlyNeeded")}</p>
              <div className="mt-4 space-y-2">
                {catalog.data?.map(permission => (
                  <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-[#d7b15e]">
                    <input type="checkbox" checked={chosen.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="mt-1 h-4 w-4 accent-[#0b2343]" />
                    <span>
                      <span className="block text-sm font-bold text-[#0b2343]">{permission.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{permission.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button disabled={!chosen.length || assign.isPending} onClick={() => assign.mutate({ userId: selected.id, permissions: chosen })} className="bg-[#0b2343] hover:bg-[#163961]">
                  <Check className="ml-1 h-4 w-4" /> {t("adminUsers.savePermissions")}
                </Button>
                {selected.accountGroup === "administrators" ? (
                  <Button variant="outline" disabled={remove.isPending} onClick={() => remove.mutate({ userId: selected.id })} className="border-rose-200 text-rose-700">
                    <X className="ml-1 h-4 w-4" /> {t("adminUsers.removeAdmin")}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">{t("adminUsers.selectRegularUserHint")}</p>
          )}
        </aside>
      </div>
    </>
  );
}

export default function AdminUsers() {
  const { t } = useLocale();
  return (
    <MarketplaceDashboardLayout eyebrow={t("adminUsers.eyebrow")} title={t("adminUsers.title")}>
      <AdminAccessGate permission="admin.users.read">
        <AdminUsersContent />
      </AdminAccessGate>
    </MarketplaceDashboardLayout>
  );
}
