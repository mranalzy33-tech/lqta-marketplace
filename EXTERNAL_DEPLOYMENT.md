# نشر «لقطة» خارجياً

## المعمارية المستهدفة

تعمل الواجهة المبنية بـ React/Vite والخادم المبني بـ Express/tRPC إما معاً على نطاق واحد، أو منفصلين عبر `VITE_API_BASE_URL`. تستخدم المنصة مشروع Supabase الحالي لقاعدة البيانات، المصادقة، وتخزين صور الإعلانات. لا تدخل مفاتيح الإدارة إلى المتصفح.

| الجزء | البيئة الخارجية المقترحة | المتغيرات المطلوبة |
|---|---|---|
| الواجهة والخادم | أي استضافة Node 20+ تدعم عملية طويلة الأجل وHTTPS | `PORT`, `NODE_ENV` |
| المتصفح | الاستضافة نفسها أو CDN ثابت | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, و`VITE_API_BASE_URL` عند فصل API |
| الخادم فقط | Secret Manager في استضافة الـ API | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`، و`OWNER_NOTIFICATION_WEBHOOK_URL` اختياريًا |
| البيانات والملفات | مشروع Supabase الحالي | لا نقل أو حذف لقاعدة البيانات أو RLS |

## خطوات النشر

1. انسخ المشروع إلى مستودع مستقل، ثم نفّذ `pnpm install --frozen-lockfile`.
2. أنشئ متغيرات بيئة من `.env.example`. لا تنسخ `.project-config.json` أو أي ملفات محلية أو أسرار.
3. قبل نشر إصدار يغيّر قاعدة البيانات، طبّق migrations من `supabase/migrations/` بالترتيب على قاعدة التطوير ثم قاعدة الإنتاج؛ يتطلب إصدار المزاد تطبيق `20260929_auction_conversion_minimum_increment.sql` ثم `20260930_fix_convert_listing_to_auction_listing_id_ambiguity.sql` قبل تشغيل النسخة الجديدة. إذا كان ترحيل الأساس مطبقًا مسبقًا، طبّق التصحيحي فقط.
4. في Supabase Auth، عيّن **Site URL** إلى `https://your-domain.com` وأضف `https://your-domain.com/login` إلى **Redirect URLs**. فعّل Email/Password، واضبط مزود Google لاحقاً فقط إذا أدخلت مفاتيحه في إعدادات Supabase نفسها.
5. في الاستضافة، نفّذ `pnpm build:external` ثم `pnpm start`. يخدم Express ملفات `dist/public` مع SPA fallback لجميع المسارات.
6. عند فصل الواجهة عن API، انشر الـ API على `https://api.your-domain.com`، واضبط `VITE_API_BASE_URL` و`CORS_ORIGINS=https://your-domain.com` بصورة متطابقة.
7. وجّه DNS إلى الاستضافة، فعّل HTTPS، اختبر التسجيل، تسجيل الدخول، الصور، الصفحات المحمية، لوحة الإدارة، ثم حوّل النطاق بعد نجاح الاختبارات.

## الاسترجاع

لا توقف النسخة الحالية حتى يتم التحقق من النطاق الخارجي. الرجوع يعني إعادة DNS إلى النسخة السابقة أو إعادة نشر آخر إصدار ثابت. لا توجد ترحيلات مدمّرة ضمن هذا النقل؛ أُضيف فقط حقل ربط Supabase Auth `supabase_auth_id` مع الإبقاء على الهوية القديمة وبيانات الحسابات.
