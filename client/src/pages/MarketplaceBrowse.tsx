import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  Gamepad2,
  Grid2X2,
  Headphones,
  Laptop,
  Monitor,
  Search,
  Smartphone,
  SlidersHorizontal,
  Tablet,
  Tag,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import MarketplaceShell from "@/components/marketplace/MarketplaceShell";
import ListingCard from "@/components/marketplace/ListingCard";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { buildMarketplaceLocation } from "@/lib/marketplaceUrl";

type ListingType = "fixed" | "auction";

function getSubcategoryIcon(slug: string, name: string): LucideIcon {
  const value = `${slug} ${name}`.toLocaleLowerCase();
  if (/(phone|mobile|smartphone|cell|جوال|هاتف)/i.test(value))
    return Smartphone;
  if (/(laptop|notebook|computer|حاسوب|لابتوب|كمبيوتر)/i.test(value))
    return Laptop;
  if (/(tablet|ipad|تابلت)/i.test(value)) return Tablet;
  if (/(camera|كاميرا)/i.test(value)) return Camera;
  if (/(headphone|headset|earphone|سماعة|سماعات)/i.test(value))
    return Headphones;
  if (/(television|\btv\b|screen|display|شاشة|تلفاز)/i.test(value)) return Tv;
  if (
    /(game|gaming|console|playstation|xbox|ألعاب|العاب|بلايستيشن)/i.test(value)
  )
    return Gamepad2;
  if (/(monitor|شاشة كمبيوتر)/i.test(value)) return Monitor;
  return Tag;
}

function updateSearchParams(
  location: string,
  setLocation: (to: string, options?: { replace?: boolean }) => void,
  updates: Record<string, string | undefined>
) {
  setLocation(buildMarketplaceLocation(location, updates));
}

export default function MarketplaceBrowse() {
  const { language, t } = useLocale();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const currentLocation = `${location}${search ? `?${search}` : ""}`;
  const urlParams = new URLSearchParams(search);
  const submittedQuery = urlParams.get("q") ?? "";
  const categorySlug = urlParams.get("category") ?? "";
  const subcategorySlug = urlParams.get("subcategory") ?? "";
  const requestedType = urlParams.get("type");
  const type: ListingType | undefined =
    requestedType === "auction" || requestedType === "fixed"
      ? requestedType
      : undefined;
  const parsedPage = Number.parseInt(urlParams.get("page") ?? "1", 10);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [query, setQuery] = useState(submittedQuery);
  const categories = trpc.marketplace.categories.useQuery({ limit: 50 });
  const selectedCategory = categories.data?.find(
    category => category.slug === categorySlug
  );
  const selectedSubcategory = selectedCategory?.subcategories.find(
    subcategory => subcategory.slug === subcategorySlug
  );
  const input = useMemo(
    () => ({
      query: submittedQuery || undefined,
      categorySlug,
      subcategorySlug,
      type,
      page,
      pageSize: 12,
    }),
    [submittedQuery, categorySlug, subcategorySlug, type, page]
  );
  const browse = trpc.marketplace.browse.useQuery(input);

  useEffect(() => setQuery(submittedQuery), [submittedQuery]);

  // Keep deep links valid if a category was deleted or a subcategory belongs to another parent.
  useEffect(() => {
    if (!categories.isSuccess) return;
    if (categorySlug && !selectedCategory) {
      updateSearchParams(currentLocation, setLocation, {
        category: undefined,
        subcategory: undefined,
        page: undefined,
      });
      return;
    }
    if (subcategorySlug && categorySlug && !selectedSubcategory) {
      updateSearchParams(currentLocation, setLocation, {
        subcategory: undefined,
        page: undefined,
      });
      return;
    }
    if (subcategorySlug && !categorySlug) {
      const parent = categories.data.find(category =>
        category.subcategories.some(
          subcategory => subcategory.slug === subcategorySlug
        )
      );
      if (parent)
        updateSearchParams(currentLocation, setLocation, {
          category: parent.slug,
        });
      else
        updateSearchParams(currentLocation, setLocation, {
          subcategory: undefined,
          page: undefined,
        });
    }
  }, [
    categories.isSuccess,
    categories.data,
    categorySlug,
    subcategorySlug,
    selectedCategory,
    selectedSubcategory,
    currentLocation,
    setLocation,
  ]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    updateSearchParams(currentLocation, setLocation, {
      q: query.trim() || undefined,
      page: undefined,
    });
  };
  const selectCategory = (value: string) => {
    updateSearchParams(currentLocation, setLocation, {
      category: value || undefined,
      subcategory: undefined,
      page: undefined,
    });
  };
  const selectSubcategory = (value: string) => {
    updateSearchParams(currentLocation, setLocation, {
      subcategory: value || undefined,
      page: undefined,
    });
  };
  const setTypeFilter = (value: ListingType | undefined) => {
    updateSearchParams(currentLocation, setLocation, {
      type: value,
      page: undefined,
    });
  };
  const setPage = (value: number) =>
    updateSearchParams(currentLocation, setLocation, {
      page: value > 1 ? String(value) : undefined,
    });
  const clearFilters = () => {
    setQuery("");
    setLocation("/marketplace");
  };
  const selectedCategoryName = selectedCategory
    ? language === "en"
      ? selectedCategory.name_en || selectedCategory.name
      : selectedCategory.name
    : categorySlug;

  return (
    <MarketplaceShell>
      <main className="container py-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-[#b87f1c]">
              {t("browse.eyebrow")}
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#0b2343]">
              {t("browse.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("browse.description")}
            </p>
          </div>
          <div className="rounded-xl bg-[#e9f0f5] px-3 py-2 text-xs font-bold text-[#546477]">
            <SlidersHorizontal className="me-1 inline h-4 w-4 text-[#c89935]" />
            {t("browse.organized")}
          </div>
        </div>

        <section className="mt-7 rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
          <form onSubmit={submit}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-[#fbfcfd] px-3 transition focus-within:border-[#c89935] focus-within:ring-4 focus-within:ring-[#c89935]/10">
                <Search className="h-4 w-4 shrink-0 text-[#c89935]" />
                <input
                  aria-label={t("browse.searchPlaceholder")}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={t("browse.searchPlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                />
              </div>
              <Button className="h-12 shrink-0 bg-[#c89935] px-6 font-extrabold text-[#0b2343] hover:bg-[#b98628]">
                {t("browse.search")}
              </Button>
            </div>

            {selectedCategory || categorySlug ? (
              <div className="mt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-500">
                      {t("browse.selectedCategory")}
                    </p>
                    <h2 className="mt-0.5 truncate text-sm font-black text-[#0b2343] dark:text-foreground">
                      {selectedCategoryName}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectCategory("")}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold text-[#805709] transition hover:bg-[#fff8e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89935]"
                  >
                    {t("browse.changeCategory")}
                  </button>
                </div>

                {selectedCategory?.subcategories.length ? (
                  <div
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8"
                    aria-label={t("browse.allSubcategories")}
                  >
                    <button
                      type="button"
                      aria-pressed={!subcategorySlug}
                      onClick={() => selectSubcategory("")}
                      className={`relative flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f0d98d] sm:min-h-[100px] ${!subcategorySlug ? "border-[#c89935] bg-[#fff8e7] text-[#805709] shadow-sm" : "border-[#e5ebf0] bg-white text-[#0b2343] hover:-translate-y-0.5 hover:border-[#d9c27f] hover:bg-[#fffdf7] hover:shadow-sm dark:bg-card dark:text-foreground"}`}
                    >
                      {!subcategorySlug ? (
                        <Check
                          aria-hidden="true"
                          className="absolute end-2 top-2 h-3.5 w-3.5"
                        />
                      ) : null}
                      <Grid2X2
                        aria-hidden="true"
                        className="h-6 w-6 text-[#b17a1c]"
                        strokeWidth={1.8}
                      />
                      <span className="line-clamp-2 text-xs font-extrabold">
                        {t("browse.all")}
                      </span>
                    </button>
                    {selectedCategory.subcategories.map(subcategory => {
                      const name =
                        language === "en"
                          ? subcategory.name_en || subcategory.name
                          : subcategory.name;
                      const Icon = getSubcategoryIcon(
                        subcategory.slug,
                        `${subcategory.name} ${subcategory.name_en ?? ""}`
                      );
                      const active = subcategorySlug === subcategory.slug;
                      return (
                        <button
                          key={subcategory.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => selectSubcategory(subcategory.slug)}
                          className={`relative flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f0d98d] sm:min-h-[100px] ${active ? "border-[#c89935] bg-[#fff8e7] text-[#805709] shadow-sm" : "border-[#e5ebf0] bg-white text-[#0b2343] hover:-translate-y-0.5 hover:border-[#d9c27f] hover:bg-[#fffdf7] hover:shadow-sm dark:bg-card dark:text-foreground"}`}
                        >
                          {active ? (
                            <Check
                              aria-hidden="true"
                              className="absolute end-2 top-2 h-3.5 w-3.5"
                            />
                          ) : null}
                          <Icon
                            aria-hidden="true"
                            className="h-6 w-6 text-[#b17a1c]"
                            strokeWidth={1.8}
                          />
                          <span className="line-clamp-2 break-words text-xs font-extrabold">
                            {name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select
                  aria-label={t("browse.allCategories")}
                  value={categorySlug}
                  onChange={event => selectCategory(event.target.value)}
                  className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">{t("browse.allCategories")}</option>
                  {categories.data?.map(category => (
                    <option key={category.id} value={category.slug}>
                      {language === "en"
                        ? category.name_en || category.name
                        : category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTypeFilter(undefined)}
                aria-pressed={type === undefined}
                className={
                  type === undefined
                    ? "border-[#0b2343] bg-[#0b2343] text-white hover:bg-[#0b2343] hover:text-white"
                    : ""
                }
              >
                {t("browse.all")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTypeFilter("auction")}
                aria-pressed={type === "auction"}
                className={
                  type === "auction"
                    ? "border-[#0b2343] bg-[#0b2343] text-white hover:bg-[#0b2343] hover:text-white"
                    : ""
                }
              >
                {t("browse.auction")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTypeFilter("fixed")}
                aria-pressed={type === "fixed"}
                className={
                  type === "fixed"
                    ? "border-[#0b2343] bg-[#0b2343] text-white hover:bg-[#0b2343] hover:text-white"
                    : ""
                }
              >
                {t("browse.fixed")}
              </Button>
            </div>
          </form>
        </section>

        {browse.isLoading ? (
          <div className="mt-7">
            <LoadingPanel label={t("browse.loading")} />
          </div>
        ) : browse.isError ? (
          <div className="mt-7">
            <ErrorPanel onRetry={() => browse.refetch()} />
          </div>
        ) : browse.data?.items.length ? (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {browse.data.items.map(item => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </section>
            <div className="mt-8 flex justify-center gap-3">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                {t("browse.previous")}
              </Button>
              <span className="grid place-items-center px-3 text-sm font-bold text-slate-500">
                {page}
              </span>
              <Button
                variant="outline"
                disabled={!browse.data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                {t("browse.next")}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-7">
            <EmptyPanel
              title={t("browse.noListings")}
              description={t("browse.noListingsDescription")}
              action={{ label: t("browse.clear"), onClick: clearFilters }}
            />
          </div>
        )}
      </main>
    </MarketplaceShell>
  );
}
