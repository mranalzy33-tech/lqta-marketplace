import { Scale, ShieldAlert } from "lucide-react";
import { useState } from "react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency, getNumberLocale } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Disputes() {
  const { language, t } = useLocale();
  const numberLocale = getNumberLocale(language);
  const statusLabel: Record<string, string> = {
    open: t("disputes.statusOpen"),
    under_review: t("disputes.statusUnderReview"),
    resolved: t("disputes.statusResolved"),
    rejected: t("disputes.statusRejected"),
  };
  const orders = trpc.disputes.orders.useQuery();
  const mine = trpc.disputes.mine.useQuery();
  const utils = trpc.useUtils();
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => { toast.success(t("disputes.reviewSaved")); setReviewOrderId(""); setReviewComment(""); },
    onError: error => toast.error(error.message),
  });
  const create = trpc.disputes.create.useMutation({
    onSuccess: () => { toast.success(t("disputes.disputeOpened")); setReason(""); utils.disputes.mine.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId) return toast.error(t("disputes.selectOrderFirstFull"));
    create.mutate({ orderId, reason });
  };
  const loading = orders.isLoading || mine.isLoading;
  const failed = orders.isError || mine.isError;

  return (
    <MarketplaceDashboardLayout eyebrow={t("disputes.eyebrow")} title={t("disputes.title")}>
      <div className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black">{t("disputes.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("disputes.heroDescription")}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6"><LoadingPanel label={t("disputes.loading")} /></div>
      ) : failed ? (
        <div className="mt-6"><ErrorPanel onRetry={() => { orders.refetch(); mine.refetch(); }} /></div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="font-black text-[#0b2343]">{t("disputes.mine")}</h3>
            {mine.data?.length ? (
              <div className="mt-4 space-y-3">
                {mine.data.map(dispute => (
                  <article key={dispute.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#0b2343]">{dispute.order?.listingTitle ?? t("disputes.order")}</p>
                        <p className="mt-1 text-xs font-bold text-[#b87f1c]">{statusLabel[dispute.status] ?? dispute.status}</p>
                      </div>
                      <span className="text-xs text-slate-600">{new Date(dispute.updated_at).toLocaleDateString(numberLocale)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{dispute.reason}</p>
                    {dispute.resolution_note ? (
                      <p className="mt-3 rounded-lg bg-[#f6f9fb] p-3 text-sm leading-6 text-slate-600">
                        <strong className="text-[#0b2343]">{t("disputes.supportNote")}</strong>
                        {dispute.resolution_note}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4"><EmptyPanel title={t("disputes.emptyTitle")} description={t("disputes.emptyDescription")} /></div>
            )}
          </section>

          <form
            onSubmit={event => {
              event.preventDefault();
              if (!reviewOrderId) return toast.error(t("disputes.selectOrderFirst"));
              createReview.mutate({ orderId: reviewOrderId, rating: reviewRating, comment: reviewComment || undefined });
            }}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="font-black text-[#0b2343]">{t("disputes.reviewFormTitle")}</h3>
            <label className="mt-4 block text-sm font-bold">
              {t("disputes.orderLabel")}
              <select value={reviewOrderId} onChange={e => setReviewOrderId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3">
                <option value="">{t("disputes.selectOrderFirst")}</option>
                {orders.data?.filter(order => order.delivery_status === "completed").map(order => (
                  <option key={order.id} value={order.id}>{order.listingTitle}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-bold">
              {t("disputes.ratingLabel")}
              <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="mt-2 h-11 w-full rounded-xl border px-3">
                <option value="5">5 / 5</option>
                <option value="4">4 / 5</option>
                <option value="3">3 / 5</option>
                <option value="2">2 / 5</option>
                <option value="1">1 / 5</option>
              </select>
            </label>
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              maxLength={1000}
              placeholder={t("disputes.optionalComment")}
              className="mt-4 min-h-24 w-full rounded-xl border p-3"
            />
            <Button disabled={createReview.isPending || !reviewOrderId} className="mt-4 w-full bg-[#0b2343]">
              {createReview.isPending ? t("disputes.savingReview") : t("disputes.submitReview")}
            </Button>
          </form>

          <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#b87f1c]" />
              <h3 className="font-black text-[#0b2343]">{t("disputes.newDisputeTitle")}</h3>
            </div>
            <label className="mt-5 block text-sm font-bold text-[#0b2343]">
              {t("disputes.orderLabel")}
              <select value={orderId} onChange={event => setOrderId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                <option value="">{t("disputes.selectOrderFirst")}</option>
                {orders.data?.map(order => (
                  <option key={order.id} value={order.id}>
                    {order.listingTitle} — {formatCurrency(order.final_price, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-bold text-[#0b2343]">
              {t("disputes.reasonLabel")}
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal"
                placeholder={t("disputes.reasonPlaceholder")}
              />
            </label>
            <Button disabled={create.isPending || !orders.data?.length} className="mt-5 w-full bg-[#0b2343] hover:bg-[#163961]">
              {create.isPending ? t("disputes.openingDispute") : t("disputes.sendForReview")}
            </Button>
            {!orders.data?.length ? <p className="mt-3 text-xs leading-6 text-slate-500">{t("disputes.noEligibleOrders")}</p> : null}
          </form>
        </div>
      )}
    </MarketplaceDashboardLayout>
  );
}
