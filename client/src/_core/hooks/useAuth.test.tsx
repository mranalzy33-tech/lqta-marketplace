// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import PreferenceControls from "@/components/PreferenceControls";
import { ThemeProvider } from "@/contexts/ThemeContext";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: {
        me: {
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
    }),
    auth: {
      me: {
        useQuery: () => ({
          data: {
            id: "member-42",
            preferredLanguage: "ar",
          },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

import { useAuth } from "./useAuth";

function AuthConsumer() {
  const { user } = useAuth();
  return <output data-testid="auth-user">{user?.id}</output>;
}

function LocaleAndAuthHarness() {
  const { language } = useLocale();
  const [routeKey, setRouteKey] = useState(0);
  return (
    <>
      <output data-testid="language">{language}</output>
      <PreferenceControls compact />
      <button
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("lqta:preferred-language", {
              detail: { language: "ar", userId: "member-42" },
            })
          )
        }
      >
        sync saved language
      </button>
      <button onClick={() => setRouteKey(value => value + 1)}>
        remount route
      </button>
      <AuthConsumer key={routeKey} />
    </>
  );
}

afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "";
  document.documentElement.dir = "";
});

describe("useAuth locale synchronization", () => {
  it("does not revert a manual language choice when a route remounts", () => {
    render(
      <LocaleProvider>
        <ThemeProvider>
          <LocaleAndAuthHarness />
        </ThemeProvider>
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByTestId("language").textContent).toBe("en");

    fireEvent.click(screen.getByText("sync saved language"));
    expect(screen.getByTestId("language").textContent).toBe("en");

    fireEvent.click(screen.getByText("remount route"));
    expect(screen.getByTestId("language").textContent).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
