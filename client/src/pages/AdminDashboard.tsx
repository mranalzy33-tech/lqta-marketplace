import { FileText, Gavel, MessageCircle, ShieldCheck, Sparkles, Trash2, UsersRound } from "lucide-react";
import { Link } from "wouter";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function AdminStat({ label, value, icon: Icon, accent, href }: { label: string; value: number; icon: typeof UsersRound; accent: string; href: string }) {
  const { t } = useLocale();
  return (
    <Link href={href} className="block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7b15e] hover:shadow-md">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></span>
      <p className="mt-5 text-3xl font-black text-[#0b2343]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-xs font-bold text-[#b87f1c]">{t("adminDashboard.openAdmin")}</p>
    </Link>
  );
}

function PendingListingsSection() {
  const { t } = useLocale();
  const pending = trpc.admin.pendingListings.useQuery();
  const utils = trpc.useUtils();
  const review = trpc.admin.reviewListing.useMutation({
    onSuccess: () => { toast.success(t("adminDashboard.listingReviewed")); void utils.admin.pendingListings.invalidate(); void utils.admin.overview.invalidate(); void utils.admin.listings.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const setFeatured = trpc.admin.setListingFeatured.useMutation({
    onSuccess: result => { toast.success(result.is_featured ? t("adminListings.featured") : t("adminListings.unfeatured")); void utils.admin.pendingListings.invalidate(); void utils.admin.listings.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteListing.useMutation({
    onSuccess: () => { toast.success(t("adminListings.listingDeleted")); void utils.admin.pendingListings.invalidate(); void utils.admin.listings.invalidate(); void utils.admin.overview.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const busy = review.isPending || setFeatured.isPending || remove.isPending;
  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-[#0b2343]">{t("adminDashboard.pendingListingsTitle")}</h3>
        <Link href="/admin/listings" className="text-sm font-bold text-[#b87f1c]">{t("adminDashboard.allListings")}</Link>
      </div>
      {pending.isLoading ? (
        <p className="mt-4 text-sm text-slate-500">{t("adminDashboard.loadingListings")}</p>
      ) : pending.isError ? (
        <ErrorPanel onRetry={() => pending.refetch()} />
      ) : pending.data?.length ? (
        <div className="mt-4 space-y-3">
          {pending.data.map(item => (
            <article key={item.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0b2343]">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sellerName} · {item.categoryName} · {item.type === "auction" ? t("adminDashboard.auctionType") : t("adminDashboard.fixedType")}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => review.mutate({ listingId: item.id, status: "active" })} disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">{t("adminDashboard.publish")}</Button>
                  <Button size="sm" variant="outline" onClick={() => review.mutate({ listingId: item.id, status: "rejected", reason: t("adminDashboard.rejectionReason") })} disabled={busy} className="border-rose-200 text-rose-700">{t("adminDashboard.reject")}</Button>
                  <Button size="sm" variant="outline" onClick={() => setFeatured.mutate({ listingId: item.id, isFeatured: !item.is_featured })} disabled={busy} aria-pressed={item.is_featured} className={item.is_featured ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[#d8e2eb] text-[#0b2343]"}>
                    <Sparkles className="ml-1 h-4 w-4" /> {item.is_featured ? t("adminListings.unfeature") : t("adminListings.feature")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (window.confirm(t("adminListings.deleteConfirm"))) remove.mutate({ listingId: item.id }); }} disabled={busy} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                    <Trash2 className="ml-1 h-4 w-4" /> {t("adminListings.deleteListing")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{t("adminDashboard.noPendingListings")}</p>
      )}
    </section>
  );
}

function AdminDashboardContent() {
  const { language, t } = useLocale();
  const overview = trpc.admin.overview.useQuery();
  const access = trpc.admin.access.useQuery();
  const canManageListings = Boolean(access.data?.isSuperAdmin || access.data?.permissions.includes("admin.listings.manage"));
  const conversations = trpc.admin.conversations.useQuery();
  return (
    <>
      {overview.isLoading ? (
        <LoadingPanel label={t("adminDashboard.loadingMetrics")} />
      ) : overview.isError ? (
        <ErrorPanel onRetry={() => overview.refetch()} />
      ) : (
        <>
          <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="font-black">{t("adminDashboard.heroTitle")}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminDashboard.heroDescription")}</p>
              </div>
            </div>
          </section>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat icon={UsersRound} label={t("adminDashboard.users")} value={overview.data?.usersCount ?? 0} accent="bg-[#eef2f6] text-[#0b2343]" href="/admin/users" />
            <AdminStat icon={FileText} label={t("adminDashboard.listings")} value={overview.data?.listingsCount ?? 0} accent="bg-[#eef2f6] text-[#0b2343]" href="/admin/listings" />
            <AdminStat icon={Gavel} label={t("adminDashboard.activeAuctions")} value={overview.data?.activeAuctionsCount ?? 0} accent="bg-[#f8e6b4] text-[#b87f1c]" href="/admin/auctions" />
            <AdminStat icon={ShieldCheck} label={t("adminDashboard.openTickets")} value={overview.data?.openTicketsCount ?? 0} accent="bg-[#eef4ee] text-emerald-700" href="/support" />
          </section>
          {canManageListings ? <PendingListingsSection /> : (
            <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">{t("adminDashboard.noListingsPermission")}</section>
          )}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#b87f1c]" /><h3 className="font-bold text-[#0b2343]">{language === "en" ? "Conversation monitoring" : "مراقبة المحادثات"}</h3></div>
            <p className="mt-1 text-xs text-slate-500">{language === "en" ? "Deleted messages remain visible here for safety and audit." : "تبقى الرسائل المحذوفة ظاهرة هنا لأغراض الأمان والمراجعة."}</p>
            {conversations.isLoading ? <p className="mt-4 text-sm text-slate-500">{t("common.loadingData")}</p> : conversations.isError ? <ErrorPanel onRetry={() => conversations.refetch()} /> : <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">{conversations.data?.length ? conversations.data.map(message => <article key={message.id} className={`rounded-xl border p-3 text-sm ${message.deleted_at ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{message.senderName}</span><time>{new Date(message.created_at).toLocaleString(language === "en" ? "en-US" : "ar-SA")}</time></div><p className="mt-2 text-[#0b2343]">{message.deleted_at ? message.deletionNotice : message.content}</p></article>) : <p className="text-sm text-slate-500">{language === "en" ? "No messages yet" : "لا توجد رسائل بعد"}</p>}</div>}
          </section>
        </>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const { t } = useLocale();
  return (
    <MarketplaceDashboardLayout eyebrow={t("adminDashboard.eyebrow")} title={t("adminDashboard.title")}>
      <AdminAccessGate permission="admin.dashboard.view">
        <AdminDashboardContent />
      </AdminAccessGate>
    </MarketplaceDashboardLayout>
  );
}
