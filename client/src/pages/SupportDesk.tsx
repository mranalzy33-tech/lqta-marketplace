import { LifeBuoy, PlayCircle, CheckCircle2 } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getNumberLocale } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SupportDesk() {
  const { language, t } = useLocale();
  const numberLocale = getNumberLocale(language);
  const queue = trpc.support.queue.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.support.updateTicket.useMutation({
    onSuccess: () => { toast.success(t("supportDesk.ticketUpdated")); utils.support.queue.invalidate(); },
    onError: error => toast.error(error.message),
  });

  return (
    <MarketplaceDashboardLayout eyebrow={t("supportDesk.eyebrow")} title={t("supportDesk.title")}>
      <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><LifeBuoy className="h-5 w-5" /></span>
        <div>
          <h2 className="font-black">{t("supportDesk.heroTitle")}</h2>
          <p className="mt-1 text-sm text-slate-300">{t("supportDesk.heroDescription")}</p>
        </div>
      </div>
      {queue.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("supportDesk.loading")} /></div>
      ) : queue.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => queue.refetch()} /></div>
      ) : queue.data?.length ? (
        <div className="mt-6 space-y-3">
          {queue.data.map(ticket => (
            <article key={ticket.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-[#0b2343]">{ticket.subject}</p>
                <p className="mt-1 text-xs text-slate-500">{ticket.status === "open" ? t("supportDesk.statusOpen") : t("supportDesk.statusInProgress")} · {new Date(ticket.updated_at).toLocaleString(numberLocale)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => update.mutate({ ticketId: ticket.id, status: "in_progress" })} disabled={update.isPending} className="border-[#d8e2eb] text-[#0b2343]"><PlayCircle className="ml-1 h-4 w-4" /> {t("supportDesk.process")}</Button>
                <Button size="sm" onClick={() => update.mutate({ ticketId: ticket.id, status: "resolved" })} disabled={update.isPending} className="bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 className="ml-1 h-4 w-4" /> {t("supportDesk.resolve")}</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("supportDesk.emptyTitle")} description={t("supportDesk.emptyDescription")} /></div>
      )}
    </MarketplaceDashboardLayout>
  );
}
