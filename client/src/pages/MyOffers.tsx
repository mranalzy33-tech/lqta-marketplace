import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { LoadingPanel, ErrorPanel, EmptyPanel } from "@/components/marketplace/StatePanels";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency } from "../../../shared/currency";

export default function MyOffers() {
  const { language, t } = useLocale();
  const offers = trpc.marketplace.myOffers.useQuery();
  const statusLabel: Record<string, string> = { pending: language === "en" ? "Pending" : "قيد الانتظار", accepted: language === "en" ? "Accepted" : "مقبول", rejected: language === "en" ? "Rejected" : "مرفوض" };

  if (offers.isLoading) {
    return <MarketplaceDashboardLayout eyebrow={t("myOffers.eyebrow")} title={t("myOffers.title")}><LoadingPanel label={t("myOffers.loading")} /></MarketplaceDashboardLayout>;
  }
  if (offers.isError) {
    return <MarketplaceDashboardLayout eyebrow={t("myOffers.eyebrow")} title={t("myOffers.title")}><ErrorPanel onRetry={() => offers.refetch()} /></MarketplaceDashboardLayout>;
  }

  return (
    <MarketplaceDashboardLayout eyebrow={t("myOffers.eyebrow")} title={t("myOffers.title")}>
      {!offers.data?.length ? (
        <EmptyPanel title={t("myOffers.emptyTitle")} description={t("myOffers.emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {offers.data.map(offer => (
            <article key={offer.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-black text-[#0b2343]">{offer.listingTitle}</p>
                  <p className="mt-1 text-sm text-slate-500">{offer.message || t("myOffers.noMessage")}</p>
                </div>
                <strong className="text-[#b87f1c]">{formatCurrency(Number(offer.amount), language)}</strong>
              </div>
              <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${offer.status === "accepted" ? "bg-emerald-100 text-emerald-800" : offer.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{statusLabel[offer.status] ?? ""}</p>
            </article>
          ))}
        </div>
      )}
    </MarketplaceDashboardLayout>
  );
}
