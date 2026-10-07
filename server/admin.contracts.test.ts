import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getAdminUsers: vi.fn().mockResolvedValue({ items: [], page: 1, hasMore: false }),
  getAdminListings: vi.fn().mockResolvedValue({ items: [], page: 1, hasMore: false }),
  getAdminAuctions: vi.fn().mockResolvedValue({ items: [], page: 1, hasMore: false }),
  updateAdminListingStatus: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000000", status: "active" }),
  setUserBanStatus: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000000", is_banned: true }),
}));

import { appRouter } from "./routers";

function createContext(role: "user" | "super_admin"): TrpcContext {
  return { user: { id: "11111111-1111-1111-1111-111111111111", authId: "admin-contract-test", name: "اختبار", email: "test@example.test", loginMethod: "test", role, isSeller: false, isBanned: false, preferredLanguage: "ar", adminPermissions: [], createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("admin management contracts", () => {
  it("rejects ordinary users from every management list", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.users({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listings({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.auctions({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permits a super administrator to request the management lists", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await expect(caller.admin.users({ page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
    await expect(caller.admin.listings({ page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
    await expect(caller.admin.auctions({ page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
  });
});
