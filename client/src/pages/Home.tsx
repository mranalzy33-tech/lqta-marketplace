import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Gavel,
  HeartPulse,
  Home as HomeIcon,
  Search,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  UsersRound,
  Megaphone,
} from "lucide-react";
import { useLocation } from "wouter";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import BrandLogo from "@/components/marketplace/BrandLogo";
import ListingCard from "@/components/marketplace/ListingCard";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const heroSlides = [
  {
    image: "/images/hero-cars.webp",
    categoryAr: "السيارات والمركبات",
    categoryEn: "Cars & vehicles",
    sceneAr: "سيارتك القادمة تبدأ من هنا",
    sceneEn: "Find your next ride",
  },
  {
    image: "/images/hero-property.webp",
    categoryAr: "العقارات",
    categoryEn: "Real estate",
    sceneAr: "اكتشف بيت أحلامك",
    sceneEn: "Discover your next home",
  },
  {
    image: "/images/hero-electronics.webp",
    categoryAr: "الأجهزة الإلكترونية",
    categoryEn: "Electronics",
    sceneAr: "تقنية أقرب إلى اهتماماتك",
    sceneEn: "Technology worth discovering",
  },
  {
    image: "/images/hero-fashion.webp",
    categoryAr: "الأزياء والملابس",
    categoryEn: "Fashion & clothing",
    sceneAr: "أسلوب جديد ينتظرك",
    sceneEn: "A new style is waiting",
  },
];

function categoryFallbackImage(name: string) {
  if (/سيار|مركب|car|vehicle|automotive/.test(name))
    return "/images/hero-cars.webp";
  if (/عقار|عقارات|real estate|property|منزل|house/.test(name))
    return "/images/hero-property.webp";
  if (/إلكترون|جوال|تقنية|electronic|mobile|tech/.test(name))
    return "/images/hero-electronics.webp";
  if (/ملابس|أزياء|fashion|clothes|wear/.test(name))
    return "/images/hero-fashion.webp";
  if (/أثاث|مطبخ|furniture|kitchen/.test(name))
    return "/images/hero-property.webp";
  return null;
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [, setLocation] = useLocation();
  const { language, direction, t } = useLocale();
  const [isMounted, setIsMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [pauseSlides, setPauseSlides] = useState(false);
  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (
      pauseSlides ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setActiveSlide(current => (current + 1) % heroSlides.length),
      12_000
    );
    return () => window.clearInterval(timer);
  }, [pauseSlides]);
  const home = trpc.marketplace.home.useQuery(undefined, { staleTime: 30_000 });
  const sponsoredAds = trpc.marketplace.sponsoredAds.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { isAuthenticated } = useAuth();
  const recentlyViewed = trpc.recentlyViewed.useQuery(undefined, {
    enabled: isAuthenticated && isMounted,
    staleTime: 30_000,
  });
  const en = language === "en";
  const ArrowIcon = en ? ArrowLeft : ArrowRight;
  const PreviousSlideIcon = en ? ChevronLeft : ChevronRight;
  const NextSlideIcon = en ? ChevronRight : ChevronLeft;
  const previousSlide = () =>
    setActiveSlide(
      current => (current - 1 + heroSlides.length) % heroSlides.length
    );
  const nextSlide = () =>
    setActiveSlide(current => (current + 1) % heroSlides.length);
  const activeHeroSlide = heroSlides[activeSlide];

  const categoryIcon = (category: {
    name: string;
    name_en?: string | null;
    icon: string | null;
  }) => {
    if (category.icon) return null;
    const name = `${category.name} ${category.name_en ?? ""}`.toLowerCase();
    if (/خصم|اقتصاد|عرض|sale|deal|offer|budget/.test(name)) return BadgePercent;
    if (/ملابس|أزياء|fashion|clothes|wear/.test(name)) return Shirt;
    if (/مطبخ|منزل|أثاث|kitchen|home|furniture/.test(name)) return CookingPot;
    if (/إلكترون|جوال|تقنية|electronic|mobile|tech/.test(name))
      return Smartphone;
    if (/جمال|عناية|beauty|care/.test(name)) return HeartPulse;
    if (/سيار|مركب|car|vehicle/.test(name)) return CarFront;
    if (/عقار|منزل|real estate|property/.test(name)) return HomeIcon;
    if (/أطفال|طفل|baby|kids/.test(name)) return UsersRound;
    return Tag;
  };

  const steps = [
    { icon: Search, title: t("home.step1Title"), text: t("home.step1Text") },
    { icon: Gavel, title: t("home.step2Title"), text: t("home.step2Text") },
    {
      icon: ShieldCheck,
      title: t("home.step3Title"),
      text: t("home.step3Text"),
    },
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(
      keyword.trim()
        ? `/marketplace?q=${encodeURIComponent(keyword.trim())}`
        : "/marketplace"
    );
  };

  return (
    <MarketplaceShell>
      <main className="lqta-home">
        <section
          className="lqta-hero-wrap pt-3 sm:pt-4"
          data-home-section="hero"
        >
          <div
            className="lqta-hero relative isolate min-h-[500px] overflow-hidden rounded-[1.65rem] bg-[#0b2343] text-white shadow-[0_24px_60px_-34px_rgba(8,30,58,.78)] sm:min-h-[450px] lg:min-h-[460px] 2xl:min-h-[480px]"
            onMouseEnter={() => setPauseSlides(true)}
            onMouseLeave={() => setPauseSlides(false)}
            onFocusCapture={() => setPauseSlides(true)}
            onBlurCapture={event => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null
                )
              )
                setPauseSlides(false);
            }}
          >
            <img
              key={activeHeroSlide.image}
              src={activeHeroSlide.image}
              alt=""
              aria-hidden="true"
              fetchPriority={activeSlide === 0 ? "high" : "auto"}
              loading={activeSlide === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`lqta-hero-image absolute inset-0 h-full w-full object-cover transition-opacity ${activeSlide === 0 ? "" : "animate-in fade-in duration-700"}`}
            />
            <div
              aria-hidden="true"
              className={`absolute inset-0 ${direction === "rtl" ? "bg-gradient-to-l from-[#071d38]/95 via-[#071d38]/78 to-[#071d38]/10" : "bg-gradient-to-r from-[#071d38]/95 via-[#071d38]/78 to-[#071d38]/10"}`}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#071d38]/65 via-transparent to-transparent lg:hidden"
            />
            <div className="relative flex min-h-[500px] items-center px-5 pb-20 pt-8 sm:min-h-[450px] sm:px-9 lg:min-h-[460px] lg:px-10 lg:pb-16 2xl:min-h-[480px]">
              <div
                className={`me-auto w-full max-w-[620px] ${direction === "rtl" ? "text-right" : "text-left"}`}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#102b4d]/70 px-3 py-1.5 text-xs font-extrabold text-[#f6d36f] backdrop-blur-sm">
                  <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-md bg-white p-0.5">
                    <BrandLogo
                      variant="mark"
                      alt=""
                      ariaHidden
                      className="h-full w-full"
                    />
                  </span>
                  {t("home.badge")}
                </span>
                <p className="mt-3">
                  <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold text-[#f8dc88] backdrop-blur-sm">
                    {en
                      ? activeHeroSlide.categoryEn
                      : activeHeroSlide.categoryAr}
                  </span>
                </p>
                <p className="mt-2 text-sm font-black text-white sm:text-base">
                  {en ? activeHeroSlide.sceneEn : activeHeroSlide.sceneAr}
                </p>
                <h1 className="mt-3 text-3xl font-black leading-[1.28] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                  {t("home.headingA")}{" "}
                  <span className="text-[#ffda55]">{t("home.headingB")}</span>
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                  {t("home.description")}
                </p>
                <form
                  onSubmit={submit}
                  className="mt-4 flex max-w-2xl flex-col gap-2 rounded-xl bg-white p-1.5 shadow-xl sm:flex-row"
                >
                  <div className="flex h-11 min-w-0 flex-1 items-center px-2 text-[#0b2343]">
                    <Search className="h-5 w-5 shrink-0 text-[#c89935]" />
                    <input
                      aria-label={t("home.search")}
                      value={keyword}
                      onChange={event => setKeyword(event.target.value)}
                      placeholder={t("home.search")}
                      className="h-full min-w-0 w-full bg-transparent px-3 text-sm outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 shrink-0 rounded-lg bg-[#ffd438] px-6 font-black text-[#102b4d] hover:bg-[#f4c824]"
                  >
                    {t("home.startSearch")}
                  </Button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => setLocation("/marketplace")}
                    variant="outline"
                    className="h-9 border-white/35 bg-[#0b2343]/55 px-4 text-xs font-bold text-white hover:bg-white/10 hover:text-white"
                  >
                    {t("home.browse")}
                    <ArrowIcon className="ms-1 h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={() => setLocation("/seller")}
                    className="h-9 bg-[#ffd438] px-4 text-xs font-black text-[#102b4d] hover:bg-[#f4c824]"
                  >
                    <Store className="me-1.5 h-3.5 w-3.5" />
                    {t("home.sell")}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {en ? "Live listings" : "إعلانات فعلية"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#ffda55]" />
                    {en ? "Protected bidding" : "مزايدات محمية"}
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2 sm:inset-x-5 sm:bottom-4">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#081f3b]/65 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label={en ? "Previous slide" : "الشريحة السابقة"}
                  className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/15"
                >
                  <PreviousSlideIcon className="h-4 w-4" />
                </button>
                <span className="min-w-[3.5rem] text-center text-[10px] font-bold text-white/80">
                  {String(activeSlide + 1).padStart(2, "0")} /{" "}
                  {String(heroSlides.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label={en ? "Next slide" : "الشريحة التالية"}
                  className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/15"
                >
                  <NextSlideIcon className="h-4 w-4" />
                </button>
              </div>
              <div
                className="flex items-center gap-1 rounded-full border border-white/10 bg-[#081f3b]/65 px-2 py-1 backdrop-blur-md"
                role="tablist"
                aria-label={en ? "Marketplace image slides" : "شرائح صور السوق"}
              >
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.categoryEn}
                    type="button"
                    role="tab"
                    aria-selected={activeSlide === index}
                    aria-label={en ? slide.categoryEn : slide.categoryAr}
                    onClick={() => setActiveSlide(index)}
                    className="grid h-7 min-w-7 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd438]"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-2 rounded-full transition-all ${activeSlide === index ? "w-5 bg-[#ffd438]" : "w-2 bg-white/80 hover:bg-white"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {sponsoredAds.isLoading ? (
          <section
            className="container lqta-section !py-7 sm:!py-9"
            data-home-section="sponsored"
          >
            <LoadingPanel label={t("home.loadingListings")} />
          </section>
        ) : sponsoredAds.isError ? (
          <section
            className="container lqta-section !py-7 sm:!py-9"
            data-home-section="sponsored"
          >
            <ErrorPanel onRetry={() => sponsoredAds.refetch()} />
          </section>
        ) : sponsoredAds.data?.length ? (
          <section
            className="border-y border-[#eee5d0] bg-[#fffaf0] dark:border-slate-800 dark:bg-slate-900/30"
            data-home-section="sponsored"
          >
            <div className="container lqta-section !py-7 sm:!py-9">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold text-[#805709] dark:text-amber-300">
                    {en ? "From our partners" : "من شركائنا"}
                  </p>
                  <h2 className="lqta-section-title mt-1 inline-flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-[#805709]" />
                    {en
                      ? "Business & brand offers"
                      : "إعلانات الشركات والمؤسسات"}
                  </h2>
                </div>
                <span className="rounded-full border border-[#e9d7a6] bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#805709] shadow-sm dark:bg-slate-900 dark:text-amber-300">
                  {en ? "Sponsored" : "مساحة إعلانية"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sponsoredAds.data.slice(0, 6).map(ad => (
                  <a
                    key={ad.id}
                    href={ad.targetUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="group grid min-w-0 overflow-hidden rounded-2xl border border-[#ede6d7] bg-white shadow-[0_12px_32px_-27px_rgba(11,35,67,.6)] transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[minmax(130px,.8fr)_minmax(0,1.2fr)] dark:border-slate-700 dark:bg-card"
                  >
                    <div className="relative min-h-32 overflow-hidden bg-slate-100 md:min-h-full">
                      <img
                        src={ad.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute start-2 top-2 rounded-full bg-[#0b2343]/85 px-2 py-1 text-[9px] font-extrabold text-white backdrop-blur">
                        {en ? "Sponsored" : "إعلان ممول"}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5">
                      <p className="truncate text-[10px] font-bold text-[#805709] dark:text-amber-300">
                        {ad.companyName}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-black text-[#0b2343] dark:text-foreground">
                        {ad.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700 dark:text-slate-200">
                        {ad.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#0b2343] group-hover:text-[#805709] dark:text-slate-100">
                        {en ? "Explore offer" : "استكشف العرض"}
                        <ArrowIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section
          className="container lqta-section !pt-8 !pb-9 sm:!pt-10 sm:!pb-12"
          data-home-section="categories"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#805709]">
                {t("home.categoryEyebrow")}
              </p>
              <h2 className="lqta-section-title mt-1">
                {t("home.categoryTitle")}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[#e6d8b3] bg-[#fffaf0] px-3 py-1.5 text-[11px] font-extrabold text-[#805709]">
                {home.data?.categories.length ?? 0}{" "}
                {en ? "categories" : "تصنيفًا"}
              </span>
              <button
                type="button"
                onClick={() => setLocation("/marketplace")}
                className="shrink-0 text-xs font-extrabold text-[#0b2343] transition hover:text-[#805709]"
              >
                {t("home.viewMarket")}
                <ArrowIcon className="ms-1 inline h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {home.isLoading ? (
            <div className="mt-5">
              <LoadingPanel label={t("home.loadingCategories")} />
            </div>
          ) : home.isError || home.data?.sectionErrors?.categories ? (
            <div className="mt-5">
              <ErrorPanel onRetry={() => home.refetch()} />
            </div>
          ) : home.data?.categories.length ? (
            <div className="mt-6 grid auto-rows-[142px] grid-cols-2 gap-3 sm:auto-rows-[160px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {home.data.categories.map((category, index) => {
                const categoryName =
                  en && category.name_en ? category.name_en : category.name;
                const Icon = categoryIcon(category) ?? Tag;
                const categoryImage =
                  category.imageUrl ||
                  (category.icon && /^https?:\/\//i.test(category.icon)
                    ? category.icon
                    : null) ||
                  categoryFallbackImage(
                    `${category.name} ${category.name_en ?? ""}`.toLowerCase()
                  );
                const categoryMark =
                  category.icon && !/^https?:\/\//i.test(category.icon)
                    ? category.icon
                    : null;
                const listingCount = new Intl.NumberFormat(
                  en ? "en-US" : "ar-SA"
                ).format(category.listingCount);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-label={`${categoryName} — ${listingCount} ${en ? "listings" : "إعلان"}`}
                    onClick={() =>
                      setLocation(
                        `/marketplace?category=${encodeURIComponent(category.slug)}`
                      )
                    }
                    className={`group relative isolate min-w-0 overflow-hidden rounded-[1.4rem] border border-white/75 bg-gradient-to-br from-[#244563] to-[#0b2343] text-start shadow-[0_15px_40px_-28px_rgba(11,35,67,.7)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_45px_-25px_rgba(11,35,67,.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f0d98d] active:scale-[.99] ${index === 0 ? "col-span-2 row-span-2" : ""}`}
                  >
                    {categoryImage ? (
                      <img
                        src={categoryImage}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        onError={event => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#071d38]/95 via-[#071d38]/45 to-[#071d38]/10"
                    />
                    <span className="absolute start-3 top-3 rounded-full border border-white/20 bg-[#071d38]/65 px-2.5 py-1 text-[10px] font-extrabold text-white/95 backdrop-blur-sm">
                      {listingCount} {en ? "listings" : "إعلان"}
                    </span>
                    <span className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/15 text-[#ffda55] shadow-sm backdrop-blur-md transition group-hover:bg-[#ffd438] group-hover:text-[#0b2343]">
                      {categoryMark ? (
                        <span className="text-lg" aria-hidden="true">
                          {categoryMark}
                        </span>
                      ) : (
                        <Icon className="h-5 w-5" strokeWidth={1.9} />
                      )}
                    </span>
                    <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2 text-white sm:inset-x-5 sm:bottom-5">
                      <span className="min-w-0">
                        <span className="block line-clamp-2 text-sm font-black leading-6 drop-shadow sm:text-base">
                          {categoryName}
                        </span>
                        <span className="mt-1 block text-[10px] font-semibold text-white/75 sm:text-[11px]">
                          {category.subcategories.length ? (
                            <span className="mt-1 block truncate text-[10px] font-semibold text-white/75 sm:text-[11px]">
                              {category.subcategories
                                .slice(0, 2)
                                .map(subcategory =>
                                  en
                                    ? subcategory.name_en || subcategory.name
                                    : subcategory.name
                                )
                                .join(" · ")}
                              {category.subcategories.length > 2
                                ? ` +${category.subcategories.length - 2}`
                                : ""}
                            </span>
                          ) : (
                            <span className="mt-1 block text-[10px] font-semibold text-white/75 sm:text-[11px]">
                              {en ? "Explore category" : "اكتشف التصنيف"}
                            </span>
                          )}
                        </span>
                      </span>
                      <ArrowIcon className="mb-1 h-4 w-4 shrink-0 text-[#ffda55] transition group-hover:translate-x-[-3px]" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyPanel
                title={t("home.emptyCategories")}
                description={t("home.emptyCategoriesDescription")}
              />
            </div>
          )}
        </section>

        <section className="container lqta-section" data-home-section="latest">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold text-[#805709]">
                {t("home.marketEyebrow")}
              </p>
              <h2 className="lqta-section-title mt-1">
                {t("home.latestTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {t("home.marketDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/marketplace")}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-[#0b2343]"
            >
              {t("home.allListings")}
              <ArrowIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          {home.isLoading ? (
            <div className="mt-5">
              <LoadingPanel label={t("home.loadingListings")} />
            </div>
          ) : home.isError || home.data?.sectionErrors?.latestListings ? (
            <div className="mt-5">
              <ErrorPanel onRetry={() => home.refetch()} />
            </div>
          ) : home.data?.latestListings.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {home.data.latestListings.map(item => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyPanel
                title={t("home.emptyListings")}
                description={t("home.emptyListingsDescription")}
                action={{
                  label: t("home.marketplaceAction"),
                  onClick: () => setLocation("/marketplace"),
                }}
              />
            </div>
          )}
        </section>

        <section
          className="bg-[#f0f3f6] dark:bg-slate-900/40"
          data-home-section="auctions"
        >
          <div className="container lqta-section">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-[#805709]">
                  {t("home.auctionsEyebrow")}
                </p>
                <h2 className="lqta-section-title mt-1 inline-flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-[#c89935]" />
                  {t("home.auctionsTitle")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLocation("/marketplace?type=auction")}
                className="shrink-0 text-xs font-extrabold text-[#0b2343] hover:text-[#805709] dark:text-slate-100"
              >
                {t("home.auctionsAll")}
                <ArrowIcon className="ms-1 inline h-3.5 w-3.5" />
              </button>
            </div>
            {home.isLoading ? (
              <div className="mt-5">
                <LoadingPanel label={t("home.auctionsLoading")} />
              </div>
            ) : home.isError || home.data?.sectionErrors?.activeAuctions ? (
              <div className="mt-5">
                <ErrorPanel onRetry={() => home.refetch()} />
              </div>
            ) : home.data?.activeAuctions.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {home.data.activeAuctions.map(item => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyPanel
                  title={t("home.auctionsEmpty")}
                  description={t("home.auctionsEmptyDescription")}
                  action={{
                    label: t("home.auctionsAll"),
                    onClick: () => setLocation("/marketplace?type=auction"),
                  }}
                />
              </div>
            )}
          </div>
        </section>

        <section
          className="bg-[#eef7f5] dark:bg-emerald-950/10"
          data-home-section="featured"
        >
          <div className="container lqta-section">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#805709]">
                  {t("home.featuredEyebrow")}
                </p>
                <h2 className="lqta-section-title mt-1 inline-flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#c89935]" />
                  {t("home.featuredTitle")}
                </h2>
              </div>
              <p className="max-w-xl text-sm text-slate-700">
                {t("home.featuredDescription")}
              </p>
            </div>
            {home.isLoading ? (
              <div className="mt-5">
                <LoadingPanel label={t("home.loadingListings")} />
              </div>
            ) : home.isError || home.data?.sectionErrors?.featuredListings ? (
              <div className="mt-5">
                <ErrorPanel onRetry={() => home.refetch()} />
              </div>
            ) : home.data?.featuredListings.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {home.data.featuredListings.map(item => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyPanel
                  title={t("home.featuredEmpty")}
                  description={t("home.featuredEmptyDescription")}
                />
              </div>
            )}
          </div>
        </section>

        {isAuthenticated && recentlyViewed.data?.length ? (
          <section className="container lqta-section !pb-4">
            <div>
              <p className="text-xs font-extrabold text-[#805709]">
                {t("home.recentlyViewedEyebrow")}
              </p>
              <h2 className="lqta-section-title mt-1">
                {t("home.recentlyViewedTitle")}
              </h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentlyViewed.data.slice(0, 8).map(item => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="container pb-10 pt-8 sm:pb-14">
          <div className="overflow-hidden rounded-2xl bg-[#0b2343] px-5 py-6 text-white shadow-[0_16px_42px_-30px_rgba(8,30,58,.8)] sm:px-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-[#ffda55]">
                  {t("home.stepsEyebrow")}
                </p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  {t("home.stepsTitle")}
                </h2>
              </div>
              <Sparkles className="hidden h-6 w-6 text-[#ffda55] sm:block" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((item, index) => (
                <article
                  key={item.title}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] p-4 transition hover:bg-white/[.1]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffd438] text-[#0b2343]">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                      {item.text}
                    </p>
                  </div>
                  <span className="ms-auto text-sm font-black text-white/75">
                    0{index + 1}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketplaceShell>
  );
}
