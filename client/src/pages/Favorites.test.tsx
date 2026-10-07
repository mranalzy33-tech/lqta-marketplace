// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";

vi.mock("@/components/MarketplaceDashboardLayout", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));

vi.mock("@/components/marketplace/ListingCard", () => ({
  default: () => <div>listing-card</div>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: {
      favorites: { useQuery: () => ({ isLoading: false, isError: false, data: [], refetch: vi.fn() }) },
    },
  },
}));

function LanguageToggle() {
  const { toggleLanguage } = useLocale();
  return <button onClick={toggleLanguage}>toggle</button>;
}

import Favorites from "./Favorites";

describe("Favorites page localization", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("renders empty-state copy from the central dictionary in Arabic and switches fully to English", async () => {
    render(
      <LocaleProvider>
        <LanguageToggle />
        <Favorites />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "المفضلة" })).toBeTruthy();
    expect(screen.getByText("قائمة المفضلة فارغة")).toBeTruthy();

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Favorites" })).toBeTruthy());
    expect(screen.getByText("Your favorites list is empty")).toBeTruthy();
    expect(screen.queryByText("قائمة المفضلة فارغة")).toBeNull();
  });
});
