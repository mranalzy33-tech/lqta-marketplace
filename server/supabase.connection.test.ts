import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("Supabase connection configuration", () => {
  it("uses a server-only service-role key rather than a browser-safe anonymous key", () => {
    expect(serviceRoleKey).toBeTruthy();

    const tokenParts = (serviceRoleKey as string).split(".");
    const isLegacyServiceRoleJwt = tokenParts.length === 3 && (() => {
      const payload = JSON.parse(Buffer.from(tokenParts[1], "base64url").toString("utf8")) as { role?: string };
      return payload.role === "service_role";
    })();
    const isModernSecretKey = (serviceRoleKey as string).startsWith("sb_secret_");

    expect(isLegacyServiceRoleJwt || isModernSecretKey).toBe(true);
  });

  it("authenticates a lightweight server-side health request", async () => {
    expect(supabaseUrl).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey as string}`,
      },
    });

    expect(response.ok).toBe(true);
  });

  it("can read a zero-row protected table through the server-only credential", async () => {
    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey as string}`,
      },
    });

    expect(response.ok).toBe(true);
  });
});
