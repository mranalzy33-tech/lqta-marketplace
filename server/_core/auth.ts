import type { Request } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import * as marketplace from "../db";
import { getSupabaseAdmin } from "../supabase/client";

export async function authenticateSupabaseRequest(req: Request) {
  const authorization = req.headers.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw ForbiddenError("Invalid session token");

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw ForbiddenError("Invalid session token");
  const metadata = data.user.user_metadata ?? {};
  const profileInput = {
    authId: data.user.id,
    email: data.user.email,
    name: typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null,
    ...(typeof metadata.city === "string" ? { city: metadata.city } : {}),
    ...(typeof metadata.street_address === "string" ? { streetAddress: metadata.street_address } : {}),
    ...(typeof metadata.phone === "string" ? { phone: metadata.phone } : {}),
  };
  const profile = await marketplace.upsertSupabaseAuthUser(profileInput);
  if (profile.isBanned) throw ForbiddenError("User is banned");
  return profile;
}
