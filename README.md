# لقطة — منصة الحراج والمزاد الإلكتروني

منصة ثنائية اللغة للحراج والمزادات والبيع المباشر. تدعم العربية والإنجليزية، الوضعين النهاري والليلي، تسجيل الحسابات عبر Supabase، إدارة الإعلانات والمزادات، المفضلة والإشعارات، المحادثات والنزاعات، ولوحات البائع والإدارة ذات الصلاحيات الدقيقة.

## البنية التقنية

| الطبقة | التقنية |
|---|---|
| الواجهة | React 19، Vite، TypeScript، Tailwind CSS |
| الخادم | Node.js، Express، tRPC، Zod |
| الهوية والبيانات | Supabase Auth وPostgreSQL مع RLS |
| الصور | Supabase Storage — bucket: `listing-images` |
| الاختبارات | Vitest وTesting Library |

## تشغيل المشروع محليًا

يتطلب المشروع Node.js 22 أو أحدث وpnpm.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm dev
```

أنشئ متغيرات البيئة في جهازك أو في مدير أسرار مزود الاستضافة، ولا تحفظ ملف `.env` أو أي مفاتيح في Git. يلزم للتشغيل:

| المكان | المتغيرات المطلوبة |
|---|---|
| متصفح العميل | `VITE_SUPABASE_URL`، `VITE_SUPABASE_ANON_KEY` |
| خادم التطبيق | `SUPABASE_URL`، `SUPABASE_SERVICE_ROLE_KEY` |
| اختياري | `VITE_API_BASE_URL` عند فصل الواجهة عن API، و`CORS_ORIGINS` عند تعدد النطاقات |

> يجب أن يبقى `SUPABASE_SERVICE_ROLE_KEY` داخل أسرار الخادم فقط؛ لا تضعه في الواجهة أو في GitHub.

## أوامر الجودة والإنتاج

```bash
pnpm check            # فحص TypeScript
pnpm test             # اختبارات الوحدة والعقود
pnpm build:external   # بناء إنتاجي وفحص عدم تسرب أسرار أو روابط تشغيل خاصة
pnpm start            # تشغيل dist/index.js في وضع الإنتاج
```

يقرأ الخادم المنفذ من متغير `PORT`، ما يجعله مناسبًا لمنصات استضافة Node.js مثل Hostinger Web Apps أو Render أو Railway.

## قاعدة البيانات وSupabase

ملفات الترحيل الآمنة موجودة في `supabase/migrations/` ويجب إبقاؤها ضمن Git. قاعدة البيانات الحية وبيانات العملاء والرسائل وملفات الصور **لا** تُرفع إلى المستودع. توضح الوثائق التالية خطوات النشر والنقل الآمن:

- [النشر الخارجي](./EXTERNAL_DEPLOYMENT.md)
- [تقرير فصل الاستضافة](./EXTERNAL_MIGRATION_REPORT.md)
- [نقل الكود وقاعدة Supabase بأمان](./DATABASE_HANDOFF.md)
- [نطاق الحماية والصلاحيات](./SECURITY_SCOPE.md)

## النشر على Hostinger

1. أنشئ مستودع GitHub خاصًا وارفع هذا المشروع دون ملفات البيئة.
2. من hPanel اختر **Node.js Web App** واربط المستودع.
3. اختر Node.js 22، واجعل أمر البناء `pnpm build:external` وأمر التشغيل `pnpm start`.
4. أضف أسرار Supabase في إعدادات التطبيق.
5. حدّث **Site URL** و**Redirect URLs** في Supabase Auth إلى نطاق الإنتاج ثم اختبر التسجيل، تسجيل الدخول، رفع الصور، ومسارات الإدارة.

## سياسة المستودع

- اجعل المستودع **خاصًا** ما دامت المنصة قيد الإطلاق.
- لا ترفع النسخ الاحتياطية أو بيانات المستخدمين أو ملفات Storage أو أي ملف `.env`.
- نفّذ تغييرات المخطط الجديدة عبر ملف SQL جديد في `supabase/migrations/`، ثم اختبره قبل تطبيقه على Supabase.
- يعمل GitHub Actions تلقائيًا على فحص الأنواع والاختبارات وبناء الإنتاج في كل Pull Request ودفع إلى الفرع الرئيسي.

## الترخيص

المشروع مرخّص بموجب رخصة [MIT](./LICENSE).
