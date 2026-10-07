import {
  ArrowRight,
  Gavel,
  Heart,
  ImageOff,
  MessageCircle,
  ShieldCheck,
  UserRound,
  ShoppingCart,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import {
  formatPrice,
  timeRemaining,
} from "@/components/marketplace/ListingCard";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import ListingCard from "@/components/marketplace/ListingCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ListingDetails() {
  const [, params] = useRoute("/listing/:id");
  const id = params?.id ?? "00000000-0000-0000-0000-000000000000";
  const details = trpc.marketplace.details.useQuery({ id });
  const related = trpc.marketplace.browse.useQuery(
    {
      categorySlug: details.data?.category?.slug ?? "",
      subcategorySlug: details.data?.subcategory?.slug,
      page: 1,
      pageSize: 8,
    },
    { enabled: Boolean(details.data?.category?.slug), staleTime: 30_000 }
  );
  const { isAuthenticated } = useAuth();
  const { language, t } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [realtimeState, setRealtimeState] = useState<
    "connecting" | "live" | "error"
  >("connecting");
  useEffect(() => {
    if (details.data?.type !== "auction") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [details.data?.type]);
  useEffect(() => {
    if (!details.data) return;
    const brand = language === "en" ? "LQTA" : "لقطة";
    const title = `${details.data.title} | ${brand}`;
    const description = details.data.description
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    document.title = title;
    const setMeta = (
      selector: string,
      content: string,
      property: string,
      value: string
    ) => {
      const meta =
        document.querySelector<HTMLMetaElement>(selector) ??
        document.head.appendChild(
          Object.assign(document.createElement("meta"), { [property]: value })
        );
      meta.content = content;
    };
    setMeta('meta[name="description"]', description, "name", "description");
    setMeta('meta[property="og:title"]', title, "property", "og:title");
    setMeta(
      'meta[property="og:description"]',
      description,
      "property",
      "og:description"
    );
    setMeta('meta[property="og:type"]', "product", "property", "og:type");
    if (details.data.imageUrls[0])
      setMeta(
        'meta[property="og:image"]',
        details.data.imageUrls[0],
        "property",
        "og:image"
      );
    setMeta(
      'meta[property="og:url"]',
      `${window.location.origin}/listing/${encodeURIComponent(id)}`,
      "property",
      "og:url"
    );
    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("link"), { rel: "canonical" })
      );
    canonical.href = `${window.location.origin}/listing/${encodeURIComponent(id)}`;
  }, [details.data, id, language]);
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const auctionEndReached =
    details.data?.type === "auction" &&
    Boolean(details.data.auctionEndTime) &&
    new Date(details.data.auctionEndTime!).getTime() <= now;
  useEffect(() => {
    if (!auctionEndReached || details.data?.status !== "active") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void details.refetch();
      if (attempts >= 12) window.clearInterval(timer);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [auctionEndReached, details.data?.status, details.refetch]);
  useEffect(() => {
    if (details.data?.type !== "auction") return;
    const channel = supabase
      .channel(`listing-bids:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${id}`,
        },
        () => {
          void details.refetch();
        }
      )
      .subscribe(status => {
        setRealtimeState(
          status === "SUBSCRIBED"
            ? "live"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "error"
              : "connecting"
        );
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [details.data?.type, details.refetch, id]);
  const favorites = trpc.account.favorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const favorite = trpc.account.toggleFavorite.useMutation({
    onMutate: async ({ listingId }) => {
      await utils.account.favorites.cancel();
      const previous = utils.account.favorites.getData();
      utils.account.favorites.setData(undefined, current => {
        const items = current ?? [];
        const exists = items.some(item => item.id === listingId);
        return exists ? items.filter(item => item.id !== listingId) : items;
      });
      return { previous };
    },
    onError: (error, _input, context) => {
      utils.account.favorites.setData(undefined, context?.previous);
      toast.error(error.message);
    },
    onSettled: () => utils.account.favorites.invalidate(),
  });
  const bid = trpc.marketplace.placeBid.useMutation({
    onSuccess: result => {
      toast.success(
        `${t("listing.bidRecorded")} ${formatPrice(result.currentPrice, language)}`
      );
      setAmount("");
      details.refetch();
      // Bidding creates/releases fund_holds, which change the "held" and
      // "available" figures on the Wallet page without touching the raw
      // wallet_balance — invalidate both places that read wallet state.
      utils.wallet.balance.invalidate();
      utils.seller.workspace.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cart = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success(t("listing.cartAdded"));
      utils.cart.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reviews = trpc.reviews.forUser.useQuery({
    userId: details.data?.seller.id ?? "00000000-0000-0000-0000-000000000000",
  });
  const offer = trpc.marketplace.createOffer.useMutation({
    onSuccess: () => {
      toast.success(t("listing.offerSent"));
      setAmount("");
      setMessage("");
      details.refetch();
      utils.account.notifications.invalidate();
      utils.wallet.balance.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (details.isLoading) {
    return (
      <MarketplaceShell>
        <main className="container py-10">
          <LoadingPanel label={t("listing.loading")} />
        </main>
      </MarketplaceShell>
    );
  }

  if (details.isError) {
    return (
      <MarketplaceShell>
        <main className="container py-10">
          <ErrorPanel onRetry={() => details.refetch()} />
        </main>
      </MarketplaceShell>
    );
  }

  if (!details.data) {
    return (
      <MarketplaceShell>
        <main className="container py-10">
          <EmptyPanel
            title={t("listing.unavailableTitle")}
            description={t("listing.unavailableDescription")}
          />
        </main>
      </MarketplaceShell>
    );
  }

  const listing = details.data;
  const similarListings = (related.data?.items ?? [])
    .filter(item => item.id !== listing.id)
    .slice(0, 4);
  const auction = listing.type === "auction";
  const frozen = listing.status === "negotiating";
  const auctionFinalized =
    auction && (listing.status === "sold" || listing.status === "expired");
  const auctionEnded = auction && (auctionFinalized || auctionEndReached);
  const minimumNextBid = auction
    ? (listing.currentPrice ?? listing.startingPrice ?? 0) +
      listing.minimumBidIncrement
    : 0;
  const remaining = timeRemaining(listing.auctionEndTime, language, now);
  const isFavorite = Boolean(
    favorites.data?.some(item => item.id === listing.id)
  );
  const favoriteAction = () =>
    isAuthenticated ? favorite.mutate({ listingId: listing.id }) : startLogin();
  const contactSeller = () => {
    if (!isAuthenticated) return startLogin();
    window.location.assign(
      `/messages?listing=${listing.id}&recipient=${listing.seller.id}`
    );
  };
  const addCart = () => {
    if (!isAuthenticated) return startLogin();
    if (frozen)
      return toast.error(
        language === "en"
          ? "This product is under negotiation"
          : "هذا المنتج قيد التفاوض حالياً"
      );
    cart.mutate({ listingId: listing.id });
  };
  const submitCommerceAction = () => {
    if (!isAuthenticated) return startLogin();
    if (frozen)
      return toast.error(
        language === "en"
          ? "Offers and purchases are temporarily disabled"
          : "العروض والشراء متوقفان مؤقتاً لهذا المنتج"
      );
    if (auction && auctionEnded) return toast.error(t("listing.auctionEnded"));
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return toast.error(t("listing.invalidAmount"));
    if (auction) bid.mutate({ listingId: listing.id, amount: numericAmount });
    else
      offer.mutate({
        listingId: listing.id,
        amount: numericAmount,
        message: message || undefined,
      });
  };

  return (
    <MarketplaceShell>
      <main className="container py-6 sm:py-8">
        <a
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-[#0b2343]"
        >
          <ArrowRight className="h-4 w-4" /> {t("listing.back")}
        </a>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.75fr)] lg:gap-6">
          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_44px_-36px_rgba(11,35,67,.6)] dark:bg-card">
              <div className="grid aspect-[4/3] max-h-[640px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#fff_0,#f6f8fa_60%,#e8edf2_100%)] sm:aspect-[1.45/1]">
                {listing.imageUrls[0] ? (
                  <img
                    src={listing.imageUrls[0]}
                    alt={listing.title}
                    width={960}
                    height={710}
                    className="h-full w-full object-contain p-3 sm:p-5"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-400">
                    <ImageOff className="h-10 w-10" />
                  </div>
                )}
              </div>
              {listing.imageUrls.length > 1 ? (
                <div className="flex gap-2 overflow-auto border-t border-slate-100 bg-white p-3 dark:bg-card">
                  {listing.imageUrls.map((url, index) => (
                    <img
                      key={url}
                      src={url}
                      alt={`${listing.title} ${index + 1}`}
                      width={80}
                      height={64}
                      className="h-16 w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${auction ? "bg-[#0b2343] text-white" : "bg-[#f8e1a0] text-[#0b2343]"}`}
                >
                  {auction ? t("listing.auctionType") : t("listing.fixedType")}
                </span>
                {listing.category ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {language === "en"
                      ? listing.category.nameEn || listing.category.name
                      : listing.category.name}
                  </span>
                ) : null}
                {frozen ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    {language === "en" ? "Under negotiation" : "قيد التفاوض"}
                  </span>
                ) : null}
                {auctionEnded ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {t("listing.auctionEnded")}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-[#0b2343] sm:text-3xl">
                {listing.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span>
                  {language === "en" ? "Listed" : "تاريخ الإضافة"}:{" "}
                  {new Date(listing.createdAt).toLocaleDateString(
                    language === "en" ? "en-US" : "ar-SA"
                  )}
                </span>
                {listing.source === "external" ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold">
                    {language === "en" ? "External listing" : "إعلان خارجي"}
                  </span>
                ) : null}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-black text-[#0b2343]">
                  {language === "en" ? "Product details" : "تفاصيل المنتج"}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-slate-600">
                  {listing.description}
                </p>
              </div>
              {auction ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black text-[#0b2343]">
                      {language === "en" ? "Recent bids" : "آخر المزايدات"}
                    </h2>
                    <span
                      className={`text-xs font-bold ${realtimeState === "live" ? "text-emerald-700" : realtimeState === "error" ? "text-rose-700" : "text-slate-500"}`}
                    >
                      {realtimeState === "live"
                        ? language === "en"
                          ? "Live"
                          : "مباشر"
                        : realtimeState === "error"
                          ? language === "en"
                            ? "Connection error"
                            : "خطأ في الاتصال"
                          : language === "en"
                            ? "Connecting…"
                            : "جارٍ الاتصال…"}
                    </span>
                  </div>
                  {listing.bids.length ? (
                    <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {listing.bids.slice(0, 8).map(bidRow => (
                        <div
                          key={bidRow.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-bold text-[#0b2343]">
                              {bidRow.bidderName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(bidRow.createdAt).toLocaleString(
                                language === "en" ? "en-US" : "ar-SA"
                              )}
                            </p>
                          </div>
                          <span className="font-black text-[#b87f1c]">
                            {formatPrice(bidRow.amount, language)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      {language === "en"
                        ? "No bids yet"
                        : "لا توجد مزايدات بعد"}
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          </section>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
            <section className="rounded-2xl border border-[#1c3a5c] bg-gradient-to-br from-[#102d50] to-[#081f3b] p-5 text-white shadow-[0_20px_45px_-28px_rgba(8,31,59,.55)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-300">
                    {auction
                      ? t("listing.currentPrice")
                      : t("listing.listedPrice")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#f7d67f] sm:text-4xl">
                    {formatPrice(listing.price, language)}
                  </p>
                  {auction && !auctionEnded ? (
                    <p className="mt-2 text-xs font-semibold text-white/80">
                      {t("listing.minimumNextBid")}:{" "}
                      <strong className="text-[#f7d67f]">
                        {formatPrice(minimumNextBid, language)}
                      </strong>
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${auction ? "bg-white/10 text-[#f7d67f]" : "bg-emerald-400/15 text-emerald-200"}`}
                >
                  {auction ? t("listing.auctionType") : t("listing.fixedType")}
                </span>
              </div>
              {auction && !auctionEnded && remaining ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                  <Gavel className="h-4 w-4 text-[#f7d67f]" />{" "}
                  {t("listing.endsIn")} {remaining}
                </p>
              ) : null}
              {auctionEnded ? (
                <p
                  role="status"
                  className={`mt-4 rounded-xl border px-3 py-2.5 text-sm font-bold leading-6 ${auctionFinalized ? "border-white/15 bg-white/10 text-white" : "border-[#f7d67f]/30 bg-[#f7d67f]/10 text-[#ffdf8b]"}`}
                >
                  {auctionFinalized
                    ? listing.viewerWonAuction
                      ? t("listing.youWonAuction")
                      : listing.auctionHasWinner
                        ? t("listing.auctionWinner")
                        : t("listing.auctionNoWinner")
                    : t("listing.auctionFinalizing")}
                </p>
              ) : null}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-bold text-slate-200">
                  {auction ? t("listing.bidAmount") : t("listing.offerAmount")}
                </label>
                <input
                  inputMode="decimal"
                  min={auction ? minimumNextBid : undefined}
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  disabled={frozen || (auction && auctionEnded)}
                  placeholder={
                    auction
                      ? String(minimumNextBid)
                      : t("listing.amountExample")
                  }
                  className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#f7d67f]"
                />
                {!auction ? (
                  <textarea
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    disabled={frozen}
                    maxLength={500}
                    placeholder={t("listing.sellerMessage")}
                    className="min-h-20 w-full rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#f7d67f]"
                  />
                ) : null}
              </div>
              {!auction ? (
                <Button
                  onClick={addCart}
                  disabled={frozen || cart.isPending}
                  variant="outline"
                  className="mt-3 w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <ShoppingCart className="me-2 h-4 w-4" />
                  {cart.isPending
                    ? t("listing.addingToCart")
                    : t("listing.addToCart")}
                </Button>
              ) : null}
              <Button
                onClick={submitCommerceAction}
                disabled={
                  frozen ||
                  bid.isPending ||
                  offer.isPending ||
                  (auction && auctionEnded)
                }
                className="mt-3 w-full bg-[#c89935] text-[#0b2343] hover:bg-[#b98628]"
              >
                {auction && auctionEnded
                  ? t("listing.auctionEnded")
                  : frozen
                    ? language === "en"
                      ? "Under negotiation"
                      : "قيد التفاوض"
                    : bid.isPending || offer.isPending
                      ? t("listing.sending")
                      : auction
                        ? t("listing.confirmBid")
                        : t("listing.sendOffer")}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                {t("listing.noFinancialSimulation")}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f5f7] text-[#0b2343]">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-[#0b2343]">
                    {listing.seller.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("listing.rating")}{" "}
                    {listing.seller.ratingAverage.toFixed(1)}{" "}
                    {t("listing.outOf")} {listing.seller.ratingCount}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={favoriteAction}
                  disabled={favorite.isPending}
                  className={`border-slate-200 ${isFavorite ? "text-rose-600" : "text-slate-600"}`}
                >
                  <Heart
                    className={`me-2 h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
                  />{" "}
                  {isFavorite
                    ? language === "en"
                      ? "Remove from favorites"
                      : "إزالة من المفضلة"
                    : t("listing.favorite")}
                </Button>
                <Button
                  variant="outline"
                  onClick={contactSeller}
                  className="border-slate-200"
                >
                  <MessageCircle className="me-2 h-4 w-4" />{" "}
                  {t("listing.message")}
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-card">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#c89935]" />
                <h3 className="font-black text-[#0b2343]">
                  {t("listing.sellerReviews")}
                </h3>
              </div>
              {reviews.isLoading ? (
                <p className="mt-3 text-sm text-slate-500">
                  {t("listing.loadingReviews")}
                </p>
              ) : reviews.data?.length ? (
                <div className="mt-3 space-y-3">
                  {reviews.data.slice(0, 5).map(review => (
                    <div key={review.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="font-bold text-[#b87f1c]">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </p>
                      {review.comment ? (
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {review.comment}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {t("listing.noReviewsYet")}
                </p>
              )}
            </section>

            <div className="flex gap-2 rounded-xl border border-[#eedca8] bg-[#fffbef] p-4 text-xs leading-6 text-[#72531f]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#bd861e]" />
              {t("listing.securityNote")}
            </div>
          </aside>
        </div>
        {related.isLoading || similarListings.length > 0 ? (
          <section className="mt-10 border-t border-slate-200 pt-7 sm:mt-12 sm:pt-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-[#b87f1c]">
                  {language === "en" ? "More to explore" : "اكتشف المزيد"}
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#0b2343] sm:text-2xl">
                  {language === "en" ? "Similar listings" : "منتجات مشابهة"}
                </h2>
              </div>
              {listing.category ? (
                <a
                  href={`/marketplace?category=${encodeURIComponent(listing.category.slug)}`}
                  className="shrink-0 text-xs font-bold text-[#0b2343] hover:text-[#b87f1c]"
                >
                  {language === "en" ? "See category" : "عرض التصنيف"}
                  <ArrowRight className="ms-1 inline h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            {related.isLoading ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="aspect-[1.7/1] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {similarListings.map(item => (
                  <ListingCard key={item.id} listing={item} compact />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </MarketplaceShell>
  );
}
