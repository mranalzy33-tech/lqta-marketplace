import { Heart } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import ListingCard from "@/components/marketplace/ListingCard";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";

export default function Favorites() {
  const { t } = useLocale();
  const favorites = trpc.account.favorites.useQuery();

  return (
    <MarketplaceDashboardLayout eyebrow={t("nav.account")} title={t("common.favorites")}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{t("favorites.description")}</p>
        <Heart className="h-5 w-5 text-[#c89935]" />
      </div>

      {favorites.isLoading ? (
        <div className="mt-6"><LoadingPanel label={t("favorites.loading")} /></div>
      ) : favorites.isError ? (
        <div className="mt-6"><ErrorPanel onRetry={() => favorites.refetch()} /></div>
      ) : favorites.data?.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.data.map(item => <ListingCard key={item.id} listing={item} />)}
        </div>
      ) : (
        <div className="mt-6"><EmptyPanel title={t("favorites.emptyTitle")} description={t("favorites.emptyDescription")} /></div>
      )}
    </MarketplaceDashboardLayout>
  );
}
