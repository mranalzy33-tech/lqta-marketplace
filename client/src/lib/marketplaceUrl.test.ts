import { describe, expect, it } from "vitest";
import { buildMarketplaceLocation } from "./marketplaceUrl";

describe("buildMarketplaceLocation", () => {
  it("keeps the search and listing type while changing category and clearing its subcategory", () => {
    const current =
      "/marketplace?q=phone&type=auction&category=electronics&subcategory=phones&page=3";
    expect(
      buildMarketplaceLocation(current, {
        category: "vehicles",
        subcategory: undefined,
        page: undefined,
      })
    ).toBe("/marketplace?q=phone&type=auction&category=vehicles");
  });

  it("keeps the selected parent and other filters when choosing a subcategory", () => {
    const current =
      "/marketplace?q=phone&type=fixed&category=electronics&page=2";
    expect(
      buildMarketplaceLocation(current, {
        subcategory: "phones",
        page: undefined,
      })
    ).toBe(
      "/marketplace?q=phone&type=fixed&category=electronics&subcategory=phones"
    );
  });

  it("removes the subcategory to return to All without losing the parent category", () => {
    const current = "/marketplace?category=electronics&subcategory=phones";
    expect(buildMarketplaceLocation(current, { subcategory: undefined })).toBe(
      "/marketplace?category=electronics"
    );
  });
});
