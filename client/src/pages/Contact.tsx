import { ArrowLeft, ArrowRight, MessageCircle, Scale } from "lucide-react";
import { Link } from "wouter";
import BrandLogo from "@/components/marketplace/BrandLogo";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export default function Contact() {
  const { language, t } = useLocale();
  const en = language === "en";
  const ArrowIcon = en ? ArrowRight : ArrowLeft;

  return (
    <MarketplaceShell>
      <main className="container max-w-5xl py-7 sm:py-10">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-card sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
              <BrandLogo
                variant="full"
                alt={en ? "LQTA logo" : "شعار لقطة"}
                className="h-full w-full"
              />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#805709]">
                {t("contact.eyebrow")}
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#0b2343] dark:text-foreground">
                {t("contact.title")}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("contact.intro")}
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff5d8] text-[#a57216]">
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-black text-[#0b2343] dark:text-foreground">
                {t("contact.listingTitle")}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("contact.listingDescription")}
              </p>
              <Button
                asChild
                className="mt-5 w-full bg-[#0b2343] font-bold hover:bg-[#163961] sm:w-auto"
              >
                <Link href="/marketplace">
                  {t("contact.browseAction")}
                  <ArrowIcon className="ms-2 h-4 w-4" />
                </Link>
              </Button>
            </article>

            <article className="flex flex-col rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff5d8] text-[#a57216]">
                <Scale aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-black text-[#0b2343] dark:text-foreground">
                {t("contact.orderTitle")}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("contact.orderDescription")}
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-5 w-full border-[#d7e0e9] font-bold text-[#0b2343] sm:w-auto dark:text-foreground"
              >
                <Link href="/disputes">
                  {t("contact.disputeAction")}
                  <ArrowIcon className="ms-2 h-4 w-4" />
                </Link>
              </Button>
            </article>
          </div>

          <aside
            className="mt-5 rounded-2xl border border-[#eadcae] bg-[#fffaf0] p-5"
            role="note"
          >
            <h2 className="font-black text-[#0b2343]">
              {t("contact.channelsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {t("contact.channelsDescription")}
            </p>
          </aside>
        </section>
      </main>
    </MarketplaceShell>
  );
}
