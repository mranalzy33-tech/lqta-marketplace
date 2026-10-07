import { useMemo, useState } from "react";
import { Gavel, TimerOff } from "lucide-react";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function AdminAuctionsContent() {
  const { language, t } = useLocale();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"pending" | "active" | "sold" | "rejected" | "expired" | "">("");
  const input = useMemo(() => ({ page, pageSize: 20, status: status || undefined }), [page, status]);
  const auctions = trpc.admin.auctions.useQuery(input);
  const access = trpc.admin.access.useQuery();
  const utils = trpc.useUtils();
  const canManageAuctions = Boolean(access.data?.isSuperAdmin || access.data?.permissions.includes("admin.auctions.manage"));
  const update = trpc.admin.updateAuctionStatus.useMutation({
    onSuccess: () => { toast.success(t("adminAuctions.statusUpdated")); utils.admin.auctions.invalidate(); utils.admin.overview.invalidate(); },
    onError: error => toast.error(error.message),
  });

  return (
    <>
      <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><Gavel className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("adminAuctions.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminAuctions.heroDescription")}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-[#0b2343]">
          {t("adminAuctions.filterStatus")}
          <select value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }} className="ms-3 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
            <option value="">{t("adminAuctions.allAuctions")}</option>
            <option value="pending">{t("adminAuctions.statusPending")}</option>
            <option value="active">{t("adminAuctions.statusActive")}</option>
            <option value="sold">{t("adminAuctions.statusSold")}</option>
            <option value="rejected">{t("adminAuctions.statusRejected")}</option>
            <option value="expired">{t("adminAuctions.statusExpired")}</option>
          </select>
        </label>
      </section>

      {auctions.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("adminAuctions.loading")} /></div>
      ) : auctions.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => auctions.refetch()} /></div>
      ) : auctions.data?.items.length ? (
        <section className="mt-6 space-y-3">
          {auctions.data.items.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-[#0b2343]">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("adminAuctions.seller")} {item.sellerName} · {t("adminAuctions.status")} {item.status}</p>
                  <p className="mt-2 text-sm text-[#b87f1c]">{t("adminAuctions.currentPrice")} {formatCurrency(item.current_price ?? item.starting_price ?? 0, language)}</p>
                </div>
                {canManageAuctions ? (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ listingId: item.id, status: "expired" })} disabled={update.isPending || item.status !== "active"} className="border-rose-200 text-rose-700">
                    <TimerOff className="me-1 h-4 w-4" /> {t("adminAuctions.endAuction")}
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-slate-500">{t("adminAuctions.viewOnlyPermission")}</span>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("adminAuctions.emptyTitle")} description={t("adminAuctions.emptyDescription")} /></div>
      )}
    </>
  );
}

export default function AdminAuctions() {
  const { t } = useLocale();
  return (
    <MarketplaceDashboardLayout eyebrow={t("adminAuctions.eyebrow")} title={t("adminAuctions.title")}>
      <AdminAccessGate permission="admin.auctions.read">
        <AdminAuctionsContent />
      </AdminAccessGate>
    </MarketplaceDashboardLayout>
  );
}
