import { useState } from "react";
import {
  Bell,
  Gavel,
  Heart,
  Menu,
  Plus,
  Search,
  ShoppingCart,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import PreferenceControls from "@/components/PreferenceControls";
import { useLocale } from "@/contexts/LocaleContext";
import BrandLogo from "@/components/marketplace/BrandLogo";
import { trpc } from "@/lib/trpc";

function Logo() {
  const { language } = useLocale();
  return (
    <Link
      href="/"
      aria-label={language === "ar" ? "لقطة — الرئيسية" : "LQTA — Home"}
      className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white p-2 shadow-sm"
    >
      <BrandLogo variant="full" alt="" ariaHidden className="h-full w-full" />
    </Link>
  );
}

export default function MarketplaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { t, language } = useLocale();
  const notifications = trpc.account.notifications.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: user ? 60_000 : false,
  });
  const unreadCount =
    notifications.data?.filter(item => !item.is_read).length ?? 0;
  const unreadLabel =
    language === "ar"
      ? `${t("common.notifications")}${unreadCount ? `، ${unreadCount} غير مقروءة` : ""}`
      : `${t("common.notifications")}${unreadCount ? `, ${unreadCount} unread` : ""}`;
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const navigation = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.about"), path: "/about" },
    { label: t("nav.contact"), path: "/contact" },
  ];
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(
      keyword.trim()
        ? `/marketplace?q=${encodeURIComponent(keyword.trim())}`
        : "/marketplace"
    );
    setOpen(false);
  };
  const goTo = (path: string) => {
    setLocation(path);
    setOpen(false);
  };
  const iconClass =
    "grid h-8 w-8 place-items-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-[#ffda55]";

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f8fafb] text-[#162d4b] dark:bg-background dark:text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[#ffd438] focus:px-4 focus:py-3 focus:font-extrabold focus:text-[#0b2343] focus:shadow-lg"
      >
        {language === "ar" ? "تجاوز إلى المحتوى" : "Skip to content"}
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#081f3b] text-white shadow-[0_3px_18px_-9px_rgba(5,18,36,.65)]">
        <div className="container flex h-[3.55rem] items-center justify-between gap-2 lg:h-[3.8rem] lg:gap-4">
          <div className="flex min-w-0 items-center gap-3 xl:gap-5">
            <Logo />
            <nav
              aria-label={
                language === "ar" ? "التنقل الرئيسي" : "Main navigation"
              }
              className="hidden items-center gap-3 lg:flex"
            >
              {navigation.map((item, index) => (
                <Link
                  key={`${item.label}-${index}`}
                  href={item.path}
                  className={`whitespace-nowrap border-b-2 px-1 py-2 text-[11px] font-bold transition-colors ${location === item.path ? "border-[#ffd438] text-white" : "border-transparent text-slate-300 hover:text-white"}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <form
              role="search"
              onSubmit={submitSearch}
              className="flex h-8 w-full max-w-[20rem] items-center rounded-lg border border-white/15 bg-white/10 px-2 transition focus-within:border-[#ffd438] focus-within:ring-2 focus-within:ring-[#ffd438]/20"
            >
              <Search
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-[#ffda55]"
              />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder={t("search.marketplace")}
                aria-label={t("search.marketplace")}
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-[11px] outline-none placeholder:text-slate-300/75"
              />
              <button
                type="submit"
                aria-label={language === "ar" ? "بحث" : "Search"}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd438]"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <PreferenceControls compact onDark />
            <Link
              href={user ? "/account" : "#"}
              onClick={event => {
                if (!user) {
                  event.preventDefault();
                  startLogin();
                }
              }}
              aria-label={user ? t("nav.account") : t("nav.login")}
              title={user ? t("nav.account") : t("nav.login")}
              aria-current={location === "/account" ? "page" : undefined}
              className={iconClass}
            >
              <UserRound className="h-[17px] w-[17px]" />
            </Link>
            {user ? (
              <>
                <Link
                  href="/notifications"
                  aria-label={unreadLabel}
                  title={t("common.notifications")}
                  className={`${iconClass} relative hidden sm:grid`}
                >
                  <Bell className="h-[17px] w-[17px]" />
                  {unreadCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -end-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-[#081f3b] bg-rose-500 px-1 text-[9px] font-black leading-none text-white"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/favorites"
                  aria-label={t("common.favorites")}
                  title={t("common.favorites")}
                  className={`${iconClass} hidden sm:grid`}
                >
                  <Heart className="h-[17px] w-[17px]" />
                </Link>
                <Link
                  href="/wallet"
                  aria-label={t("wallet.title")}
                  title={t("wallet.title")}
                  className={`${iconClass} hidden md:grid`}
                >
                  <WalletCards className="h-[17px] w-[17px]" />
                </Link>
                <Link
                  href="/cart"
                  aria-label={t("common.cart")}
                  title={t("common.cart")}
                  className={`${iconClass} hidden md:grid`}
                >
                  <ShoppingCart className="h-[17px] w-[17px]" />
                </Link>
              </>
            ) : !loading ? (
              <button
                type="button"
                onClick={startLogin}
                aria-label={t("nav.login")}
                className="hidden h-8 items-center rounded-lg px-2 text-[11px] font-bold text-white hover:bg-white/10 sm:flex"
              >
                {t("nav.login")}
              </button>
            ) : null}
            <Link
              href="/seller"
              className="hidden h-8 items-center gap-1 rounded-lg bg-[#ffd438] px-2.5 text-[11px] font-black text-[#102b4d] transition hover:bg-[#f4c824] md:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("nav.addListing")}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(value => !value)}
              className="grid h-8 w-8 place-items-center rounded-lg text-white transition hover:bg-white/10 lg:hidden"
              aria-label={
                open
                  ? language === "ar"
                    ? "إغلاق القائمة"
                    : "Close menu"
                  : t("nav.menu")
              }
              aria-expanded={open}
            >
              <span className="sr-only">{t("nav.menu")}</span>
              {open ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Menu className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>
        {open ? (
          <div className="border-t border-white/10 bg-[#0b2343] px-4 pb-5 pt-4 shadow-xl lg:hidden">
            <form
              role="search"
              onSubmit={submitSearch}
              className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3"
            >
              <Search className="h-4 w-4 shrink-0 text-[#ffda55]" />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder={t("search.lqta")}
                aria-label={t("search.lqta")}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-300/75"
              />
              <button
                type="submit"
                className="text-xs font-bold text-[#ffda55]"
              >
                {language === "ar" ? "بحث" : "Search"}
              </button>
            </form>
            <nav className="grid gap-1 sm:grid-cols-2">
              {navigation.map((item, index) => (
                <Link
                  key={`${item.label}-${index}`}
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    href="/favorites"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    {t("common.favorites")}
                  </Link>
                  <Link
                    href="/wallet"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    {t("wallet.title")}
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    aria-label={unreadLabel}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    {t("common.notifications")}
                    {unreadCount > 0 ? (
                      <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    {t("common.cart")}
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    {t("nav.account")}
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    startLogin();
                  }}
                  className="rounded-lg px-3 py-2.5 text-start text-sm font-bold text-white hover:bg-white/10"
                >
                  {t("nav.login")}
                </button>
              )}
            </nav>
            <Link
              href="/seller"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#ffd438] text-sm font-black text-[#102b4d]"
            >
              <Plus className="h-4 w-4" />
              {t("nav.addListing")}
            </Link>
            <Link
              href="/marketplace?type=auction"
              onClick={() => setOpen(false)}
              className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg border border-white/15 text-sm font-bold text-white"
            >
              <Gavel className="h-4 w-4 text-[#ffda55]" />
              {t("home.auctionsTitle")}
            </Link>
          </div>
        ) : null}
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <footer className="mt-9 border-t border-white/10 bg-[#061a33] text-slate-200">
        <div className="container grid gap-8 py-8 sm:py-10 md:grid-cols-[1.35fr_1fr_1fr]">
          <div className="flex items-start gap-3">
            <span className="grid h-[4.5rem] w-[3.6rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
              <BrandLogo
                variant="full"
                alt={language === "ar" ? "شعار لقطة" : "LQTA logo"}
                className="h-full w-full"
              />
            </span>
            <div>
              <p className="text-lg font-black text-white">
                {language === "ar" ? "لقطة | LQTA" : "LQTA Marketplace"}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-7 text-slate-300">
                {t("footer.description")}
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white">{t("footer.explore")}</h3>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <Link
                href="/marketplace"
                className="text-slate-300 transition hover:text-[#ffda55]"
              >
                {t("common.marketplace")}
              </Link>
              <Link
                href="/marketplace?type=auction"
                className="inline-flex items-center gap-2 text-slate-300 transition hover:text-[#ffda55]"
              >
                <Gavel className="h-4 w-4" />
                {t("home.auctionsTitle")}
              </Link>
              <Link
                href="/about"
                className="text-slate-300 transition hover:text-[#ffda55]"
              >
                {t("nav.about")}
              </Link>
              <Link
                href="/contact"
                className="text-slate-300 transition hover:text-[#ffda55]"
              >
                {t("nav.contact")}
              </Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white">{t("footer.trusted")}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {t("footer.trustedDescription")}
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container flex flex-col gap-2 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()}{" "}
              {language === "ar" ? "لقطة" : "Lqta"}. {t("footer.rights")}
            </span>
            <span>
              {language === "ar"
                ? "السوق الذي يبدأ من لقطة"
                : "A better marketplace starts with Lqta"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
