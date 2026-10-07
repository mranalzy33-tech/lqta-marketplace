import { BellRing, CheckCheck } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getNumberLocale } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";

export default function Notifications() {
  const { language, t } = useLocale();
  const notifications = trpc.account.notifications.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.account.markNotificationRead.useMutation({ onSuccess: () => utils.account.notifications.invalidate() });
  const numberLocale = getNumberLocale(language);

  return (
    <MarketplaceDashboardLayout eyebrow={t("nav.account")} title={t("common.notifications")}>
      <p className="text-sm text-slate-500">{t("notifications.description")}</p>

      {notifications.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("notifications.loading")} /></div>
      ) : notifications.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => notifications.refetch()} /></div>
      ) : notifications.data?.length ? (
        <div className="mt-6 space-y-3">
          {notifications.data.map(item => (
            <article key={item.id} className={`flex items-start gap-4 rounded-2xl border p-4 ${item.is_read ? "border-slate-100 bg-white" : "border-[#efdda9] bg-[#fffdf7]"}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.is_read ? "bg-slate-100 text-slate-500" : "bg-[#f8e6b4] text-[#b87f1c]"}`}>
                <BellRing className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0b2343]">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString(numberLocale)}</p>
              </div>
              {!item.is_read ? (
                <Button size="sm" variant="outline" onClick={() => markRead.mutate({ notificationId: item.id })} disabled={markRead.isPending} className="border-[#e8d28e] text-[#70531b]">
                  <CheckCheck className="me-1 h-4 w-4" /> {t("notifications.markRead")}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("notifications.emptyTitle")} description={t("notifications.emptyDescription")} /></div>
      )}
    </MarketplaceDashboardLayout>
  );
}
