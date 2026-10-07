import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { AdminPermission } from "../../shared/adminPermissions";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export function getAuthenticatedUser(user: TrpcContext["user"]) {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return user;
}

function requireRole(allowedRoles: readonly ("super_admin" | "support_staff")[]) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !allowedRoles.some(role => role === ctx.user?.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const sellerProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = getAuthenticatedUser(opts.ctx.user);
    if (!user.isSeller && user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا تتوفر لك صلاحية البائع." });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);

export const supportProcedure = protectedProcedure.use(requireRole(["support_staff", "super_admin"]));
export const adminProcedure = protectedProcedure.use(requireRole(["super_admin"]));

function requireAdminPermission(permission: AdminPermission) {
  return t.middleware(async opts => {
    const user = getAuthenticatedUser(opts.ctx.user);
    const assigned = user.adminPermissions ?? [];
    const impliedManagerPermission = permission.endsWith(".read") ? (`${permission.slice(0, -".read".length)}.manage` as AdminPermission) : null;
    if (user.role !== "super_admin" && !assigned.includes(permission) && (!impliedManagerPermission || !assigned.includes(impliedManagerPermission))) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  });
}

export const anyAdminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = getAuthenticatedUser(opts.ctx.user);
    if (user.role !== "super_admin" && (user.adminPermissions ?? []).length === 0) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);

export function adminPermissionProcedure(permission: AdminPermission) {
  return protectedProcedure.use(requireAdminPermission(permission));
}
