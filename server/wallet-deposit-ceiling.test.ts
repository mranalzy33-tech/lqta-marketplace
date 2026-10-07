import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("./supabase/client", () => ({ getSupabaseAdmin: () => ({ rpc }) }));

import { depositWallet } from "./db";

describe("wallet deposit amount ceiling", () => {
  it("rejects an amount above the 1,000,000 ceiling before ever calling the database RPC", async () => {
    await expect(depositWallet("11111111-1111-1111-1111-111111111111", 1_000_001)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-positive or non-finite amount before calling the database RPC", async () => {
    await expect(depositWallet("11111111-1111-1111-1111-111111111111", 0)).rejects.toThrow();
    await expect(depositWallet("11111111-1111-1111-1111-111111111111", -5)).rejects.toThrow();
    await expect(depositWallet("11111111-1111-1111-1111-111111111111", Number.NaN)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the deposit_wallet RPC with the exact user id and amount for a valid deposit", async () => {
    rpc.mockResolvedValueOnce({ error: null });
    await depositWallet("11111111-1111-1111-1111-111111111111", 500);
    expect(rpc).toHaveBeenCalledWith("deposit_wallet", { p_user_id: "11111111-1111-1111-1111-111111111111", p_amount: 500 });
  });

  it("propagates a database-level rejection (e.g. from the deposit_wallet SQL ceiling) as an error", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "amount_exceeds_limit" } });
    await expect(depositWallet("11111111-1111-1111-1111-111111111111", 999_999)).rejects.toThrow();
  });
});
