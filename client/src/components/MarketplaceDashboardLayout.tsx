import {
  Bell,
  Heart,
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageCircle,
  Scale,
  ShieldCheck,
  Store,
  Tags,
  UserCog,
  UserRound,
  WalletCards,
  ShoppingCart,
} from "lucide-react";
import type { AdminPermission } from "../../../shared/adminPermissions";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import PreferenceControls from "@/components/PreferenceControls";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocale } from "@/contexts/LocaleContext";
import BrandLogo from "@/components/marketplace/BrandLogo";

type NavigationItem = {
  path: string;
  labelKey: Parameters<ReturnType<typeof useLocale>["t"]>[0];
  icon: typeof Store;
  permission?: AdminPermission;
  superAdminOnly?: boolean;
};

const items: NavigationItem[] = [
  { path: "/seller", labelKey: "dashboardNav.sellerDashboard", icon: Store },
  { path: "/favorites", labelKey: "dashboardNav.favorites", icon: Heart },
  { path: "/wallet", labelKey: "dashboardNav.wallet", icon: WalletCards },
  { path: "/cart", labelKey: "dashboardNav.cart", icon: ShoppingCart },
  { path: "/offers", labelKey: "dashboardNav.myOffers", icon: MessageCircle },
  {
    path: "/notifications",
    labelKey: "dashboardNav.notifications",
    icon: Bell,
  },
  { path: "/messages", labelKey: "dashboardNav.messages", icon: MessageCircle },
  { path: "/disputes", labelKey: "dashboardNav.disputes", icon: Scale },
  { path: "/support", labelKey: "dashboardNav.supportQueue", icon: LifeBuoy },
  {
    path: "/dispute-queue",
    labelKey: "dashboardNav.disputeQueue",
    icon: Scale,
  },
  {
    path: "/admin",
    labelKey: "dashboardNav.adminDashboard",
    icon: ShieldCheck,
    permission: "admin.dashboard.view",
  },
  {
    path: "/admin/users",
    labelKey: "dashboardNav.users",
    icon: UserRound,
    permission: "admin.users.read",
  },
  {
    path: "/admin/listings",
    labelKey: "dashboardNav.listings",
    icon: Store,
    permission: "admin.listings.read",
  },
  {
    path: "/admin/auctions",
    labelKey: "dashboardNav.auctions",
    icon: Scale,
    permission: "admin.auctions.read",
  },
  {
    path: "/admin/categories",
    labelKey: "dashboardNav.categories",
    icon: Tags,
    permission: "admin.categories.read",
  },
  {
    path: "/admin/ads",
    labelKey: "dashboardNav.ads",
    icon: Megaphone,
    permission: "admin.ads.read",
  },
  {
    path: "/admin/staff",
    labelKey: "dashboardNav.adminTeam",
    icon: UserCog,
    superAdminOnly: true,
  },
];

function requiredAdminPermission(
  location: string
): AdminPermission | "super_admin" | null {
  if (location === "/admin/staff") return "super_admin";
  if (location === "/admin/categories") return "admin.categories.read";
  if (location === "/admin/ads") return "admin.ads.read";
  if (location === "/admin/users") return "admin.users.read";
  if (location === "/admin/listings") return "admin.listings.read";
  if (location === "/admin/auctions") return "admin.auctions.read";
  if (location === "/admin") return "admin.dashboard.view";
  return null;
}

// `title`/`eyebrow` are passed in already localized by each page via t(),
// so this layout only renders them — it does not re-translate.
export default function MarketplaceDashboardLayout({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const { direction, t } = useLocale();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8fafb] text-slate-500 dark:bg-background">
        {t("layout.preparingAccount")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8fafb] p-6 dark:bg-background">
        <div className="w-full max-w-md rounded-[1.5rem] bg-white p-8 text-center shadow-[0_24px_55px_-35px_rgba(8,30,58,.45)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0b2343] text-[#f5cf70]">
            <UserRound className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-black text-[#0b2343]">
            {t("layout.signInToContinue")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("layout.signInRequired")}
          </p>
          <Button
            onClick={startLogin}
            className="mt-6 w-full bg-[#0b2343] hover:bg-[#163961]"
          >
            {t("layout.signIn")}
          </Button>
          <Link
            href="/"
            className="mt-4 block text-sm font-bold text-[#b87f1c]"
          >
            {t("layout.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const requiredPermission = requiredAdminPermission(location);
  const assignedPermissions = user.adminPermissions ?? [];
  const impliedManagerPermission =
    requiredPermission &&
    requiredPermission !== "super_admin" &&
    requiredPermission.endsWith(".read")
      ? (`${requiredPermission.slice(0, -".read".length)}.manage` as AdminPermission)
      : null;
  const canViewAdminRoute =
    !requiredPermission ||
    user.role === "super_admin" ||
    (requiredPermission !== "super_admin" &&
      (assignedPermissions.includes(requiredPermission) ||
        Boolean(
          impliedManagerPermission &&
            assignedPermissions.includes(impliedManagerPermission)
        )));
  if (!canViewAdminRoute) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8fafb] p-6 text-center dark:bg-background">
        <div className="max-w-md rounded-[1.5rem] border border-rose-100 bg-white p-8 shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-black text-[#0b2343]">
            {t("layout.adminAccessUnavailable")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("layout.adminAccessUnavailableDescription")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#0b2343] px-4 py-2.5 text-sm font-bold text-white"
          >
            {t("layout.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const visibleItems = items.filter(item => {
    if (!item.path.startsWith("/admin"))
      return item.path === "/support" || item.path === "/dispute-queue"
        ? user.role === "super_admin" || user.role === "support_staff"
        : true;
    if (user.role === "super_admin") return true;
    if (item.superAdminOnly) return false;
    const managerPermission = item.permission?.endsWith(".read")
      ? (`${item.permission.slice(0, -".read".length)}.manage` as AdminPermission)
      : null;
    return Boolean(
      item.permission &&
        (assignedPermissions.includes(item.permission) ||
          (managerPermission &&
            assignedPermissions.includes(managerPermission)))
    );
  });

  return (
    <SidebarProvider>
      <Sidebar
        side={direction === "rtl" ? "right" : "left"}
        collapsible="offcanvas"
        className="border-s border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
      >
        <SidebarHeader className="p-5">
          <Link
            href="/"
            aria-label={t("layout.brand")}
            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700"
          >
            <BrandLogo
              variant="full"
              alt=""
              ariaHidden
              className="h-full w-full"
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-3">
            {visibleItems.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location === item.path}
                  className="h-11 rounded-xl data-[active=true]:bg-[#0b2343] data-[active=true]:text-white"
                >
                  <Link href={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl bg-[#f5f7f9] p-3 dark:bg-slate-900">
            <p className="truncate text-sm font-bold text-[#0b2343]">
              {user.name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
            <button
              onClick={logout}
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" /> {t("layout.signOut")}
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f4f6f8] dark:bg-background">
        <header className="flex h-14 items-center gap-3 border-b border-white/10 bg-[#081f3b] px-4 text-white shadow-sm sm:px-7">
          <SidebarTrigger className="md:hidden text-white hover:bg-white/10 hover:text-[#ffda55]" />
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white p-2 shadow-sm">
            <BrandLogo
              variant="full"
              alt=""
              ariaHidden
              className="h-full w-full"
            />
          </span>
          <Link href="/" className="text-sm font-bold text-white">
            {t("layout.home")}
          </Link>
          <span className="text-white/40">/</span>
          <span className="truncate text-sm text-white/75">{eyebrow}</span>
          <div className="ms-auto">
            <PreferenceControls compact onDark />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-7">
          <p className="text-xs font-extrabold text-[#b87f1c]">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b2343] sm:text-3xl">
            {title}
          </h1>
          <div className="mt-7">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
