import { describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("./supabase/client", () => ({ getSupabaseAdmin: () => ({ from }) }));

import { becomeSeller } from "./db";

function selectChain(result: { data: unknown; error: unknown }) {
  return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }) };
}
function updateChain(result: { error: unknown }) {
  return { update: () => ({ eq: () => Promise.resolve(result) }) };
}

describe("becomeSeller", () => {
  it("rejects when the account does not exist", async () => {
    from.mockReturnValueOnce(selectChain({ data: null, error: null }));
    await expect(becomeSeller("11111111-1111-1111-1111-111111111111")).rejects.toThrow();
  });

  it("rejects for a banned account without ever attempting the update", async () => {
    from.mockReset();
    from.mockReturnValueOnce(selectChain({ data: { is_banned: true, is_seller: false }, error: null }));
    await expect(becomeSeller("11111111-1111-1111-1111-111111111111")).rejects.toThrow();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: returns success without a write when the account is already a seller", async () => {
    from.mockReset();
    from.mockReturnValueOnce(selectChain({ data: { is_banned: false, is_seller: true }, error: null }));
    const result = await becomeSeller("11111111-1111-1111-1111-111111111111");
    expect(result).toEqual({ isSeller: true });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("activates seller access for an eligible account", async () => {
    from.mockReset();
    from.mockReturnValueOnce(selectChain({ data: { is_banned: false, is_seller: false }, error: null }));
    from.mockReturnValueOnce(updateChain({ error: null }));
    const result = await becomeSeller("11111111-1111-1111-1111-111111111111");
    expect(result).toEqual({ isSeller: true });
    expect(from).toHaveBeenCalledTimes(2);
  });
});
