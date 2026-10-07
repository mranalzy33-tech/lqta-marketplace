import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function PreferenceControls({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  const { language, toggleLanguage, t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? t("theme.light") : t("theme.dark");
  const controlStyle = onDark
    ? "border border-white/15 bg-white/5 text-white hover:border-[#ffd438] hover:bg-white/10"
    : "border border-slate-200 bg-white text-[#0b2343] hover:border-[#c89935] hover:bg-[#fff8e7] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";
  return <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
    <button type="button" onClick={toggleLanguage} title={t("language.switch")} aria-label={t("language.switch")} className={`inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-black transition ${controlStyle}`}>{language === "ar" ? "EN" : "ع"}</button>
    <button type="button" onClick={toggleTheme} title={nextThemeLabel} aria-label={nextThemeLabel} className={`grid h-8 w-8 place-items-center rounded-lg transition ${controlStyle}`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
  </div>;
}
