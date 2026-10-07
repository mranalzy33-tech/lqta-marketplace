import { CheckCircle2, FileText, Search, Sparkles, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminListings() {
  const { t } = useLocale();
  const { user } = useAuth();
  const canManageListings = user?.role === "super_admin" || Boolean(user?.adminPermissions?.includes("admin.listings.manage"));
  const statusLabel: Record<string, string> = {
    pending: t("adminListings.statusPending"),
    active: t("adminListings.statusActive"),
    sold: t("adminListings.statusSold"),
    rejected: t("adminListings.statusRejected"),
    expired: t("adminListings.statusExpired"),
  };
  const [queryText, setQueryText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"pending" | "active" | "sold" | "rejected" | "expired" | "">("");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const input = useMemo(() => ({ query: search || undefined, status: status || undefined, page, pageSize: 20 }), [search, status, page]);
  const listings = trpc.admin.listings.useQuery(input);
  const utils = trpc.useUtils();
  const update = trpc.admin.updateListingStatus.useMutation({
    onSuccess: () => { toast.success(t("adminListings.statusUpdated")); utils.admin.listings.invalidate(); utils.admin.overview.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const setFeatured = trpc.admin.setListingFeatured.useMutation({
    onSuccess: result => { toast.success(result.is_featured ? t("adminListings.featured") : t("adminListings.unfeatured")); void utils.admin.listings.invalidate(); void utils.admin.pendingListings.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteListing.useMutation({
    onSuccess: () => { toast.success(t("adminListings.listingDeleted")); void utils.admin.listings.invalidate(); void utils.admin.pendingListings.invalidate(); void utils.admin.overview.invalidate(); void utils.marketplace.home.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSearch(queryText.trim()); setPage(1); };
  const reject = (listingId: string) => {
    const reason = rejectionReason.trim();
    if (reason.length < 3) return toast.error("أدخل سبب الرفض قبل المتابعة");
    update.mutate({ listingId, status: "rejected", reason });
    setRejectingId(null);
    setRejectionReason("");
  };
  const deleteListing = (listingId: string) => {
    if (window.confirm(t("adminListings.deleteConfirm"))) remove.mutate({ listingId });
  };
  const busy = update.isPending || setFeatured.isPending || remove.isPending;

  return (
    <MarketplaceDashboardLayout eyebrow={t("adminListings.eyebrow")} title={t("adminListings.title")}>
      <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><FileText className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("adminListings.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminListings.heroDescription")}</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="mt-6 grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 sm:grid-cols-[1fr_180px_auto]">
        <input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder={t("adminListings.searchPlaceholder")} className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        <select value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">{t("adminListings.allStatuses")}</option>
          {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button className="bg-[#0b2343] hover:bg-[#163961]"><Search className="ml-1 h-4 w-4" /> {t("adminListings.search")}</Button>
      </form>

      {listings.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("adminListings.loading")} /></div>
      ) : listings.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => listings.refetch()} /></div>
      ) : listings.data?.items.length ? (
        <section className="mt-6 space-y-3">
          {listings.data.items.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              {item.images?.length ? <div className="mb-4 flex gap-2 overflow-x-auto">{item.images.map((url: string) => <img key={url} src={url} alt={item.title} width={96} height={72} loading="lazy" className="h-[72px] w-24 shrink-0 rounded-lg object-cover" />)}</div> : null}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-black text-[#0b2343]">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sellerName} · {item.categoryName} · {item.type === "auction" ? t("adminListings.auctionType") : t("adminListings.fixedType")}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sellerEmail}{item.sellerPhone ? ` · ${item.sellerPhone}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString("ar-SA")}</p>
                  <p className="mt-2 text-sm text-[#b87f1c]">{statusLabel[item.status] ?? item.status}</p>
                </div>
                {canManageListings ? <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => update.mutate({ listingId: item.id, status: "active" })} disabled={busy || item.status === "active"} className="bg-emerald-700 hover:bg-emerald-800">
                    <CheckCircle2 className="ml-1 h-4 w-4" /> {t("adminListings.publish")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ listingId: item.id, status: "pending" })} disabled={busy || item.status === "pending"} className="border-[#d8e2eb] text-[#0b2343]">
                    {t("adminListings.sendForReview")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectingId(item.id); setRejectionReason(""); }} disabled={busy || item.status === "rejected"} className="border-rose-200 text-rose-700">
                    <XCircle className="ml-1 h-4 w-4" /> {t("adminListings.reject")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setFeatured.mutate({ listingId: item.id, isFeatured: !item.is_featured })} disabled={busy || (!item.is_featured && item.status !== "pending" && item.status !== "active")} className={item.is_featured ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[#d8e2eb] text-[#0b2343]"} aria-pressed={item.is_featured}>
                    <Sparkles className="ml-1 h-4 w-4" /> {item.is_featured ? t("adminListings.unfeature") : t("adminListings.feature")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteListing(item.id)} disabled={busy} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                    <Trash2 className="ml-1 h-4 w-4" /> {t("adminListings.deleteListing")}
                  </Button>
                </div> : null}
              </div>
              {rejectingId === item.id ? <div className="mt-4 flex flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 sm:flex-row"><input autoFocus value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="سبب الرفض (إلزامي)" className="h-10 min-w-0 flex-1 rounded-lg border border-rose-200 bg-white px-3 text-sm" /><Button size="sm" onClick={() => reject(item.id)} disabled={update.isPending} className="bg-rose-700 hover:bg-rose-800">تأكيد الرفض</Button></div> : null}
            </article>
          ))}
        </section>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("adminListings.emptyTitle")} description={t("adminListings.emptyDescription")} /></div>
      )}
    </MarketplaceDashboardLayout>
  );
}
