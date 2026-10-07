// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  user: { id: "member-1" } as { id: string } | null,
  setLocation: vi.fn(),
  notificationsQuery: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ["/", mocks.setLocation],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock("@/components/PreferenceControls", () => ({
  default: () => <div data-testid="preferences" />,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: {
      notifications: {
        useQuery: (...args: unknown[]) => mocks.notificationsQuery(...args),
      },
    },
  },
}));

import MarketplaceShell from "./marketplace/MarketplaceShell";

afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  mocks.user = { id: "member-1" };
  mocks.setLocation.mockReset();
  mocks.notificationsQuery.mockReset().mockReturnValue({
    data: [
      { id: "n1", is_read: false },
      { id: "n2", is_read: true },
      { id: "n3", is_read: false },
    ],
  });
});

function renderShell() {
  return render(
    <LocaleProvider>
      <MarketplaceShell>
        <main>المحتوى</main>
      </MarketplaceShell>
    </LocaleProvider>
  );
}

describe("MarketplaceShell notification badge", () => {
  it("shows the unread count and accessible notification label for a signed-in user", () => {
    renderShell();
    const notificationLink = screen.getByRole("link", {
      name: "الإشعارات، 2 غير مقروءة",
    });
    expect(notificationLink.getAttribute("href")).toBe("/notifications");
    expect(screen.getByText("2")).toBeTruthy();
    expect(mocks.notificationsQuery).toHaveBeenCalledWith(undefined, {
      enabled: true,
      staleTime: 30_000,
      refetchInterval: 60_000,
    });
  });

  it("does not expose the private notification count to signed-out visitors", () => {
    mocks.user = null;
    renderShell();
    expect(screen.queryByRole("link", { name: /الإشعارات/ })).toBeNull();
    expect(mocks.notificationsQuery).toHaveBeenCalledWith(undefined, {
      enabled: false,
      staleTime: 30_000,
      refetchInterval: false,
    });
  });
});
