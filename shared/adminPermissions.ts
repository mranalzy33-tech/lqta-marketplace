export const ADMIN_PERMISSION_VALUES = [
  "admin.dashboard.view",
  "admin.users.read",
  "admin.users.manage",
  "admin.listings.read",
  "admin.listings.manage",
  "admin.auctions.read",
  "admin.auctions.manage",
  "admin.categories.read",
  "admin.categories.manage",
  "admin.ads.read",
  "admin.ads.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_VALUES)[number];

export const ADMIN_PERMISSION_CATALOG: ReadonlyArray<{
  id: AdminPermission;
  label: string;
  description: string;
}> = [
  { id: "admin.dashboard.view", label: "عرض لوحة الإدارة", description: "عرض المؤشرات العامة ولوحة التحكم." },
  { id: "admin.users.read", label: "عرض المستخدمين", description: "عرض قائمة المستخدمين وبياناتها الإدارية." },
  { id: "admin.users.manage", label: "إدارة المستخدمين", description: "حظر الحسابات أو رفع الحظر عنها." },
  { id: "admin.listings.read", label: "عرض الإعلانات", description: "عرض الإعلانات وحالاتها للمراجعة." },
  { id: "admin.listings.manage", label: "إدارة الإعلانات", description: "نشر الإعلانات أو إعادتها للمراجعة أو رفضها أو تمييزها أو حذفها." },
  { id: "admin.auctions.read", label: "عرض المزادات", description: "عرض المزادات وحالاتها." },
  { id: "admin.auctions.manage", label: "إدارة المزادات", description: "تحديث حالة المزادات ضمن الصلاحيات المعتمدة." },
  { id: "admin.categories.read", label: "عرض التصنيفات", description: "عرض التصنيفات المتاحة في المنصة." },
  { id: "admin.categories.manage", label: "إدارة التصنيفات", description: "إضافة التصنيفات وتعديل اسمها أو رابطها أو أيقونتها." },
  { id: "admin.ads.read", label: "عرض الحملات الإعلانية", description: "عرض إعلانات الشركات والمؤسسات المخطط ظهورها على الصفحة الرئيسية." },
  { id: "admin.ads.manage", label: "إدارة الحملات الإعلانية", description: "رفع المواد الإعلانية وتحديد محتواها وفترة عرضها وحالتها." },
];

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSION_VALUES as readonly string[]).includes(value);
}
