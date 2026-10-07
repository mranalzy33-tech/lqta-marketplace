import { CheckCircle2, Eye, Scale, XCircle } from "lucide-react";
import { useState } from "react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getNumberLocale } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DisputeQueue() {
  const { language, t } = useLocale();
  const numberLocale = getNumberLocale(language);
  const queue = trpc.disputes.queue.useQuery();
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const update = trpc.disputes.update.useMutation({
    onSuccess: () => { toast.success(t("disputeQueue.disputeUpdated")); utils.disputes.queue.invalidate(); },
    onError: error => toast.error(error.message),
  });

  return (
    <MarketplaceDashboardLayout eyebrow={t("disputeQueue.eyebrow")} title={t("disputeQueue.title")}>
      <div className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><Scale className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("disputeQueue.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("disputeQueue.heroDescription")}</p>
          </div>
        </div>
      </div>
      {queue.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("disputeQueue.loading")} /></div>
      ) : queue.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => queue.refetch()} /></div>
      ) : queue.data?.length ? (
        <div className="mt-6 space-y-4">
          {queue.data.map(dispute => (
            <article key={dispute.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#0b2343]">{dispute.order?.listingTitle ?? t("disputeQueue.defaultOrder")}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("disputeQueue.openedByPrefix")} {dispute.openedByName} · {new Date(dispute.created_at).toLocaleString(numberLocale)}</p>
                </div>
                <span className="rounded-full bg-[#f8e6b4] px-3 py-1 text-xs font-bold text-[#95631a]">{dispute.status === "open" ? t("disputeQueue.statusOpen") : t("disputeQueue.statusUnderReview")}</span>
              </div>
              <p className="mt-4 rounded-xl bg-[#f7f9fb] p-4 text-sm leading-7 text-slate-700">{dispute.reason}</p>
              <textarea value={notes[dispute.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [dispute.id]: event.target.value }))} maxLength={2000} className="mt-4 min-h-22 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder={t("disputeQueue.notePlaceholder")} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => update.mutate({ disputeId: dispute.id, status: "under_review" })} disabled={update.isPending} className="border-[#d8e2eb] text-[#0b2343]"><Eye className="ml-1 h-4 w-4" /> {t("disputeQueue.review")}</Button>
                <Button size="sm" onClick={() => update.mutate({ disputeId: dispute.id, status: "resolved", resolutionNote: notes[dispute.id] })} disabled={update.isPending} className="bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 className="ml-1 h-4 w-4" /> {t("disputeQueue.resolve")}</Button>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ disputeId: dispute.id, status: "rejected", resolutionNote: notes[dispute.id] })} disabled={update.isPending} className="border-rose-200 text-rose-700"><XCircle className="ml-1 h-4 w-4" /> {t("disputeQueue.reject")}</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("disputeQueue.emptyTitle")} description={t("disputeQueue.emptyDescription")} /></div>
      )}
    </MarketplaceDashboardLayout>
  );
}
