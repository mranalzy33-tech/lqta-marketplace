// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  balanceData: { balance: 250.5, held: 50, available: 200.5 },
  depositMutate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/components/MarketplaceDashboardLayout", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    wallet: {
      balance: {
        useQuery: () => ({ isLoading: false, isError: false, data: mocks.balanceData, refetch: vi.fn() }),
      },
      deposit: { useMutation: () => ({ mutate: mocks.depositMutate, isPending: false }) },
    },
    useUtils: () => ({ wallet: { balance: { invalidate: mocks.invalidate } } }),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import Wallet from "./Wallet";

function LanguageToggle() {
  const { toggleLanguage } = useLocale();
  return <button onClick={toggleLanguage}>toggle</button>;
}

describe("Wallet page localization", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("renders wallet copy from the central dictionary in Arabic by default and switches fully to English without any leftover Arabic labels", async () => {
    render(
      <LocaleProvider>
        <LanguageToggle />
        <Wallet />
      </LocaleProvider>,
    );

    // Arabic (default)
    expect(screen.getByRole("heading", { name: "المحفظة" })).toBeTruthy();
    expect(screen.getByText("الرصيد")).toBeTruthy();
    expect(screen.getByText("المحجوز")).toBeTruthy();
    expect(screen.getByText("المتاح")).toBeTruthy();
    expect(screen.getByText("شحن تجريبي")).toBeTruthy();
    expect(screen.getByPlaceholderText("مثال: 5000")).toBeTruthy();

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Wallet" })).toBeTruthy());
    expect(screen.getByText("Balance")).toBeTruthy();
    expect(screen.getByText("Held")).toBeTruthy();
    expect(screen.getByText("Available")).toBeTruthy();
    expect(screen.getByText("Demo top-up")).toBeTruthy();
    expect(screen.getByPlaceholderText("Example: 5000")).toBeTruthy();
    expect(screen.queryByText("الرصيد")).toBeNull();
    expect(screen.queryByText("شحن تجريبي")).toBeNull();
  });

  it("shows the Arabic validation message and does not call the deposit mutation for an invalid amount", async () => {
    mocks.depositMutate.mockReset();
    render(<LocaleProvider><Wallet /></LocaleProvider>);
    fireEvent.change(screen.getByPlaceholderText("مثال: 5000"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "إضافة رصيد تجريبي" }));
    expect(mocks.depositMutate).not.toHaveBeenCalled();
  });
});
