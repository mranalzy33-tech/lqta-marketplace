// @vitest-environment jsdom
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
const mocks = vi.hoisted(() => ({
  saveMutate: vi.fn(),
  invalidateMe: vi.fn(),
  invalidateSettings: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/components/marketplace/MarketplaceShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Test User", email: "user@example.com" },
    loading: false,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
    },
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: {
      settings: {
        useQuery: () => ({
          data: { preferredLanguage: "ar" },
          isLoading: false,
        }),
      },
      setPreferredLanguage: {
        useMutation: () => ({ mutate: mocks.saveMutate, isPending: false }),
      },
    },
    auth: { me: { invalidate: mocks.invalidateMe } },
    useUtils: () => ({
      auth: { me: { invalidate: mocks.invalidateMe } },
      account: { settings: { invalidate: mocks.invalidateSettings } },
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import AccountSettings from "./AccountSettings";

function LanguageToggle() {
  const { toggleLanguage } = useLocale();
  return <button onClick={toggleLanguage}>toggle</button>;
}

describe("AccountSettings page localization", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
    mocks.saveMutate.mockReset();
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.updateUser.mockReset().mockResolvedValue({ error: null });
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("renders the language-preference screen from the central dictionary in Arabic and fully switches to English", async () => {
    render(
      <LocaleProvider>
        <LanguageToggle />
        <AccountSettings />
      </LocaleProvider>
    );

    expect(
      screen.getByRole("heading", { name: "اللغة الافتراضية" })
    ).toBeTruthy();
    expect(screen.getByText("واجهة من اليمين إلى اليسار")).toBeTruthy();

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Default language" })
      ).toBeTruthy()
    );
    expect(screen.getByText("Right-to-left interface")).toBeTruthy();
    expect(screen.queryByText("اللغة الافتراضية")).toBeNull();
    expect(screen.queryByText("واجهة من اليمين إلى اليسار")).toBeNull();
  });

  it("calls the language mutation with the chosen language when an option is selected", () => {
    render(
      <LocaleProvider>
        <AccountSettings />
      </LocaleProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /الإنجليزية/ }));
    expect(mocks.saveMutate).toHaveBeenCalledWith({ language: "en" });
  });

  it("shows the signed-in user's profile and password controls in the account dashboard", () => {
    render(
      <LocaleProvider>
        <AccountSettings />
      </LocaleProvider>
    );

    expect(screen.getByRole("heading", { name: "لوحة حسابي" })).toBeTruthy();
    expect(screen.getByText("Test User")).toBeTruthy();
    expect(screen.getByText("user@example.com")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "تغيير كلمة المرور" })
    ).toBeTruthy();
    expect(screen.getByLabelText("كلمة المرور الحالية")).toBeTruthy();
  });

  it("reauthenticates with the current password before applying the new password", async () => {
    render(
      <LocaleProvider>
        <AccountSettings />
      </LocaleProvider>
    );
    fireEvent.change(screen.getByLabelText("كلمة المرور الحالية"), {
      target: { value: "old-pass" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), {
      target: { value: "new-pass" },
    });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور الجديدة"), {
      target: { value: "new-pass" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "تغيير كلمة المرور" }).closest("form")!
    );

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "old-pass",
      })
    );
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-pass" });
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("does not call Supabase when the new password confirmation does not match", async () => {
    render(
      <LocaleProvider>
        <AccountSettings />
      </LocaleProvider>
    );
    fireEvent.change(screen.getByLabelText("كلمة المرور الحالية"), {
      target: { value: "old-pass" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), {
      target: { value: "new-pass" },
    });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور الجديدة"), {
      target: { value: "different-pass" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "تغيير كلمة المرور" }).closest("form")!
    );

    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalled();
  });
});
