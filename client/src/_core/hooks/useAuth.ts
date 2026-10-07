import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Dashboard and marketplace routes mount separate useAuth consumers. Apply the
// account's saved locale once per user per page session, not on every remount;
// otherwise a manual language toggle is immediately reverted to the profile's
// old value.
const preferredLanguageAppliedForUsers = new Set<string>();

export function useAuth(options?: UseAuthOptions) {
  // Login is started from an effect only when navigation is required, never while
  // rendering. This keeps redirects deterministic and avoids duplicate navigation.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "lqta.session-user-info",
        JSON.stringify(meQuery.data ?? null)
      );
    }
  }, [meQuery.data]);

  useEffect(() => {
    const preferredLanguage = meQuery.data?.preferredLanguage;
    const userId = meQuery.data?.id;
    if (
      userId &&
      !preferredLanguageAppliedForUsers.has(userId) &&
      (preferredLanguage === "ar" || preferredLanguage === "en")
    ) {
      preferredLanguageAppliedForUsers.add(userId);
      window.dispatchEvent(
        new CustomEvent("lqta:preferred-language", {
          detail: { language: preferredLanguage, userId },
        })
      );
    }
  }, [meQuery.data?.id, meQuery.data?.preferredLanguage]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate only after the authentication query has finished.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [redirectOnUnauthenticated, redirectPath, meQuery.isLoading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
