import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export function LoadingPanel({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-56 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-8 text-slate-500">
      <Loader2 className="ml-3 h-5 w-5 animate-spin text-[#c89935]" />
      <span>{label ?? t("common.loadingData")}</span>
    </div>
  );
}

export function EmptyPanel({ title, description, action }: { title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f8edd0] text-[#b87f1c]">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-bold text-[#0b2343]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action ? <Button onClick={action.onClick} className="mt-5 bg-[#0b2343] hover:bg-[#163961]">{action.label}</Button> : null}
    </div>
  );
}

export function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-rose-100 bg-rose-50/50 p-8 text-center">
      <AlertCircle className="mb-3 h-7 w-7 text-rose-600" />
      <h3 className="font-bold text-[#0b2343]">{t("common.loadFailedTitle")}</h3>
      <p className="mt-2 text-sm text-slate-600">{t("common.loadFailedDescription")}</p>
      {onRetry ? <Button variant="outline" onClick={onRetry} className="mt-4 border-rose-200 bg-white">{t("common.retry")}</Button> : null}
    </div>
  );
}
