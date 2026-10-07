import { describe, expect, it } from "vitest";
import { canLinkSupabaseAuthIdentity, hasSufficientAvailableBalance, isValidDisputeReason, isValidFutureAuctionEnd, isValidMarketplaceAmount, isValidMessageContent, normalizeSearchTerm, parseListingImageDataUrl } from "./db";

describe("marketplace query safeguards", () => {
  it("removes SQL-like wildcard characters from a marketplace search term", () => {
    expect(normalizeSearchTerm("  ساعة%_ نادرة  ")).toBe("ساعة نادرة");
  });

  it("normalizes missing search input to an empty string", () => {
    expect(normalizeSearchTerm(undefined)).toBe("");
  });

  it("links an existing email profile only when it is unbound or already belongs to the same Supabase identity", () => {
    expect(canLinkSupabaseAuthIdentity(null, "auth-id-1")).toBe(true);
    expect(canLinkSupabaseAuthIdentity("auth-id-1", "auth-id-1")).toBe(true);
    expect(canLinkSupabaseAuthIdentity("auth-id-2", "auth-id-1")).toBe(false);
  });

  it("accepts only finite positive marketplace amounts below the server cap", () => {
    expect(isValidMarketplaceAmount(1)).toBe(true);
    expect(isValidMarketplaceAmount(0)).toBe(false);
    expect(isValidMarketplaceAmount(-10)).toBe(false);
    expect(isValidMarketplaceAmount(Number.NaN)).toBe(false);
    expect(isValidMarketplaceAmount(1_000_000_001)).toBe(false);
  });

  it("rejects a bid when the available wallet balance is zero or below the bid amount", () => {
    expect(hasSufficientAvailableBalance(0, 100)).toBe(false);
    expect(hasSufficientAvailableBalance(99, 100)).toBe(false);
    expect(hasSufficientAvailableBalance(100, 100)).toBe(true);
    expect(hasSufficientAvailableBalance(150, 100)).toBe(true);
  });

  it("accepts only future auction end times", () => {
    expect(isValidFutureAuctionEnd(new Date(Date.now() + 60_000).toISOString())).toBe(true);
    expect(isValidFutureAuctionEnd(new Date(Date.now() - 60_000).toISOString())).toBe(false);
    expect(isValidFutureAuctionEnd("not-a-date")).toBe(false);
  });

  it("enforces bounded meaningful message and dispute content", () => {
    expect(isValidMessageContent("رسالة آمنة")).toBe(true);
    expect(isValidMessageContent("   ")).toBe(false);
    expect(isValidDisputeReason("سبب واضح للنزاع")).toBe(true);
    expect(isValidDisputeReason("قصير")).toBe(false);
  });

  it("accepts only declared image formats whose bytes match their signature", () => {
    expect(parseListingImageDataUrl("data:image/jpeg;base64,/9j/").mimeType).toBe("image/jpeg");
    expect(() => parseListingImageDataUrl("data:image/gif;base64,R0lGODlh")).toThrow("صيغة الصورة غير مدعومة");
    expect(() => parseListingImageDataUrl("data:image/png;base64,/9j/")).toThrow("محتوى الملف لا يطابق");
  });
});
