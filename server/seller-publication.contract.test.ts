import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const listings: Array<{ id: string; title: string; status: string; type: string; created_at: string }> = [];
  const createListing = vi.fn(async (input: { title: string; type: string }) => { const listing = { id: "33333333-3333-3333-3333-333333333333", title: input.title, status: "pending", type: input.type, created_at: new Date().toISOString() }; listings.push(listing); return listing; });
  const getSellerWorkspace = vi.fn(async () => ({ walletBalance: 0, listings, transactions: [] }));
  return { createListing, getSellerWorkspace, listings };
});
vi.mock("./db", () => ({ createListing: mocks.createListing, getSellerWorkspace: mocks.getSellerWorkspace }));

import { appRouter } from "./routers";

const categoryId = "22222222-2222-4222-8222-222222222222";
function createContext(role: "user" | "super_admin", isSeller = false): TrpcContext {
  return { user: { id: "11111111-1111-1111-1111-111111111111", authId: "seller-contract-test", name: "اختبار", email: "seller@example.test", loginMethod: "test", role, isSeller, isBanned: false, preferredLanguage: "ar", adminPermissions: [], createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("seller.createListing contract", () => {
  it("creates a pending listing for a permitted seller and returns it to the dashboard", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await expect(caller.seller.createListing({ categoryId, title: "ساعة تجريبية", description: "وصف واضح وكافٍ للإعلان", type: "fixed", fixedPrice: 2000, startingPrice: undefined })).resolves.toMatchObject({ status: "pending", title: "ساعة تجريبية" });
    expect(mocks.createListing).toHaveBeenCalledWith(expect.objectContaining({ sellerId: "11111111-1111-1111-1111-111111111111", categoryId, fixedPrice: 2000 }));
  });

  it("surfaces the newly created pending listing in the seller workspace sequence", async () => {
    mocks.listings.splice(0);
    const caller = appRouter.createCaller(createContext("super_admin"));
    await caller.seller.createListing({ categoryId, title: "ساعة العمل", description: "وصف واضح وكافٍ للإعلان الجديد", type: "fixed", fixedPrice: 3000, startingPrice: undefined });
    await expect(caller.seller.workspace()).resolves.toMatchObject({ listings: [expect.objectContaining({ title: "ساعة العمل", status: "pending" })] });
  });

  it("rejects a non-seller before it can create a listing", async () => {
    const caller = appRouter.createCaller(createContext("user", false));
    await expect(caller.seller.createListing({ categoryId, title: "ساعة تجريبية", description: "وصف واضح وكافٍ للإعلان", type: "fixed", fixedPrice: 2000, startingPrice: undefined })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects incomplete publication input with a validation error", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await expect(caller.seller.createListing({ categoryId, title: "س", description: "قصير", type: "fixed", fixedPrice: 0, startingPrice: undefined })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
