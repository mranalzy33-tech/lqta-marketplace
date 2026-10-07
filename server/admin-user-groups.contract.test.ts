import { describe, expect, it, vi } from "vitest";
import type { AdminPermission } from "../shared/adminPermissions";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getAdminUsers: vi.fn().mockResolvedValue({ items: [], page: 1, hasMore: false }),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

function createContext(role: "user" | "super_admin", adminPermissions: AdminPermission[] = []): TrpcContext {
  return {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      authId: "account-group-test",
      name: "اختبار",
      email: "groups@example.test",
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

describe("administrator user grouping contract", () => {
  it("passes the requested account group and includes permission details only for the super administrator", async () => {
    const superAdmin = appRouter.createCaller(createContext("super_admin"));
    await expect(superAdmin.admin.users({ group: "administrators", page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
    expect(mocks.getAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ group: "administrators", includePermissions: true }));

    const delegatedUserReader = appRouter.createCaller(createContext("user", ["admin.users.read"]));
    await expect(delegatedUserReader.admin.users({ group: "regular", page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [] });
    expect(mocks.getAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ group: "regular", includePermissions: false }));
  });

  it("rejects an invalid account group before accessing the database", async () => {
    const superAdmin = appRouter.createCaller(createContext("super_admin"));
    await expect(superAdmin.admin.users({ group: "staff" as never, page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
