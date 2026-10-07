import { describe, expect, it, vi } from "vitest";
import type { AdminPermission } from "../shared/adminPermissions";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getAdminCategories: vi.fn().mockResolvedValue([]),
  createAdminCategory: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000000", name: "أجهزة", slug: "devices", icon: null }),
  getAdminStaff: vi.fn().mockResolvedValue({ items: [], page: 1, hasMore: false }),
  setDelegatedAdminPermissions: vi.fn().mockResolvedValue({ userId: "22222222-2222-4222-8222-222222222222", permissions: ["admin.categories.manage"] }),
  removeDelegatedAdminPermissions: vi.fn().mockResolvedValue({ userId: "22222222-2222-4222-8222-222222222222" }),
  getPublicSponsoredCampaigns: vi.fn().mockResolvedValue([]),
  getAdminSponsoredCampaigns: vi.fn().mockResolvedValue([]),
  SPONSORED_CAMPAIGN_MIGRATION_REQUIRED: "SPONSORED_CAMPAIGN_MIGRATION_REQUIRED",
  createSponsoredCampaign: vi.fn().mockImplementation(async (input: Record<string, unknown>) => ({ id: "33333333-3333-4333-8333-333333333333", ...input })),
  uploadSponsoredCampaignImage: vi.fn().mockResolvedValue({ url: "https://storage.example.test/ad.jpg" }),
  updateSponsoredCampaign: vi.fn().mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" }),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

function createContext(role: "user" | "super_admin", adminPermissions: AdminPermission[] = []): TrpcContext {
  return {
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      authId: "delegated-contract-test",
      name: "اختبار",
      email: "test@example.test",
      loginMethod: "test",
      role,
      isSeller: false,
      isBanned: false,
      preferredLanguage: "ar",
      adminPermissions,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("delegated administrator contracts", () => {
  it("permits a category manager to view and add categories without granting staff management", async () => {
    const caller = appRouter.createCaller(createContext("user", ["admin.categories.manage"]));

    await expect(caller.admin.categories()).resolves.toEqual([]);
    await expect(caller.admin.createCategory({ name: "أجهزة", slug: "devices" })).resolves.toMatchObject({ slug: "devices" });
    await expect(caller.admin.staff({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permits only the super administrator to list potential staff accounts", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await expect(caller.admin.staff({ page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
  });

  it("rejects delegated administrators from changing staff permissions and accepts the super administrator", async () => {
    const delegatedCaller = appRouter.createCaller(createContext("user", ["admin.categories.manage"]));
    await expect(delegatedCaller.admin.assignStaffPermissions({ userId: "22222222-2222-4222-8222-222222222222", permissions: ["admin.categories.manage"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(delegatedCaller.admin.removeStaffPermissions({ userId: "22222222-2222-4222-8222-222222222222" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const superAdminCaller = appRouter.createCaller(createContext("super_admin"));
    await expect(superAdminCaller.admin.assignStaffPermissions({ userId: "22222222-2222-4222-8222-222222222222", permissions: ["admin.categories.manage"] })).resolves.toMatchObject({ permissions: ["admin.categories.manage"] });
    await expect(superAdminCaller.admin.removeStaffPermissions({ userId: "22222222-2222-4222-8222-222222222222" })).resolves.toMatchObject({ userId: "22222222-2222-4222-8222-222222222222" });
    expect(mocks.setDelegatedAdminPermissions).toHaveBeenCalledWith(expect.objectContaining({ actorId: "11111111-1111-1111-1111-111111111111" }));
    expect(mocks.removeDelegatedAdminPermissions).toHaveBeenCalledWith(expect.objectContaining({ actorId: "11111111-1111-1111-1111-111111111111" }));
  });

  it("keeps sponsored-campaign reads and writes behind their dedicated permissions while public ads remain readable", async () => {
    const regular = appRouter.createCaller(createContext("user"));
    await expect(regular.marketplace.sponsoredAds()).resolves.toEqual([]);

    const categoryManager = appRouter.createCaller(createContext("user", ["admin.categories.manage"]));
    await expect(categoryManager.admin.sponsoredAds()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(categoryManager.admin.createSponsoredAd({ companyName: "شركة", title: "عرض", description: "وصف العرض", imageUrl: "https://cdn.example.test/a.jpg", targetUrl: "https://example.test", sortOrder: 0, isActive: false })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adsManager = appRouter.createCaller(createContext("user", ["admin.ads.manage"]));
    await expect(adsManager.admin.sponsoredAds()).resolves.toEqual([]);
    mocks.getAdminSponsoredCampaigns.mockRejectedValueOnce(new Error("SPONSORED_CAMPAIGN_MIGRATION_REQUIRED"));
    await expect(adsManager.admin.sponsoredAds()).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("20260925_add_sponsored_campaigns.sql") });
    await expect(adsManager.admin.createSponsoredAd({ companyName: "شركة", title: "عرض", description: "وصف العرض", imageUrl: "https://cdn.example.test/a.jpg", targetUrl: "https://example.test", sortOrder: 0, isActive: false })).resolves.toMatchObject({ createdBy: "11111111-1111-1111-1111-111111111111" });
    await expect(adsManager.admin.createSponsoredAd({ companyName: "شركة", title: "عرض", description: "وصف العرض", imageUrl: "https://cdn.example.test/a.jpg", targetUrl: "javascript:alert(1)", sortOrder: 0, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(adsManager.admin.createSponsoredAd({ companyName: "شركة", title: "عرض", description: "وصف العرض", imageUrl: "https://cdn.example.test/a.jpg", targetUrl: "https://example.test", startsAt: "2026-10-02T00:00:00.000Z", endsAt: "2026-10-01T00:00:00.000Z", sortOrder: 0, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
