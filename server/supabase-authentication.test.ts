import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("./supabase/client", () => ({
  getSupabaseAdmin: () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("./db", () => ({
  upsertSupabaseAuthUser: mocks.upsert,
}));

import { authenticateSupabaseRequest } from "./_core/auth";

const profile = {
  id: "11111111-1111-4111-8111-111111111111",
  authId: "external-auth-id",
  name: "External user",
  email: "external@example.com",
  loginMethod: "supabase",
  role: "user" as const,
  isSeller: false,
  isBanned: false,
  preferredLanguage: "ar" as const,
  adminPermissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("Supabase external authentication", () => {
  it("links the verified Supabase identity to a marketplace profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "22222222-2222-4222-8222-222222222222", email: "external@example.com", user_metadata: { full_name: "External user" } } }, error: null });
    mocks.upsert.mockResolvedValue(profile);
    await expect(authenticateSupabaseRequest({ headers: { authorization: "Bearer signed-token" } } as any)).resolves.toEqual(profile);
    expect(mocks.upsert).toHaveBeenCalledWith({ authId: "22222222-2222-4222-8222-222222222222", email: "external@example.com", name: "External user" });
  });

  it("refuses a request without a Supabase bearer token", async () => {
    await expect(authenticateSupabaseRequest({ headers: {} } as any)).rejects.toBeTruthy();
  });
});
