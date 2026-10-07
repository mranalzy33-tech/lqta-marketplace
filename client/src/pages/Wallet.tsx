import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, WalletCards } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { Button } from "@/components/ui/button";
import { LoadingPanel, ErrorPanel } from "@/components/marketplace/StatePanels";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency } from "../../../shared/currency";
import { toast } from "sonner";

export default function Wallet() {
  const { language, t } = useLocale();
  const [amount, setAmount] = useState("");
  const wallet = trpc.wallet.balance.useQuery();
  const utils = trpc.useUtils();
  const deposit = trpc.wallet.deposit.useMutation({
    onSuccess: () => {
      toast.success(t("wallet.depositSuccess"));
      setAmount("");
      utils.wallet.balance.invalidate();
      utils.seller.workspace.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (wallet.isLoading) return <MarketplaceDashboardLayout eyebrow={t("wallet.eyebrow")} title={t("wallet.title")}><LoadingPanel label={t("wallet.loading")} /></MarketplaceDashboardLayout>;
  if (wallet.isError) return <MarketplaceDashboardLayout eyebrow={t("wallet.eyebrow")} title={t("wallet.title")}><ErrorPanel onRetry={() => wallet.refetch()} /></MarketplaceDashboardLayout>;

  const moneyCards = [
    { label: t("wallet.balance"), amount: wallet.data?.balance ?? 0, icon: WalletCards, tone: "bg-[#eff3f8] text-[#0b2343]" },
    { label: t("wallet.held"), amount: wallet.data?.held ?? 0, icon: ArrowUpRight, tone: "bg-amber-50 text-amber-700" },
    { label: t("wallet.available"), amount: wallet.data?.available ?? 0, icon: ArrowDownLeft, tone: "bg-emerald-50 text-emerald-700" },
  ];
  return (
    <MarketplaceDashboardLayout eyebrow={t("wallet.eyebrow")} title={t("wallet.title")}>
      <div className="relative isolate overflow-hidden rounded-[1.6rem] bg-[linear-gradient(115deg,#071d38_0%,#0b2343_62%,#173b65_100%)] p-6 text-white shadow-[0_26px_55px_-32px_rgba(11,35,67,.7)] sm:p-8">
        <div aria-hidden="true" className="absolute -end-14 -top-20 -z-10 h-64 w-64 rounded-full border-[38px] border-white/[.06]" />
        <div aria-hidden="true" className="absolute bottom-[-4rem] start-[42%] -z-10 h-44 w-44 rounded-full bg-[#f7d67f]/10 blur-2xl" />
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-300">{language === "ar" ? "رصيد محفظتك" : "Your wallet"}</p><p className="mt-4 text-3xl font-black tracking-tight text-[#f7d67f] sm:text-4xl">{formatCurrency(wallet.data?.balance ?? 0, language)}</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[#f7d67f]"><WalletCards className="h-6 w-6" /></span></div>
        <div className="mt-7 flex items-center gap-2 border-t border-white/10 pt-4 text-xs leading-6 text-slate-300"><CircleDollarSign className="h-4 w-4 shrink-0 text-[#f7d67f]" />{t("wallet.demoDisclaimer")}</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">{moneyCards.map(item => <article key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_38px_-34px_rgba(8,30,58,.65)] dark:bg-card"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-500">{item.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5" /></span></div><strong className="mt-4 block text-xl font-black text-[#0b2343] dark:text-white sm:text-2xl">{formatCurrency(item.amount, language)}</strong></article>)}</div>

      <form onSubmit={event => { event.preventDefault(); const value = Number(amount); if (!Number.isFinite(value) || value <= 0) return toast.error(t("wallet.invalidAmount")); deposit.mutate({ amount: value }); }} className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 dark:bg-card">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff7e4] text-[#a8781b]"><ArrowDownLeft className="h-5 w-5" /></span><div><h2 className="font-black text-[#0b2343] dark:text-white">{t("wallet.demoTopUpTitle")}</h2><p className="mt-1 text-sm text-slate-500">{language === "ar" ? "أدخل المبلغ ثم أضفه إلى رصيدك وفق آلية المحفظة الحالية." : "Enter an amount to add it using the current wallet flow."}</p></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder={t("wallet.amountPlaceholder")} aria-label={t("wallet.amountPlaceholder")} className="lqta-input min-w-0 flex-1" /><Button type="submit" disabled={deposit.isPending} className="h-11 bg-[#0b2343] px-5 font-bold text-white hover:bg-[#173b65]">{deposit.isPending ? t("wallet.submitting") : t("wallet.submit")}</Button></div>
      </form>
    </MarketplaceDashboardLayout>
  );
}
