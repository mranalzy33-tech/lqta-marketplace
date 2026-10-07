import {
  ArrowLeft,
  ArrowRight,
  Gavel,
  Heart,
  Search,
  Store,
} from "lucide-react";
import { Link } from "wouter";
import BrandLogo from "@/components/marketplace/BrandLogo";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export default function About() {
  const { language, t } = useLocale();
  const en = language === "en";
  const ArrowIcon = en ? ArrowRight : ArrowLeft;
  const services = [
    {
      icon: Search,
      title: t("about.discoveryTitle"),
      text: t("about.discoveryText"),
    },
    {
      icon: Store,
      title: t("about.sellingTitle"),
      text: t("about.sellingText"),
    },
    {
      icon: Gavel,
      title: t("about.auctionsTitle"),
      text: t("about.auctionsText"),
    },
    { icon: Heart, title: t("about.savedTitle"), text: t("about.savedText") },
  ];

  return (
    <MarketplaceShell>
      <main className="container max-w-6xl py-7 sm:py-10">
        <section className="grid gap-8 overflow-hidden rounded-[1.75rem] bg-[#0b2343] p-6 text-white shadow-[0_24px_60px_-34px_rgba(8,30,58,.78)] sm:p-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,.8fr)] lg:items-center lg:p-12">
          <div className={en ? "text-left" : "text-right"}>
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#ffda55]">
              {t("about.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {t("about.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200 sm:text-base">
              {t("about.intro")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                className="bg-[#ffd438] font-black text-[#102b4d] hover:bg-[#f4c824]"
              >
                <Link href="/marketplace">
                  {t("about.browseAction")}
                  <ArrowIcon className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 bg-white/5 font-bold text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/seller">{t("about.sellAction")}</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <span className="grid h-48 w-40 place-items-center overflow-hidden rounded-3xl bg-white p-3 shadow-xl sm:h-56 sm:w-48">
              <BrandLogo
                variant="full"
                alt={en ? "Official LQTA logo" : "شعار لقطة الرسمي"}
                className="h-full w-full"
              />
            </span>
          </div>
        </section>

        <section className="lqta-section !pb-5">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold text-[#805709]">
              {t("about.servicesEyebrow")}
            </p>
            <h2 className="lqta-section-title mt-1">
              {t("about.servicesTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {t("about.servicesDescription")}
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff5d8] text-[#a57216]">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-black text-[#0b2343] dark:text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#eadcae] bg-[#fffaf0] p-5 sm:p-7">
          <h2 className="text-xl font-black text-[#0b2343]">
            {t("about.howTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
            {t("about.howDescription")}
          </p>
        </section>
      </main>
    </MarketplaceShell>
  );
}
