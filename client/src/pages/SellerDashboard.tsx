import {
  ArrowRight,
  Gavel,
  ListChecks,
  Plus,
  Store,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { getListingDraftError } from "@/lib/listingDraft";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCurrency, getNumberLocale } from "../../../shared/currency";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

function localDateTimeAfter(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gavel;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(11,35,67,.65)] transition hover:-translate-y-0.5 hover:shadow-md dark:bg-card">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-3xl font-black text-[#0b2343]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default function SellerDashboard() {
  const { language, t } = useLocale();
  const numberLocale = getNumberLocale(language);
  const listingStatus: Record<string, string> = {
    pending: t("seller.statusPending"),
    active: t("seller.statusActive"),
    negotiating: language === "en" ? "Under negotiation" : "قيد التفاوض",
    sold: t("seller.statusSold"),
    rejected: t("seller.statusRejected"),
    expired: t("seller.statusExpired"),
  };
  const transactionType: Record<string, string> = {
    deposit: t("seller.txDeposit"),
    withdraw: t("seller.txWithdraw"),
    purchase: t("seller.txPurchase"),
    sale: t("seller.txSale"),
  };
  const transactionStatus: Record<string, string> = {
    pending: language === "en" ? "Pending" : "قيد الانتظار",
    completed: language === "en" ? "Completed" : "مكتملة",
    failed: language === "en" ? "Failed" : "فشلت",
  };
  const offerStatus: Record<string, string> = {
    pending: language === "en" ? "Pending" : "قيد الانتظار",
    accepted: language === "en" ? "Accepted" : "مقبول",
    rejected: language === "en" ? "Rejected" : "مرفوض",
  };
  const deliveryStatus: Record<string, string> = {
    pending: language === "en" ? "Pending delivery" : "بانتظار التسليم",
    shipped: language === "en" ? "Shipped" : "تم الشحن",
    delivered: language === "en" ? "Delivered" : "تم التسليم",
    cancelled: language === "en" ? "Cancelled" : "ملغاة",
  };
  const { user, loading: authLoading } = useAuth();
  const isSeller = Boolean(user?.isSeller || user?.role === "super_admin");
  const overview = trpc.seller.overview.useQuery(undefined, {
    enabled: isSeller,
  });
  const workspace = trpc.seller.workspace.useQuery(undefined, {
    enabled: isSeller,
  });
  const offers = trpc.marketplace.sellerOffers.useQuery(undefined, {
    enabled: isSeller,
  });
  const respondToOffer = trpc.marketplace.respondToOffer.useMutation({
    onSuccess: () => {
      offers.refetch();
      utils.account.notifications.invalidate();
      utils.seller.workspace.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const categories = trpc.marketplace.categories.useQuery(
    { limit: 50 },
    { enabled: isSeller }
  );
  const utils = trpc.useUtils();
  const becomeSeller = trpc.account.becomeSeller.useMutation({
    onSuccess: () => {
      toast.success(t("seller.onboardingSuccess"));
      utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const convertToAuction = trpc.seller.convertToAuction.useMutation({
    onSuccess: () => {
      toast.success(t("seller.convertSuccess"));
      setConversionStep(null);
      setConversionListing(null);
      utils.seller.workspace.invalidate();
      utils.seller.overview.invalidate();
      utils.marketplace.home.invalidate();
      utils.marketplace.browse.invalidate();
      utils.marketplace.details.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const [type, setType] = useState<"fixed" | "auction">("fixed");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [minimumBidIncrement, setMinimumBidIncrement] = useState("10");
  const [auctionEndTime, setAuctionEndTime] = useState("");
  const [source, setSource] = useState<"internal" | "external">("internal");
  const [externalMarketName, setExternalMarketName] = useState("");
  const [externalListingUrl, setExternalListingUrl] = useState("");
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [numberErrors, setNumberErrors] = useState<{
    fixedPrice?: string;
    startingPrice?: string;
  }>({});
  const [publishFeedback, setPublishFeedback] = useState("");
  const [conversionStep, setConversionStep] = useState<
    "confirm" | "settings" | null
  >(null);
  const [conversionListing, setConversionListing] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [conversionStartingPrice, setConversionStartingPrice] = useState("");
  const [conversionMinimumIncrement, setConversionMinimumIncrement] =
    useState("10");
  const [conversionDuration, setConversionDuration] = useState("3");
  const [conversionEndAt, setConversionEndAt] = useState(() =>
    localDateTimeAfter(3)
  );
  const [conversionError, setConversionError] = useState("");

  const normalizeDigits = (value: string) =>
    value
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
      .replace(/[^\d]/g, "");

  const updateNumberError = (
    field: "fixedPrice" | "startingPrice",
    message?: string
  ) => {
    setNumberErrors(current => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };
  useEffect(() => {
    if (!categoryId && categories.data?.[0]?.id)
      setCategoryId(categories.data[0].id);
  }, [categories.data, categoryId]);
  const selectedCategory = categories.data?.find(
    category => category.id === categoryId
  );
  const selectedSubcategories = selectedCategory?.subcategories ?? [];
  const uploadImage = trpc.seller.uploadImage.useMutation({
    onError: error => toast.error(error.message),
  });
  const createListing = trpc.seller.createListing.useMutation({
    onSuccess: async listing => {
      try {
        if (imageDataUrls.length)
          await Promise.all(
            imageDataUrls.map(dataUrl =>
              uploadImage.mutateAsync({ listingId: listing.id, dataUrl })
            )
          );
        const message = imageDataUrls.length
          ? t("seller.listingSentWithImages")
          : t("seller.listingSent");
        setPublishFeedback(message);
        toast.success(message);
        setTitle("");
        setDescription("");
        setFixedPrice("");
        setStartingPrice("");
        setMinimumBidIncrement("10");
        setAuctionEndTime("");
        setExternalMarketName("");
        setExternalListingUrl("");
        setSource("internal");
        setImageDataUrls([]);
        utils.seller.overview.invalidate();
        utils.seller.workspace.invalidate();
      } catch {
        const message = t("seller.imageUploadFailed");
        setPublishFeedback(message);
        toast.error(message);
      }
    },
    onError: error => {
      const message = `${t("seller.submitFailedPrefix")}${error.message}`;
      setFormError(message);
      toast.error(message);
    },
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setPublishFeedback("");
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (Object.values(numberErrors).some(Boolean)) {
      setFormError(
        language === "en"
          ? "Correct the highlighted numeric fields before submitting"
          : "صحح الحقول الرقمية المحددة قبل الإرسال"
      );
      return;
    }
    const price = Number(type === "fixed" ? fixedPrice : startingPrice);
    if (
      type === "auction" &&
      (!Number.isFinite(Number(minimumBidIncrement)) ||
        Number(minimumBidIncrement) <= 0)
    ) {
      setFormError(
        language === "en"
          ? "Enter a minimum bid increment greater than zero."
          : "أدخل حدًا أدنى موجبًا لزيادة المزايدة."
      );
      return;
    }
    const error = getListingDraftError(
      {
        categoryId,
        title: normalizedTitle,
        description: normalizedDescription,
        type,
        price,
        auctionEndTime,
      },
      Date.now(),
      language
    );
    if (error) {
      setFormError(error);
      return;
    }
    createListing.mutate({
      categoryId,
      subcategoryId: subcategoryId || undefined,
      title: normalizedTitle,
      description: normalizedDescription,
      type,
      fixedPrice: type === "fixed" ? price : undefined,
      startingPrice: type === "auction" ? price : undefined,
      minimumBidIncrement:
        type === "auction" ? Number(minimumBidIncrement) : undefined,
      auctionEndTime:
        type === "auction" ? new Date(auctionEndTime).toISOString() : undefined,
      source,
      externalMarketName:
        source === "external" ? externalMarketName : undefined,
      externalListingUrl:
        source === "external" ? externalListingUrl : undefined,
    });
  };
  const beginAuctionConversion = (item: {
    id: string;
    title: string;
    fixed_price: number | null;
  }) => {
    setConversionListing({ id: item.id, title: item.title });
    setConversionStartingPrice(String(item.fixed_price ?? ""));
    setConversionMinimumIncrement("10");
    setConversionDuration("3");
    setConversionEndAt(localDateTimeAfter(3));
    setConversionError("");
    setConversionStep("confirm");
  };
  const submitAuctionConversion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversionListing) return;
    const startPrice = Number(conversionStartingPrice);
    const increment = Number(conversionMinimumIncrement);
    const endTimestamp = new Date(conversionEndAt).getTime();
    if (
      !Number.isFinite(startPrice) ||
      startPrice <= 0 ||
      !Number.isFinite(increment) ||
      increment <= 0
    ) {
      setConversionError(
        language === "en"
          ? "Starting price and increment must be greater than zero."
          : "يجب أن يكون سعر البداية والزيادة أكبر من صفر."
      );
      return;
    }
    if (!Number.isFinite(endTimestamp) || endTimestamp <= Date.now()) {
      setConversionError(
        language === "en"
          ? "Choose an end time in the future."
          : "اختر موعد انتهاء في المستقبل."
      );
      return;
    }
    setConversionError("");
    convertToAuction.mutate({
      listingId: conversionListing.id,
      startingPrice: startPrice,
      minimumBidIncrement: increment,
      auctionEndTime: new Date(endTimestamp).toISOString(),
    });
  };
  const selectImages = async (files: FileList | null) => {
    const selected = Array.from(files ?? []).slice(
      0,
      Math.max(0, 6 - imageDataUrls.length)
    );
    const valid = selected.filter(
      file =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024
    );
    if (valid.length !== selected.length)
      toast.error(t("seller.imagesRejected"));
    const values = await Promise.all(
      valid.map(
        file =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );
    setImageDataUrls(current => [...current, ...values].slice(0, 6));
  };
  const loading = authLoading || overview.isLoading || workspace.isLoading;
  const failed = overview.isError || workspace.isError;

  if (!authLoading && !isSeller) {
    return (
      <MarketplaceDashboardLayout
        eyebrow={t("seller.eyebrow")}
        title={t("seller.title")}
      >
        <div className="mx-auto max-w-lg rounded-[1.5rem] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f8e6b4] text-[#ae7819]">
            <Gavel className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-xl font-black text-[#0b2343]">
            {t("seller.onboardingTitle")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {t("seller.onboardingDescription")}
          </p>
          <Button
            disabled={becomeSeller.isPending}
            onClick={() => becomeSeller.mutate()}
            className="mt-6 bg-[#0b2343] hover:bg-[#163961]"
          >
            {becomeSeller.isPending
              ? t("seller.onboardingPending")
              : t("seller.onboardingCta")}
          </Button>
        </div>
      </MarketplaceDashboardLayout>
    );
  }

  return (
    <MarketplaceDashboardLayout
      eyebrow={t("seller.eyebrow")}
      title={t("seller.title")}
    >
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#15385f] via-[#0b2343] to-[#071a32] p-6 text-white shadow-[0_20px_50px_-35px_rgba(8,30,58,.8)] sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -end-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[#d5ad4f]/15 blur-3xl"
        />
        <p className="inline-flex items-center gap-2 rounded-full border border-[#f7d67f]/30 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#f7d67f]">
          <Store className="h-3.5 w-3.5" />
          {t("seller.heroEyebrow")}
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          {t("seller.heroTitle")}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
          {t("seller.heroDescription")}
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingPanel label={t("seller.loading")} />
        </div>
      ) : failed ? (
        <div className="mt-6">
          <ErrorPanel
            onRetry={() => {
              overview.refetch();
              workspace.refetch();
            }}
          />
        </div>
      ) : (
        <>
          <Dialog
            open={conversionStep !== null}
            onOpenChange={open => {
              if (!open && !convertToAuction.isPending) {
                setConversionStep(null);
                setConversionListing(null);
              }
            }}
          >
            <DialogContent
              dir={language === "en" ? "ltr" : "rtl"}
              className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
            >
              {conversionStep === "confirm" ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-[#0b2343]">
                      {t("seller.convertConfirmTitle")}
                    </DialogTitle>
                    <DialogDescription className="leading-7">
                      {t("seller.convertConfirmDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  {conversionListing ? (
                    <div className="rounded-xl border border-[#ead9a9] bg-[#fffaf0] p-3">
                      <p className="text-xs font-bold text-[#805709]">
                        {language === "en"
                          ? "Selected listing"
                          : "الإعلان المحدد"}
                      </p>
                      <p className="mt-1 font-black text-[#0b2343]">
                        {conversionListing.title}
                      </p>
                    </div>
                  ) : null}
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setConversionStep(null);
                        setConversionListing(null);
                      }}
                    >
                      {t("seller.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setConversionStep("settings")}
                      className="bg-[#0b2343] hover:bg-[#163961]"
                    >
                      {t("seller.continueToAuctionSettings")}
                      <ArrowRight
                        className={`ms-2 h-4 w-4 ${language === "en" ? "" : "rotate-180"}`}
                      />
                    </Button>
                  </DialogFooter>
                </>
              ) : conversionStep === "settings" ? (
                <form onSubmit={submitAuctionConversion} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-[#0b2343]">
                      {t("seller.auctionSettingsTitle")}
                    </DialogTitle>
                    <DialogDescription className="leading-7">
                      {conversionListing?.title}
                    </DialogDescription>
                  </DialogHeader>
                  {conversionError ? (
                    <p
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"
                    >
                      {conversionError}
                    </p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-[#0b2343]">
                      {t("seller.startingPrice")}
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        required
                        value={conversionStartingPrice}
                        onChange={event =>
                          setConversionStartingPrice(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0b2343]">
                      {t("seller.minimumBidIncrement")}
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        required
                        value={conversionMinimumIncrement}
                        onChange={event =>
                          setConversionMinimumIncrement(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0b2343] sm:col-span-2">
                      {t("seller.auctionDuration")}
                      <select
                        value={conversionDuration}
                        onChange={event => {
                          const value = event.target.value;
                          setConversionDuration(value);
                          if (value !== "custom")
                            setConversionEndAt(
                              localDateTimeAfter(Number(value))
                            );
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                      >
                        <option value="1">{t("seller.duration1Day")}</option>
                        <option value="3">{t("seller.duration3Days")}</option>
                        <option value="5">{t("seller.duration5Days")}</option>
                        <option value="7">{t("seller.duration7Days")}</option>
                        <option value="custom">
                          {t("seller.customDuration")}
                        </option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0b2343] sm:col-span-2">
                      {t("seller.endsAt")}
                      <input
                        type="datetime-local"
                        required
                        min={localDateTimeAfter(0)}
                        disabled={conversionDuration !== "custom"}
                        value={conversionEndAt}
                        onChange={event =>
                          setConversionEndAt(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </label>
                  </div>
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
                    {language === "en"
                      ? "The first valid bid must be at least the starting price plus the increment."
                      : "يجب ألا تقل أول مزايدة صحيحة عن سعر البداية مضافًا إليه مقدار الزيادة."}
                  </p>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConversionStep("confirm")}
                      disabled={convertToAuction.isPending}
                    >
                      {language === "en" ? "Back" : "رجوع"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={convertToAuction.isPending}
                      className="bg-[#0b2343] hover:bg-[#163961]"
                    >
                      {convertToAuction.isPending
                        ? t("seller.sending")
                        : t("seller.convertToAuction")}
                    </Button>
                  </DialogFooter>
                </form>
              ) : null}
            </DialogContent>
          </Dialog>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              icon={ListChecks}
              label={t("seller.totalListings")}
              value={overview.data?.listingsCount ?? 0}
              tone="bg-[#edf2f6] text-[#0b2343]"
            />
            <Stat
              icon={Gavel}
              label={t("seller.activeAuctions")}
              value={overview.data?.activeAuctionsCount ?? 0}
              tone="bg-[#f8e6b4] text-[#b87f1c]"
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(11,35,67,.65)] dark:bg-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef4ee] text-emerald-700">
                <WalletCards className="h-5 w-5" />
              </span>
              <p className="mt-5 text-2xl font-black text-[#0b2343]">
                {formatCurrency(workspace.data?.walletBalance ?? 0, language)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t("seller.currentWalletBalance")}
              </p>
            </div>
          </div>

          <form
            noValidate
            onSubmit={submit}
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-38px_rgba(11,35,67,.6)] sm:p-7 dark:bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff5d5] text-[#a7771b]">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-black text-[#0b2343]">
                    {t("seller.addListingFormTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {language === "en"
                      ? "Add the key information and photos for your listing"
                      : "أضف المعلومات الأساسية والصور لإعلانك"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f4f6f8] px-3 py-1.5 text-[11px] font-bold text-slate-600">
                {language === "en" ? "Listing details" : "بيانات الإعلان"}
              </span>
            </div>
            {formError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
              >
                {formError}
              </p>
            ) : null}
            {publishFeedback ? (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                {publishFeedback}
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-[#0b2343]">
                {t("seller.listingType")}
                <select
                  value={type}
                  onChange={event =>
                    setType(event.target.value as "fixed" | "auction")
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                >
                  <option value="fixed">{t("seller.fixedType")}</option>
                  <option value="auction">{t("seller.auctionType")}</option>
                </select>
              </label>
              <label className="text-sm font-bold text-[#0b2343]">
                {t("seller.category")}
                <select
                  value={categoryId}
                  onChange={event => {
                    setCategoryId(event.target.value);
                    setSubcategoryId("");
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                >
                  <option value="">{t("seller.selectCategory")}</option>
                  {categories.data?.map(category => (
                    <option key={category.id} value={category.id}>
                      {language === "en"
                        ? category.name_en || category.name
                        : category.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedSubcategories.length ? (
                <label className="text-sm font-bold text-[#0b2343]">
                  {language === "en" ? "Subcategory" : "الفئة الفرعية"}
                  <select
                    value={subcategoryId}
                    onChange={event => setSubcategoryId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                  >
                    <option value="">
                      {language === "en"
                        ? "Select a subcategory (optional)"
                        : "اختر فئة فرعية (اختياري)"}
                    </option>
                    {selectedSubcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {language === "en" && subcategory.name_en
                          ? subcategory.name_en
                          : subcategory.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-sm font-bold text-[#0b2343] md:col-span-2">
                {t("seller.listingTitle")}
                <input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  maxLength={160}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                  placeholder={t("seller.listingTitlePlaceholder")}
                />
              </label>
              <label className="text-sm font-bold text-[#0b2343] md:col-span-2">
                {t("seller.description")}
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  minLength={10}
                  maxLength={5000}
                  aria-invalid={
                    description.length > 0 && description.trim().length < 10
                  }
                  className={`mt-2 min-h-28 w-full rounded-xl border p-3 text-sm font-normal ${description.length > 0 && description.trim().length < 10 ? "border-rose-400" : "border-slate-200"}`}
                  placeholder={t("seller.descriptionPlaceholder")}
                />
                {description.length > 0 && description.trim().length < 10 ? (
                  <span className="mt-1 block text-xs font-normal text-rose-600">
                    {language === "en"
                      ? "Description must be at least 10 characters"
                      : "يجب ألا يقل الوصف عن 10 أحرف"}
                  </span>
                ) : null}
              </label>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <label className="text-sm font-bold text-[#0b2343]">
                  {t("seller.listingSource")}
                  <select
                    value={source}
                    onChange={event =>
                      setSource(event.target.value as "internal" | "external")
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                  >
                    <option value="internal">
                      {t("seller.internalSource")}
                    </option>
                    <option value="external">
                      {t("seller.externalSource")}
                    </option>
                  </select>
                </label>
                {source === "external" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={externalMarketName}
                      onChange={event =>
                        setExternalMarketName(event.target.value)
                      }
                      placeholder={t("seller.externalMarketNamePlaceholder")}
                      className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                    />
                    <input
                      value={externalListingUrl}
                      onChange={event =>
                        setExternalListingUrl(event.target.value)
                      }
                      placeholder="https://example.com/listing"
                      className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                    />
                  </div>
                ) : null}
              </div>

              <div className="text-sm font-bold text-[#0b2343] md:col-span-2">
                {t("seller.listingImages")}
                <div className="mt-2 rounded-2xl border border-dashed border-[#d7b15e] bg-gradient-to-br from-[#fffdf7] to-[#fff9e8] p-4 sm:p-5">
                  <input
                    id="listing-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={event => {
                      void selectImages(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="listing-images"
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0b2343] px-4 text-sm font-bold text-white transition hover:bg-[#163961]"
                  >
                    <ImagePlus className="h-4 w-4" /> {t("seller.chooseImages")}
                  </label>
                  <p className="mt-2 text-xs font-normal text-slate-500">
                    {t("seller.imagesHelp")}
                  </p>
                  {imageDataUrls.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {imageDataUrls.map((image, index) => (
                        <div
                          key={`${index}-${image.slice(-12)}`}
                          className="relative"
                        >
                          <img
                            src={image}
                            alt={`${t("seller.imagePreview")} ${index + 1}`}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setImageDataUrls(current =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                              )
                            }
                            className="absolute -start-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-xs text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {type === "fixed" ? (
                <label className="text-sm font-bold text-[#0b2343]">
                  {t("seller.salePrice")}
                  <input
                    inputMode="numeric"
                    value={fixedPrice}
                    onChange={event => {
                      const raw = event.target.value;
                      const normalized = normalizeDigits(raw);
                      const valid =
                        raw === "" ||
                        (normalized.length > 0 &&
                          raw.replace(/[٠-٩۰-۹\d]/g, "") === "");
                      setFixedPrice(normalized);
                      updateNumberError(
                        "fixedPrice",
                        valid
                          ? undefined
                          : language === "en"
                            ? "Digits only (0-9)"
                            : "الأرقام فقط (0-9)"
                      );
                    }}
                    aria-invalid={Boolean(numberErrors.fixedPrice)}
                    className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm font-normal ${numberErrors.fixedPrice ? "border-rose-400" : "border-slate-200"}`}
                    placeholder="0"
                  />
                  {numberErrors.fixedPrice ? (
                    <span className="mt-1 block text-xs font-normal text-rose-600">
                      {numberErrors.fixedPrice}
                    </span>
                  ) : null}
                </label>
              ) : (
                <>
                  <label className="text-sm font-bold text-[#0b2343]">
                    {t("seller.startingPrice")}
                    <input
                      inputMode="numeric"
                      value={startingPrice}
                      onChange={event => {
                        const raw = event.target.value;
                        const normalized = normalizeDigits(raw);
                        const valid =
                          raw === "" ||
                          (normalized.length > 0 &&
                            raw.replace(/[٠-٩۰-۹\d]/g, "") === "");
                        setStartingPrice(normalized);
                        updateNumberError(
                          "startingPrice",
                          valid
                            ? undefined
                            : language === "en"
                              ? "Digits only (0-9)"
                              : "الأرقام فقط (0-9)"
                        );
                      }}
                      aria-invalid={Boolean(numberErrors.startingPrice)}
                      className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm font-normal ${numberErrors.startingPrice ? "border-rose-400" : "border-slate-200"}`}
                      placeholder="0"
                    />
                    {numberErrors.startingPrice ? (
                      <span className="mt-1 block text-xs font-normal text-rose-600">
                        {numberErrors.startingPrice}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-bold text-[#0b2343]">
                    {t("seller.minimumBidIncrement")}
                    <input
                      inputMode="numeric"
                      min="1"
                      value={minimumBidIncrement}
                      onChange={event =>
                        setMinimumBidIncrement(
                          normalizeDigits(event.target.value)
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                      placeholder="10"
                    />
                  </label>
                  <label className="text-sm font-bold text-[#0b2343]">
                    {t("seller.endsAt")}
                    <input
                      type="datetime-local"
                      value={auctionEndTime}
                      onChange={event => setAuctionEndTime(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                    />
                  </label>
                </>
              )}
            </div>

            <Button
              disabled={
                createListing.isPending ||
                uploadImage.isPending ||
                categories.isLoading ||
                !categories.data?.length
              }
              className="mt-5 bg-[#0b2343] hover:bg-[#163961]"
            >
              {createListing.isPending || uploadImage.isPending
                ? t("seller.sending")
                : t("seller.submitForReview")}
            </Button>
            {!categories.data?.length ? (
              <p className="mt-3 text-sm font-bold text-rose-700">
                {t("seller.needsCategoryFirst")}
              </p>
            ) : null}
          </form>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#0b2343]">
                {t("seller.myListingsTitle")}
              </h3>
              {workspace.data?.listings.length ? (
                <div className="mt-3 divide-y divide-slate-100">
                  {workspace.data.listings.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0b2343]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.type === "auction"
                            ? t("seller.auctionType")
                            : t("seller.fixedType")}{" "}
                          · {listingStatus[item.status] ?? item.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <strong className="text-sm text-[#b87f1c]">
                          {formatCurrency(
                            item.fixed_price ??
                              item.current_price ??
                              item.starting_price ??
                              0,
                            language
                          )}
                        </strong>
                        {item.canConvertToAuction ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => beginAuctionConversion(item)}
                            disabled={convertToAuction.isPending}
                            className="border-[#d8bd78] text-[#0b2343] hover:bg-[#fff8e7]"
                          >
                            <Gavel className="me-1.5 h-3.5 w-3.5" />
                            {t("seller.convertToAuction")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {t("seller.noListingsYet")}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#0b2343]">
                {t("seller.walletActivityTitle")}
              </h3>
              {workspace.data?.transactions.length ? (
                <div className="mt-3 divide-y divide-slate-100">
                  {workspace.data.transactions.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0b2343]">
                          {transactionType[item.type] ?? item.type}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transactionStatus[item.status] ?? ""} ·{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            numberLocale
                          )}
                        </p>
                      </div>
                      <strong className="text-sm text-[#0b2343]">
                        {formatCurrency(item.amount, language)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {t("seller.noWalletActivity")}
                </p>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-emerald-900">
              {language === "en" ? "Sold items" : "العروض التي تم بيعها"}
            </h3>
            {workspace.data?.soldItems?.length ? (
              <div className="mt-3 divide-y divide-emerald-100">
                {workspace.data.soldItems.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-bold text-[#0b2343]">
                          {item.listingTitle}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleDateString(
                            numberLocale
                          )}{" "}
                          · {language === "en" ? "Buyer" : "المشتري"}:{" "}
                          {item.buyerName} ·{" "}
                          {deliveryStatus[item.delivery_status] ??
                            item.delivery_status}
                        </p>
                      </div>
                    </div>
                    <strong className="text-emerald-800">
                      {formatCurrency(Number(item.final_price), language)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {language === "en"
                  ? "No completed sales yet"
                  : "لا توجد مبيعات مكتملة بعد"}
              </p>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-[#0b2343]">
              {t("seller.incomingOffersTitle")}
            </h3>
            {offers.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">
                {t("seller.loadingOffers")}
              </p>
            ) : offers.data?.length ? (
              <div className="mt-3 divide-y divide-slate-100">
                {offers.data.map(offer => (
                  <div
                    key={offer.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-[#0b2343]">
                        {offer.listingTitle}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {language === "en" ? "Buyer" : "المشتري"}:{" "}
                        {offer.buyerName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {offer.message || t("seller.noMessage")}
                      </p>
                      <p className="mt-1 text-sm font-black text-[#b87f1c]">
                        {formatCurrency(Number(offer.amount), language)} ·{" "}
                        <span
                          className={
                            offer.status === "accepted"
                              ? "text-emerald-700"
                              : offer.status === "rejected"
                                ? "text-rose-700"
                                : "text-amber-700"
                          }
                        >
                          {offerStatus[offer.status] ?? ""}
                        </span>
                      </p>
                    </div>
                    {offer.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respondToOffer.mutate({
                              offerId: offer.id,
                              action: "accepted",
                            })
                          }
                          disabled={respondToOffer.isPending}
                          className="bg-emerald-700"
                        >
                          {t("seller.acceptOffer")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            respondToOffer.mutate({
                              offerId: offer.id,
                              action: "rejected",
                            })
                          }
                          disabled={respondToOffer.isPending}
                        >
                          {t("seller.rejectOffer")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {t("seller.noOffersYet")}
              </p>
            )}
          </section>
        </>
      )}
    </MarketplaceDashboardLayout>
  );
}
