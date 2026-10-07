import { useState, type FormEvent } from "react";
import { Check, Globe2, Loader2, LockKeyhole, UserRound } from "lucide-react";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocale, type Language } from "@/contexts/LocaleContext";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useLocale();
  const utils = trpc.useUtils();
  const settings = trpc.account.settings.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const save = trpc.account.setPreferredLanguage.useMutation({
    onSuccess: result => {
      setLanguage(result.preferredLanguage);
      window.dispatchEvent(
        new CustomEvent("lqta:preferred-language", {
          detail: result.preferredLanguage,
        })
      );
      utils.auth.me.invalidate();
      utils.account.settings.invalidate();
      toast.success(t("account.languagePrefSaved"));
    },
    onError: error => toast.error(error.message),
  });

  const selected = settings.data?.preferredLanguage ?? language;
  const choose = (value: Language) => save.mutate({ language: value });

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) return toast.error(t("account.passwordEmailMissing"));
    if (newPassword.length < 6)
      return toast.error(t("account.passwordMinLength"));
    if (newPassword !== confirmPassword)
      return toast.error(t("account.passwordMismatch"));
    if (newPassword === currentPassword)
      return toast.error(t("account.passwordMustDiffer"));

    setPasswordSaving(true);
    try {
      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
      if (verificationError)
        throw new Error(t("account.passwordCurrentInvalid"));

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success(t("account.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("account.passwordUpdateFailed")
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <MarketplaceShell>
      <main className="container py-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-center gap-4 rounded-[1.5rem] bg-[#0b2343] p-6 text-white sm:p-8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f7d67f] text-[#0b2343]">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f7d67f]">
                {t("account.dashboardEyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-black">
                {t("account.dashboardTitle")}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {t("account.dashboardDescription")}
              </p>
            </div>
          </header>

          {loading || settings.isLoading ? (
            <div className="grid min-h-52 place-items-center rounded-2xl bg-white dark:bg-slate-950">
              <Loader2 className="h-6 w-6 animate-spin text-[#c89935]" />
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-7 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {t("account.languagePrefSignInFirst")}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2f6] text-[#0b2343] dark:bg-slate-800 dark:text-white">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-black text-[#0b2343] dark:text-white">
                      {t("account.profileTitle")}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("account.profileDescription")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-500">
                      {t("account.profileName")}
                    </p>
                    <p className="mt-1 font-bold text-[#0b2343] dark:text-white">
                      {user.name || t("account.profileNameFallback")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-500">
                      {t("account.profileEmail")}
                    </p>
                    <p
                      className="mt-1 break-all font-bold text-[#0b2343] dark:text-white"
                      dir="ltr"
                    >
                      {user.email}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff8e8] text-[#b87f1c]">
                    <Globe2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#b87f1c]">
                      {t("account.languagePrefEyebrow")}
                    </p>
                    <h2 className="mt-1 font-black text-[#0b2343] dark:text-white">
                      {t("account.languagePrefTitle")}
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {t("account.languagePrefDescription")}
                </p>
                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    aria-pressed={selected === "ar"}
                    onClick={() => choose("ar")}
                    disabled={save.isPending}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-start transition ${selected === "ar" ? "border-[#c89935] bg-[#fff8e8]" : "border-slate-200 hover:border-[#d7b15e] dark:border-slate-700"}`}
                  >
                    <span>
                      <strong className="block text-base text-[#0b2343] dark:text-white">
                        {t("account.languageArabic")}
                      </strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {t("account.languageArabicDirection")}
                      </span>
                    </span>
                    {selected === "ar" ? (
                      <Check className="h-5 w-5 text-[#b87f1c]" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-pressed={selected === "en"}
                    onClick={() => choose("en")}
                    disabled={save.isPending}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-start transition ${selected === "en" ? "border-[#c89935] bg-[#fff8e8]" : "border-slate-200 hover:border-[#d7b15e] dark:border-slate-700"}`}
                  >
                    <span>
                      <strong className="block text-base text-[#0b2343] dark:text-white">
                        {t("account.languageEnglish")}
                      </strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {t("account.languageEnglishDirection")}
                      </span>
                    </span>
                    {selected === "en" ? (
                      <Check className="h-5 w-5 text-[#b87f1c]" />
                    ) : null}
                  </button>
                  {save.isPending ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("account.languagePrefSaving")}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2f6] text-[#0b2343] dark:bg-slate-800 dark:text-white">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#b87f1c]">
                      {t("account.securityEyebrow")}
                    </p>
                    <h2 className="mt-1 font-black text-[#0b2343] dark:text-white">
                      {t("account.passwordTitle")}
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {t("account.passwordDescription")}
                </p>
                <form onSubmit={changePassword} className="mt-5 space-y-4">
                  <label className="block text-sm font-bold text-[#0b2343] dark:text-white">
                    {t("account.currentPassword")}
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={event => setCurrentPassword(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#c89935] focus:ring-2 focus:ring-[#c89935]/20 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="block text-sm font-bold text-[#0b2343] dark:text-white">
                    {t("account.newPassword")}
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={event => setNewPassword(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#c89935] focus:ring-2 focus:ring-[#c89935]/20 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="block text-sm font-bold text-[#0b2343] dark:text-white">
                    {t("account.confirmPassword")}
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#c89935] focus:ring-2 focus:ring-[#c89935]/20 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full bg-[#0b2343] hover:bg-[#163961]"
                  >
                    {passwordSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LockKeyhole className="h-4 w-4" />
                    )}
                    {passwordSaving
                      ? t("account.passwordSaving")
                      : t("account.changePassword")}
                  </Button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </MarketplaceShell>
  );
}
