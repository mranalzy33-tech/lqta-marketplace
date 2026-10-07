// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ language: "ar" }));

vi.mock("wouter", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/marketplace/MarketplaceShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    language: mocks.language,
    t: (key: string) => key,
  }),
}));

import About from "./About";
import Contact from "./Contact";

afterEach(() => cleanup());

describe("public information pages", () => {
  it("renders the about page with real marketplace destinations", () => {
    render(<About />);

    expect(screen.getByRole("heading", { name: "about.title" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /about.browseAction/ })
        .getAttribute("href")
    ).toBe("/marketplace");
    expect(
      screen
        .getByRole("link", { name: "about.sellAction" })
        .getAttribute("href")
    ).toBe("/seller");
  });

  it("shows real contact paths and does not render a nonfunctional public form", () => {
    render(<Contact />);

    expect(screen.getByRole("heading", { name: "contact.title" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /contact.browseAction/ })
        .getAttribute("href")
    ).toBe("/marketplace");
    expect(
      screen
        .getByRole("link", { name: /contact.disputeAction/ })
        .getAttribute("href")
    ).toBe("/disputes");
    expect(screen.getByText("contact.channelsDescription")).toBeTruthy();
    expect(document.querySelector("form")).toBeNull();
  });

  it("keeps English language selection compatible with the same public pages", () => {
    mocks.language = "en";
    const { unmount } = render(<About />);
    expect(screen.getByRole("heading", { name: "about.title" })).toBeTruthy();
    unmount();
    mocks.language = "ar";
  });
});
