// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  markReadMutate: vi.fn(),
}));

vi.mock("@/components/MarketplaceDashboardLayout", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: {
      notifications: {
        useQuery: () => ({ isLoading: false, isError: false, data: [{ id: "n1", message: "رسالة اختبار", is_read: false, created_at: "2026-01-01T00:00:00Z" }], refetch: vi.fn() }),
      },
      markNotificationRead: { useMutation: () => ({ mutate: mocks.markReadMutate, isPending: false }) },
    },
    useUtils: () => ({ account: { notifications: { invalidate: mocks.invalidate } } }),
  },
}));

function LanguageToggle() {
  const { toggleLanguage } = useLocale();
  return <button onClick={toggleLanguage}>toggle</button>;
}

import Notifications from "./Notifications";

describe("Notifications page localization", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("renders from the central dictionary in Arabic and switches fully to English", async () => {
    render(
      <LocaleProvider>
        <LanguageToggle />
        <Notifications />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "الإشعارات" })).toBeTruthy();
    expect(screen.getByText("تابع تحديثات الإعلانات والعروض والعمليات المرتبطة بحسابك.")).toBeTruthy();
    expect(screen.getByText("قراءة")).toBeTruthy();

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy());
    expect(screen.getByText("Follow listing, offer, and account activity updates.")).toBeTruthy();
    expect(screen.getByText("Mark as read")).toBeTruthy();
    expect(screen.queryByText("قراءة")).toBeNull();
  });
});
