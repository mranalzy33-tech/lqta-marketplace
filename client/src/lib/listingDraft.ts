export type ListingDraft = {
  categoryId: string;
  title: string;
  description: string;
  type: "fixed" | "auction";
  price: number;
  auctionEndTime?: string;
};

export function getListingDraftError(
  draft: ListingDraft,
  now = Date.now(),
  language: "ar" | "en" = "ar"
) {
  const english = language === "en";

  if (!draft.categoryId) {
    return english
      ? "Choose a listing category first."
      : "اختر تصنيف الإعلان أولًا.";
  }
  if (draft.title.trim().length < 3) {
    return english
      ? "Enter a title with at least 3 characters."
      : "اكتب عنوانًا لا يقل عن 3 أحرف.";
  }
  if (draft.description.trim().length < 10) {
    return english
      ? "Enter a clearer description with at least 10 characters."
      : "اكتب وصفًا أوضح لا يقل عن 10 أحرف.";
  }
  if (
    !Number.isFinite(draft.price) ||
    draft.price <= 0 ||
    draft.price > 1_000_000_000
  ) {
    return english
      ? "Enter a valid selling price greater than zero."
      : "أدخل سعر بيع صحيحًا أكبر من صفر.";
  }
  if (draft.type === "auction") {
    const endTime = draft.auctionEndTime
      ? Date.parse(draft.auctionEndTime)
      : Number.NaN;
    if (!Number.isFinite(endTime) || endTime <= now) {
      return english
        ? "Choose a future auction end time."
        : "اختر وقتًا مستقبليًا لانتهاء المزاد.";
    }
  }

  return null;
}
