import { createTRPCReact } from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

// إنشاء وتكوين الذاكرة المؤقتة (QueryClient) مع خيارات تحسين الأداء
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // تبقى البيانات صالحة لمدة 5 دقائق بدون إعادة طلب متكرر
      gcTime: 1000 * 60 * 10,     // الاحتفاظ بالبيانات في الذاكرة المؤقتة لمدة 10 دقائق
      refetchOnWindowFocus: false, // عدم إعادة جلب البيانات عند العودة للتبويب لتسريع الأداء
      retry: 1,                   // محاولة إعادة الاتصال مرة واحدة فقط عند فشل الطلب
    },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
      transformer: superjson,
    }),
  ],
});