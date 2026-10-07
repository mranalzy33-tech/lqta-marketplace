import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { TrpcContext } from "./_core/context";
import { getAuthenticatedUser, protectedProcedure, router, supportProcedure } from "./_core/trpc";

type MarketplaceRole = NonNullable<TrpcContext["user"]>["role"];

function contextFor(role: MarketplaceRole | null): TrpcContext {
  return {
    user: role ? {
      id: `user-${role}`,
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
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const contracts = router({
  sendMessage: protectedProcedure
    .input(z.object({ content: z.string().trim().min(1).max(2_000) }))
    .mutation(({ ctx }) => ({ senderId: getAuthenticatedUser(ctx.user).id })),
  resolveDispute: supportProcedure.mutation(() => ({ resolved: true })),
});

describe("conversation and dispute route guards", () => {
  it("rejects unauthenticated message actions", async () => {
    await expect(contracts.createCaller(contextFor(null)).sendMessage({ content: "رسالة" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows an authenticated user to use the protected message contract", async () => {
    await expect(contracts.createCaller(contextFor("user")).sendMessage({ content: "رسالة" })).resolves.toEqual({ senderId: "user-user" });
  });

  it("rejects a normal user from a support-only dispute action", async () => {
    await expect(contracts.createCaller(contextFor("user")).resolveDispute()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows support staff to use the dispute resolution contract", async () => {
    await expect(contracts.createCaller(contextFor("support_staff")).resolveDispute()).resolves.toEqual({ resolved: true });
  });
});
