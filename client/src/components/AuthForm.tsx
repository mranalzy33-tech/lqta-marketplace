import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import BrandLogo from "@/components/marketplace/BrandLogo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { language, t } = useLocale();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneInputError, setPhoneInputError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const phoneValid = !isRegister || /^\d{7,20}$/.test(phone);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!emailValid)
        throw new Error(
          language === "en"
            ? "Enter a valid email address"
            : "أدخل بريداً إلكترونياً صحيحاً بصيغة @ و ."
        );
      if (isRegister && (phoneInputError || !phoneValid))
        throw new Error(
          language === "en"
            ? "Enter a valid phone number using digits only"
            : "أدخل رقم هاتف صحيحاً باستخدام الأرقام فقط"
        );
      if (
        isRegister &&
        (name.trim().length < 2 ||
          city.trim().length < 2 ||
          streetAddress.trim().length < 5)
      )
        throw new Error(
          language === "en"
            ? "Complete the required profile fields"
            : "أكمل بيانات الملف الشخصي المطلوبة"
        );
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              city: city.trim(),
              street_address: streetAddress.trim(),
              phone: phone.trim(),
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) setLocation("/");
        else setNotice(t("auth.confirmEmailNotice"));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        try {
          // Resolve the role from the authenticated server profile, never from
          // editable client metadata, before choosing the landing page.
          const user = await utils.auth.me.fetch(undefined, { staleTime: 0 });
          setLocation(user?.role === "super_admin" ? "/admin" : "/");
        } catch {
          // Authentication succeeded; keep the normal landing page available
          // even if the optional profile lookup is temporarily unavailable.
          setLocation("/");
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("auth.loginFailed")
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) return setError(t("auth.enterEmailFirst"));
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/login` }
    );
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setNotice(t("auth.resetLinkSent"));
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#e6edf3,transparent_37%),#f8fafb] p-5 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white bg-white p-8 text-center shadow-[0_28px_70px_-38px_rgba(8,30,58,.48)] dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/"
          aria-label={t("auth.brand")}
          className="mx-auto inline-grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700"
        >
          <BrandLogo
            variant="full"
            alt={language === "ar" ? "شعار لقطة" : "LQTA logo"}
            className="h-full w-full"
          />
        </Link>
        <span className="mx-auto mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#f8e6b4] text-[#ae7819]">
          {isRegister ? (
            <UserRound className="h-6 w-6" />
          ) : (
            <ShieldCheck className="h-6 w-6" />
          )}
        </span>
        <h1 className="mt-5 text-2xl font-black text-[#0b2343] dark:text-white">
          {isRegister
            ? t("auth.createAccountTitle")
            : t("auth.secureLoginTitle")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {isRegister
            ? t("auth.createAccountDescription")
            : t("auth.loginDescription")}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4 text-right">
          <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
            {t("auth.emailLabel")}
            <div className="relative mt-2">
              <Mail className="absolute start-3 top-3 h-4 w-4 text-slate-600" />
              <input
                required
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                aria-invalid={Boolean(email) && !emailValid}
                className={`h-11 w-full rounded-xl border bg-white px-10 text-sm outline-none ring-[#d7b15e] focus:ring-2 dark:bg-slate-950 ${email && !emailValid ? "border-rose-400" : "border-slate-200 dark:border-slate-700"}`}
                placeholder="name@example.com"
              />
            </div>
            {email && !emailValid ? (
              <span className="mt-1 block text-xs font-normal text-rose-600">
                {language === "en"
                  ? "Use a valid email format"
                  : "صيغة البريد غير صحيحة"}
              </span>
            ) : null}
          </label>
          {isRegister ? (
            <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
              {t("auth.nameLabel")}
              <div className="relative mt-2">
                <UserRound className="absolute start-3 top-3 h-4 w-4 text-slate-600" />
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm outline-none ring-[#d7b15e] focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                  placeholder={t("auth.namePlaceholder")}
                />
              </div>
            </label>
          ) : null}
          {isRegister ? (
            <>
              <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
                {language === "en" ? "City" : "المدينة"}
                <input
                  required
                  minLength={2}
                  value={city}
                  onChange={event => setCity(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#d7b15e] dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
                {language === "en" ? "Street address" : "العنوان بالتفصيل"}
                <input
                  required
                  minLength={5}
                  value={streetAddress}
                  onChange={event => setStreetAddress(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#d7b15e] dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
                {language === "en" ? "Phone number" : "رقم الهاتف"}
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{7,20}"
                  maxLength={20}
                  dir="ltr"
                  value={phone}
                  onChange={event => {
                    const raw = event.target.value;
                    const valid = /^\d*$/.test(raw);
                    setPhone(raw.replace(/\D/g, ""));
                    setPhoneInputError(!valid);
                  }}
                  aria-invalid={
                    phoneInputError || (Boolean(phone) && !phoneValid)
                  }
                  className={`mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#d7b15e] dark:bg-slate-950 ${phoneInputError || (phone && !phoneValid) ? "border-rose-400" : "border-slate-200 dark:border-slate-700"}`}
                  placeholder="05xxxxxxxx"
                />
                {phoneInputError || (phone && !phoneValid) ? (
                  <span className="mt-1 block text-xs font-normal text-rose-600">
                    {language === "en"
                      ? "Digits only (0-9), 7–20 digits"
                      : "الأرقام فقط (0-9)، من 7 إلى 20 رقماً"}
                  </span>
                ) : null}
              </label>
            </>
          ) : null}
          <label className="block text-sm font-bold text-[#0b2343] dark:text-slate-100">
            {t("auth.passwordLabel")}
            <div className="relative mt-2">
              <KeyRound className="absolute start-3 top-3 h-4 w-4 text-slate-600" />
              <input
                required
                minLength={6}
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm outline-none ring-[#d7b15e] focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                placeholder="••••••••"
              />
            </div>
          </label>
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-700">
              {notice}
            </p>
          ) : null}
          <Button
            disabled={busy}
            className="h-12 w-full bg-[#0b2343] text-base hover:bg-[#163961]"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRegister ? (
              t("auth.createAccountButton")
            ) : (
              t("auth.loginButton")
            )}
          </Button>
        </form>
        {!isRegister ? (
          <button
            type="button"
            disabled={busy}
            onClick={resetPassword}
            className="mt-5 text-sm font-bold text-[#b87f1c]"
          >
            {t("auth.forgotPassword")}
          </button>
        ) : null}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="mt-5 block text-sm font-bold text-[#b87f1c]"
        >
          {isRegister ? t("auth.haveAccount") : t("auth.createNewAccount")}
        </Link>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-slate-500"
        >
          {language === "en" ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}{" "}
          {t("auth.backToHome")}
        </Link>
      </div>
    </div>
  );
}
