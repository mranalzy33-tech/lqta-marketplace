import { useEffect, useState } from "react";
import { Clock3, Gavel, Heart, ImageOff, MapPin, Tag, Timer, Users } from "lucide-react";
import { Link } from "wouter";
import { useLocale, type Language } from "@/contexts/LocaleContext";
import { formatCurrency } from "../../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export type ListingCardItem = {
  id: string;
  title: string;
  type: "fixed" | "auction";
  status: string;
  price: number | null;
  auctionEndTime: string | null;
  bidCount?: number;
  imageUrl: string | null;
  category: { id: string; name: string; nameEn?: string | null; slug: string } | null;
  source: "internal" | "external";
  createdAt: string;
};

export function formatPrice(value: number | null, language: Language = "ar") {
  if (value === null || Number.isNaN(value)) return language === "en" ? "Price on request" : "السعر عند الطلب";
  return formatCurrency(value, language);
}

export function timeRemaining(endTime: string | null, language: Language = "ar", now = Date.now()) {
  if (!endTime) return null;
  const difference = new Date(endTime).getTime() - now;
  if (difference <= 0) return language === "en" ? "Ended" : "منتهٍ";
  const days = Math.floor(difference / 86_400_000);
  const hours = Math.floor((difference % 86_400_000) / 3_600_000);
  const minutes = Math.floor((difference % 3_600_000) / 60_000);
  const seconds = Math.floor((difference % 60_000) / 1_000);
  if (language === "en") return days ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;
  return days ? `${days} يوم ${hours} س` : `${hours} س ${minutes} د ${seconds} ث`;
}

export default function ListingCard({ listing, compact = false }: { listing: ListingCardItem; compact?: boolean }) {
  const { language, t } = useLocale();
  const isAuction = listing.type === "auction";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isAuction || !listing.auctionEndTime) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isAuction, listing.auctionEndTime]);
  const remaining = timeRemaining(listing.auctionEndTime, language, now);
  const auctionEnded = isAuction && Boolean(listing.auctionEndTime) && new Date(listing.auctionEndTime!).getTime() <= now;
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const favorites = trpc.account.favorites.useQuery(undefined, { enabled: Boolean(user) });
  const favorite = trpc.account.toggleFavorite.useMutation({
    onMutate: async () => {
      await utils.account.favorites.cancel();
      const previous = utils.account.favorites.getData();
      utils.account.favorites.setData(undefined, current => {
        const items = current ?? [];
        const exists = items.some(item => item.id === listing.id);
        return exists ? items.filter(item => item.id !== listing.id) : [...items, listing as never];
      });
      return { previous };
    },
    onError: (error, _input, context) => { utils.account.favorites.setData(undefined, context?.previous); toast.error(error.message); },
    onSettled: () => utils.account.favorites.invalidate(),
  });
  const isFavorite = Boolean(favorites.data?.some(item => item.id === listing.id));
  const text = {
    auction: t("listingCard.auction"),
    fixed: t("listingCard.fixed"),
    featured: t("listingCard.featured"),
    external: t("listingCard.external"),
    currentPrice: t("listingCard.currentPrice"),
    price: t("listingCard.price"),
    details: t("listingCard.details"),
    negotiating: language === "en" ? "Under negotiation" : "قيد التفاوض",
    bidCount: language === "en" ? "bids" : "مزايدة",
    ended: language === "en" ? "Auction ended" : "انتهى المزاد",
    live: language === "en" ? "Live auction" : "مزاد نشط",
  };
  const categoryName = language === "en" ? listing.category?.nameEn || listing.category?.name : listing.category?.name;

  return (
    <Link href={`/listing/${listing.id}`} className="group block h-full min-w-0">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e4e9ee] bg-white shadow-[0_10px_28px_-22px_rgba(8,30,58,0.55)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-22px_rgba(8,30,58,0.48)] dark:bg-card">
        <div className={`relative overflow-hidden bg-[#edf2f6] ${compact ? "aspect-[1.65/1]" : "aspect-[1.7/1]"}`}>
          {listing.imageUrl ? <img src={listing.imageUrl} alt={listing.title} className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${listing.status === "negotiating" ? "grayscale-[35%]" : ""}`} loading="lazy" /> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_40%_30%,#fff_0,#e8eef3_38%,#d9e2eb_100%)] text-slate-600"><ImageOff className="h-8 w-8" /></div>}
          {user ? <button type="button" aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} onClick={event => { event.preventDefault(); event.stopPropagation(); favorite.mutate({ listingId: listing.id }); }} className={`absolute start-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${isFavorite ? "text-rose-600" : "text-slate-500"}`}><Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} /></button> : null}
          <div className="absolute end-3 top-3 flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${isAuction ? "bg-[#0b2343] text-white" : "bg-[#f6ca64] text-[#26384c]"}`}>{isAuction ? <Gavel className="h-3 w-3" /> : <Tag className="h-3 w-3" />}{isAuction ? text.auction : text.fixed}</span>
            {listing.status === "negotiating" ? <span className="rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">{text.negotiating}</span> : null}
          </div>
          {isAuction && remaining ? <span className={`absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${auctionEnded ? "bg-red-50 text-red-700" : "bg-white/95 text-[#0b2343]"}`}><Clock3 className={`h-3.5 w-3.5 ${auctionEnded ? "text-red-600" : "text-[#b87f1c]"}`} />{remaining}</span> : null}
          {isAuction && !auctionEnded && listing.status === "active" ? <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full bg-emerald-50/95 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 shadow-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{text.live}</span> : null}
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <div className="mb-2 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#c89935]" /><span className="truncate">{categoryName || text.featured}</span>{listing.source === "external" ? <span className="ms-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{text.external}</span> : null}</div>
          <h3 className="line-clamp-2 min-h-12 text-[15px] font-bold leading-6 text-[#102b4d] dark:text-foreground">{listing.title}</h3>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
            <div className="min-w-0"><span className="block text-[11px] text-slate-600">{isAuction ? text.currentPrice : text.price}</span><strong className="mt-0.5 block truncate text-base text-[#0b2343] dark:text-foreground">{formatPrice(listing.price, language)}</strong></div>
            {isAuction ? <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f9] px-2 py-1.5 text-[11px] font-semibold text-[#546477]"><Users className="h-3.5 w-3.5" />{listing.bidCount ?? 0} {text.bidCount}</span> : <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f9] px-2.5 py-1.5 text-[11px] font-semibold text-[#546477] group-hover:bg-[#edf2f5]"><Timer className="h-3.5 w-3.5" />{text.details}</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}
