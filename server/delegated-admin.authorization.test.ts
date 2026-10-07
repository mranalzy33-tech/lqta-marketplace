import { describe, expect, it } from "vitest";
import type { AdminPermission } from "../shared/adminPermissions";
import type { TrpcContext } from "./_core/context";
import { adminPermissionProcedure, adminProcedure, anyAdminProcedure, router } from "./_core/trpc";

function createContext(role: "user" | "super_admin" | "support_staff", adminPermissions: AdminPermission[] = []): TrpcContext {
  return {
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      authId: "delegated-admin-test",
      name: "اختبار الصلاحيات",
      email: "permissions@example.test",
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

const permissionRouter = router({
  listingRead: adminPermissionProcedure("admin.listings.read").query(() => ({ allowed: "listings" })),
  userManage: adminPermissionProcedure("admin.users.manage").query(() => ({ allowed: "users" })),
  anyAdmin: anyAdminProcedure.query(() => ({ allowed: "admin" })),
  staffManagement: adminProcedure.query(() => ({ allowed: "staff" })),
});

describe("delegated administration permissions", () => {
  it("allows a delegated administrator only through the exact assigned capability", async () => {
    const caller = permissionRouter.createCaller(createContext("user", ["admin.listings.read"]));

    await expect(caller.listingRead()).resolves.toEqual({ allowed: "listings" });
    await expect(caller.anyAdmin()).resolves.toEqual({ allowed: "admin" });
    await expect(caller.userManage()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.staffManagement()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects users without delegated permissions and permits the super administrator", async () => {
    const ordinaryCaller = permissionRouter.createCaller(createContext("user"));
    await expect(ordinaryCaller.anyAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinaryCaller.listingRead()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const superAdminCaller = permissionRouter.createCaller(createContext("super_admin"));
    await expect(superAdminCaller.listingRead()).resolves.toEqual({ allowed: "listings" });
    await expect(superAdminCaller.userManage()).resolves.toEqual({ allowed: "users" });
    await expect(superAdminCaller.staffManagement()).resolves.toEqual({ allowed: "staff" });
  });
});
