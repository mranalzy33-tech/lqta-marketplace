import { describe, expect, it, vi } from "vitest";

const selectSpy = vi.fn();
const from = vi.fn((table: string) => {
  if (table === "admin_permissions") {
    return { select: () => Promise.resolve({ data: [], error: null }) };
  }
  const chain: any = {
    select: (columns: string) => { selectSpy(columns); return chain; },
    order: () => chain,
    range: () => chain,
    ilike: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    not: () => chain,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return chain;
});
vi.mock("./supabase/client", () => ({ getSupabaseAdmin: () => ({ from }) }));

import { getAdminUsers } from "./db";

describe("getAdminUsers column selection", () => {
  it("does not request is_verified or kyc_status, which do not exist in the users table schema", async () => {
    await getAdminUsers({ page: 1, pageSize: 20 });
    const usersSelectCall = selectSpy.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("email"));
    expect(usersSelectCall).toBeDefined();
    const columns = usersSelectCall![0] as string;
    expect(columns).not.toContain("is_verified");
    expect(columns).not.toContain("kyc_status");
    // Sanity check: the columns the page actually renders are still requested.
    expect(columns).toContain("is_seller");
    expect(columns).toContain("is_banned");
  });
});
