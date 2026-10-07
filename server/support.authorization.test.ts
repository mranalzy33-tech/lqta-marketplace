import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { router, supportProcedure } from "./_core/trpc";

type MarketplaceRole = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: MarketplaceRole): TrpcContext {
  return {
    user: {
      id: `test-${role}`,
      authId: `auth-${role}`,
      name: "Test User",
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

const supportOnlyRouter = router({
  queue: supportProcedure.query(() => ({ allowed: true })),
});

describe("supportProcedure", () => {
  it("rejects a normal marketplace user", async () => {
    const caller = supportOnlyRouter.createCaller(createContext("user"));
    await expect(caller.queue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a support staff member", async () => {
    const caller = supportOnlyRouter.createCaller(createContext("support_staff"));
    await expect(caller.queue()).resolves.toEqual({ allowed: true });
  });

  it("allows a super administrator", async () => {
    const caller = supportOnlyRouter.createCaller(createContext("super_admin"));
    await expect(caller.queue()).resolves.toEqual({ allowed: true });
  });
});
