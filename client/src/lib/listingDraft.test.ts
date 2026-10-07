import { describe, expect, it } from "vitest";
import { getListingDraftError } from "./listingDraft";

const baseDraft = {
  categoryId: "category",
  title: "ساعة فاخرة",
  description: "وصف واضح وكافٍ للإعلان المعروض",
  type: "fixed" as const,
  price: 1200,
};

describe("getListingDraftError", () => {
  it("returns the exact actionable message for every incomplete seller input", () => {
    expect(getListingDraftError({ ...baseDraft, categoryId: "" })).toBe(
      "اختر تصنيف الإعلان أولًا."
    );
    expect(getListingDraftError({ ...baseDraft, title: "س" })).toBe(
      "اكتب عنوانًا لا يقل عن 3 أحرف."
    );
    expect(getListingDraftError({ ...baseDraft, description: "قصير" })).toBe(
      "اكتب وصفًا أوضح لا يقل عن 10 أحرف."
    );
    expect(getListingDraftError({ ...baseDraft, price: 0 })).toBe(
      "أدخل سعر بيع صحيحًا أكبر من صفر."
    );
  });

  it("requires a future end time for an auction but accepts a complete direct sale", () => {
    expect(
      getListingDraftError(
        {
          ...baseDraft,
          type: "auction",
          auctionEndTime: "2026-08-25T19:00:00.000Z",
        },
        new Date("2026-08-25T20:00:00.000Z").getTime()
      )
    ).toBe("اختر وقتًا مستقبليًا لانتهاء المزاد.");
    expect(getListingDraftError(baseDraft)).toBeNull();
  });
});
