import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { adminProcedure, router } from "./_core/trpc";

type MarketplaceRole = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: MarketplaceRole): TrpcContext {
  return {
    user: {
      id: `admin-test-${role}`,
      authId: `admin-auth-${role}`,
      name: "اختبار",
      email: `${role}@example.test`,
      loginMethod: "test",
      role,
      isSeller: false,
      isBanned: false,
      preferredLanguage: "ar",
      adminPermissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const adminOnlyRouter = router({
  manage: adminProcedure.query(() => ({ allowed: true })),
});

describe("adminProcedure", () => {
  it("rejects ordinary users and support staff", async () => {
    await expect(adminOnlyRouter.createCaller(createContext("user")).manage()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminOnlyRouter.createCaller(createContext("support_staff")).manage()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the super administrator", async () => {
    await expect(adminOnlyRouter.createCaller(createContext("super_admin")).manage()).resolves.toEqual({ allowed: true });
  });
});
