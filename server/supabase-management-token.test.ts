import { describe, expect, it } from "vitest";

const projectRef = "gvecaunkosyihqopturs";

describe("Supabase management token", () => {
  it("can read the configured Supabase project", async () => {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    expect(token, "SUPABASE_ACCESS_TOKEN is required to apply this migration").toBeTruthy();

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
  });
});
