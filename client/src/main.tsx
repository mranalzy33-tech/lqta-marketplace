import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { supabase } from "./lib/supabase";
import "./index.css";

// إضافة خيارات الذاكرة المؤقتة وتحسين الأداء هنا
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // تبقى البيانات صالحة لمدة 5 دقائق بدون إعادة طلب متكرر
      gcTime: 1000 * 60 * 10,     // الاحتفاظ بالبيانات في الذاكرة المؤقتة لمدة 10 دقائق
      refetchOnWindowFocus: false, // عدم إعادة جلب البيانات عند العودة للتبويب لتسريع الأداء
      retry: 1,                   // محاولة إعادة الاتصال مرة واحدة فقط عند الفشل
    },
  },
});

let accessToken: string | undefined;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

supabase.auth.getSession().then(({ data }) => { accessToken = data.session?.access_token; });
supabase.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token;
  queryClient.invalidateQueries();
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/api/trpc`,
      transformer: superjson,
      headers() {
        return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "omit",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);