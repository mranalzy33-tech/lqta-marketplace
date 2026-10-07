import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useLocale } from "@/contexts/LocaleContext";

export function fallbackFor(location: string) {
  if (location.startsWith("/admin/")) return "/admin";
  if (location.startsWith("/listing/")) return "/marketplace";
  if (["/messages", "/disputes", "/favorites", "/notifications", "/support", "/dispute-queue"].includes(location)) return "/seller";
  return "/";
}

export function getBackTarget(location: string, hasSameSiteReferrer: boolean, historyLength: number) {
  return hasSameSiteReferrer && historyLength > 1 ? { type: "history" as const } : { type: "fallback" as const, path: fallbackFor(location) };
}

export default function BackButton() {
  const [location, setLocation] = useLocation();
  const { language, t } = useLocale();
  if (location === "/") return null;

  const goBack = () => {
    const sameSiteReferrer = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    const target = getBackTarget(location, sameSiteReferrer, window.history.length);
    if (target.type === "history") {
      window.history.back();
      return;
    }
    setLocation(target.path);
  };

  return <button type="button" onClick={goBack} className="fixed bottom-5 start-5 z-[70] inline-flex items-center gap-2 rounded-xl border border-[#d7b15e] bg-white px-3.5 py-2.5 text-sm font-bold text-[#0b2343] shadow-[0_12px_30px_-18px_rgba(8,30,58,.6)] transition hover:-translate-y-0.5 hover:bg-[#fff9eb] focus:outline-none focus:ring-4 focus:ring-[#f4dfac]/70">{language === "en" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{t("backButton.back")}</button>;
}
