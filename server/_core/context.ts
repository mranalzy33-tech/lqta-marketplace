import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { MarketplaceSessionUser } from "../db";
import { authenticateSupabaseRequest } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: MarketplaceSessionUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: MarketplaceSessionUser | null = null;

  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
