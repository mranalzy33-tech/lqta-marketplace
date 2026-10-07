// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  setLocation: vi.fn(),
  signInWithPassword: vi.fn(),
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
  useLocation: () => ["/login", mocks.setLocation],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: mocks.signInWithPassword } },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: mocks.fetchMe } } }),
  },
}));

import { AuthForm } from "./AuthForm";

afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  mocks.fetchMe.mockReset();
  mocks.setLocation.mockReset();
  mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
});

async function submitLogin() {
  render(
    <LocaleProvider>
      <AuthForm mode="login" />
    </LocaleProvider>
  );
  fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: "password123" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "تسجيل الدخول" }).closest("form")!
  );
  await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalled());
}

describe("AuthForm post-login landing page", () => {
  it("sends a super admin to the admin dashboard based on the server profile", async () => {
    mocks.fetchMe.mockResolvedValue({ role: "super_admin" });
    await submitLogin();
    await waitFor(() =>
      expect(mocks.setLocation).toHaveBeenCalledWith("/admin")
    );
    expect(mocks.fetchMe).toHaveBeenCalledWith(undefined, { staleTime: 0 });
  });

  it("keeps members on the public home page", async () => {
    mocks.fetchMe.mockResolvedValue({ role: "user" });
    await submitLogin();
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/"));
  });

  it("does not redirect support staff into the system-admin dashboard", async () => {
    mocks.fetchMe.mockResolvedValue({ role: "support_staff" });
    await submitLogin();
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/"));
  });
});
