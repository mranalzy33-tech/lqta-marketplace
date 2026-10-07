import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  saveLanguage: vi.fn(),
  createCategory: vi.fn(),
}));

vi.mock("./db", () => ({
  setUserPreferredLanguage: mocks.saveLanguage,
  createAdminCategory: mocks.createCategory,
}));

import { appRouter } from "./routers";

function context(role: "user" | "super_admin" = "user"): TrpcContext {
  return {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      authId: "account-localization-test",
      name: "Localizer",
      email: "localizer@example.com",
      loginMethod: "supabase",
      role,
      isSeller: false,
      isBanned: false,
      preferredLanguage: "ar",
      adminPermissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("localized categories and account language", () => {
  it("saves only the authenticated user’s chosen default language", async () => {
    mocks.saveLanguage.mockResolvedValue({ preferredLanguage: "en" });
    const caller = appRouter.createCaller(context());
    await expect(caller.account.setPreferredLanguage({ language: "en" })).resolves.toEqual({ preferredLanguage: "en" });
    expect(mocks.saveLanguage).toHaveBeenCalledWith({ userId: "11111111-1111-4111-8111-111111111111", language: "en" });
  });

  it("allows only a category manager or super administrator to add the English category name", async () => {
    mocks.createCategory.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", name: "إلكترونيات", name_en: "Electronics", slug: "electronics", icon: null });
    const caller = appRouter.createCaller(context("super_admin"));
    await expect(caller.admin.createCategory({ name: "إلكترونيات", nameEn: "Electronics", slug: "electronics" })).resolves.toMatchObject({ name_en: "Electronics" });
    expect(mocks.createCategory).toHaveBeenCalledWith({ name: "إلكترونيات", nameEn: "Electronics", slug: "electronics" });
  });
});
