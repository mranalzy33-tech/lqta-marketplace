export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Navigate to the application-owned Supabase Auth screen from an event handler. */
export const startLogin = () => window.location.assign("/login");
