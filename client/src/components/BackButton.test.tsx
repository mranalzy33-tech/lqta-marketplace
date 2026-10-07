// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  location: "/listing/11111111-1111-1111-1111-111111111111",
  setLocation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [mocks.location, mocks.setLocation],
}));

import BackButton, { fallbackFor, getBackTarget } from "./BackButton";

describe("BackButton fallbackFor", () => {
  it("returns the correct safe parent route for internal destinations", () => {
    expect(fallbackFor("/admin/listings")).toBe("/admin");
    expect(fallbackFor("/listing/11111111-1111-1111-1111-111111111111")).toBe("/marketplace");
    expect(fallbackFor("/messages")).toBe("/seller");
    expect(fallbackFor("/marketplace")).toBe("/");
  });

  it("uses browser history only when the previous route belongs to this site", () => {
    expect(getBackTarget("/admin/listings", true, 3)).toEqual({ type: "history" });
    expect(getBackTarget("/admin/listings", false, 3)).toEqual({ type: "fallback", path: "/admin" });
    expect(getBackTarget("/listing/item", true, 1)).toEqual({ type: "fallback", path: "/marketplace" });
  });
});

describe("BackButton interactions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.location = "/listing/11111111-1111-1111-1111-111111111111";
    mocks.setLocation.mockReset();
    Object.defineProperty(document, "referrer", { configurable: true, value: "" });
    Object.defineProperty(window.history, "length", { configurable: true, value: 1 });
  });

  it("navigates to the safe fallback when there is no same-site history", () => {
    render(<LocaleProvider><BackButton /></LocaleProvider>);

    fireEvent.click(screen.getByRole("button", { name: /رجوع/ }));

    expect(mocks.setLocation).toHaveBeenCalledWith("/marketplace");
  });

  it("uses browser history only when the referrer is from this site", () => {
    Object.defineProperty(document, "referrer", { configurable: true, value: `${window.location.origin}/marketplace` });
    Object.defineProperty(window.history, "length", { configurable: true, value: 2 });
    const historyBack = vi.spyOn(window.history, "back").mockImplementation(() => undefined);

    render(<LocaleProvider><BackButton /></LocaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: /رجوع/ }));

    expect(historyBack).toHaveBeenCalledOnce();
    expect(mocks.setLocation).not.toHaveBeenCalled();
    historyBack.mockRestore();
  });
});
