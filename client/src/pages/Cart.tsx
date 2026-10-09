import { ShoppingCart, Trash2 } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from "@/components/marketplace/StatePanels";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency } from "../../../shared/currency";
import { toast } from "sonner";

export default function Cart() {
  const { language, t } = useLocale();
  const cart = trpc.cart.list.useQuery();
  const utils = trpc.useUtils();

  const checkout = trpc.cart.checkout.useMutation({
    onSuccess: result => {
      toast.success(`${t("cart.orderCreated")}${result.orderId ?? ""}`);
      utils.cart.list.invalidate();
      // Checkout deducts from the same wallet_balance the Wallet page and
      // seller workspace display — without this they'd show a stale
      // (pre-purchase) balance until an unrelated refetch happened to occur.
      utils.wallet.balance.invalidate();
      utils.seller.workspace.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.cart.remove.useMutation({
    onSuccess: () => {
      toast.success(t("cart.removed"));
      utils.cart.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (cart.isLoading) {
    return (
      <MarketplaceDashboardLayout
        eyebrow={t("cart.eyebrow")}
        title={t("cart.title")}
      >
        <LoadingPanel label={t("cart.loading")} />
      </MarketplaceDashboardLayout>
    );
  }

  if (cart.isError) {
    return (
      <MarketplaceDashboardLayout
        eyebrow={t("cart.eyebrow")}
        title={t("cart.title")}
      >
        <ErrorPanel onRetry={() => cart.refetch()} />
      </MarketplaceDashboardLayout>
    );
  }

  const items = cart.data ?? [];

  return (
    <MarketplaceDashboardLayout
      eyebrow={t("cart.eyebrow")}
      title={t("cart.title")}
    >
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-[#b87f1c]" />
        <p className="text-sm text-slate-500">{t("cart.directPurchaseNote")}</p>
      </div>
      {!items.length ? (
        <div className="mt-6">
          <EmptyPanel
            title={t("cart.emptyTitle")}
            description={t("cart.emptyDescription")}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map(item => (
            <article
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
                {item.listings?.listing_images?.[0]?.image_url ? (
                  <img
                    src={item.listings.listing_images[0].image_url}
                    alt={item.listings.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-[#0b2343]">
                  {item.listings?.title}
                </h2>
                <p className="mt-1 font-bold text-[#b87f1c]">
                  {formatCurrency(
                    Number(item.listings?.fixed_price ?? 0),
                    language
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={remove.isPending || checkout.isPending}
                  onClick={() => remove.mutate({ listingId: item.listing_id })}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {remove.isPending ? t("cart.removing") : t("cart.remove")}
                </Button>
                <Button
                  disabled={
                    checkout.isPending ||
                    remove.isPending ||
                    item.listings?.status !== "active"
                  }
                  onClick={() =>
                    checkout.mutate({ listingId: item.listing_id })
                  }
                  className="bg-[#0b2343]"
                >
                  {t("cart.completePurchase")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </MarketplaceDashboardLayout>
  );
}
