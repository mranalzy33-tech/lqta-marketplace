import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import BackButton from "./components/BackButton";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";

// تحويل جميع الصفحات إلى Lazy Loading لتسريع التحميل الأولي وخفض حجم الحزمة الأولى
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Cart = lazy(() => import("./pages/Cart"));
const MyOffers = lazy(() => import("./pages/MyOffers"));
const MarketplaceBrowse = lazy(() => import("./pages/MarketplaceBrowse"));
const ListingDetails = lazy(() => import("./pages/ListingDetails"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyAccount = lazy(() => import("./pages/VerifyAccount"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const Disputes = lazy(() => import("./pages/Disputes"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SupportDesk = lazy(() => import("./pages/SupportDesk"));
const DisputeQueue = lazy(() => import("./pages/DisputeQueue"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminListings = lazy(() => import("./pages/AdminListings"));
const AdminAuctions = lazy(() => import("./pages/AdminAuctions"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminCampaigns = lazy(() => import("./pages/AdminCampaigns"));
const AdminStaff = lazy(() => import("./pages/AdminStaff"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-sm text-slate-600">
          جارٍ تحميل الصفحة…
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/account" component={AccountSettings} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/cart" component={Cart} />
        <Route path="/offers" component={MyOffers} />
        <Route path="/marketplace" component={MarketplaceBrowse} />
        <Route path="/listing/:id" component={ListingDetails} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify" component={VerifyAccount} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/messages" component={Messages} />
        <Route path="/disputes" component={Disputes} />
        <Route path="/seller" component={SellerDashboard} />
        <Route path="/support" component={SupportDesk} />
        <Route path="/dispute-queue" component={DisputeQueue} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/listings" component={AdminListings} />
        <Route path="/admin/auctions" component={AdminAuctions} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/ads" component={AdminCampaigns} />
        <Route path="/admin/staff" component={AdminStaff} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <ThemeProvider defaultTheme="light" switchable>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <BackButton />
            <LocalizedRoutes />
          </TooltipProvider>
        </ThemeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  );
}

function LocalizedRoutes() {
  const { language } = useLocale();
  const [location] = useLocation();
  useEffect(() => {
    const en = language === "en";
    const path = location.split("?")[0] || "/";
    const privatePath =
      /^(\/(account|wallet|cart|offers|favorites|notifications|messages|disputes|dispute-queue|support|verify|seller|admin)(\/|$))/.test(
        path
      );
    const privateTitles: Record<string, string> = en
      ? {
          "/account": "Account settings",
          "/wallet": "Wallet",
          "/cart": "Shopping cart",
          "/offers": "My offers",
          "/favorites": "Saved listings",
          "/notifications": "Notifications",
          "/messages": "Messages",
          "/disputes": "Disputes",
          "/dispute-queue": "Dispute queue",
          "/support": "Support",
          "/verify": "Verify account",
          "/seller": "Seller center",
        }
      : {
          "/account": "إعدادات الحساب",
          "/wallet": "المحفظة",
          "/cart": "سلة التسوق",
          "/offers": "عروضي",
          "/favorites": "إعلاناتي المفضلة",
          "/notifications": "الإشعارات",
          "/messages": "الرسائل",
          "/disputes": "النزاعات",
          "/dispute-queue": "طابور النزاعات",
          "/support": "الدعم",
          "/verify": "تأكيد الحساب",
          "/seller": "مركز البائع",
        };
    const publicPages: Record<string, [string, string]> = en
      ? {
          "/": [
            "LQTA — Buy, sell & discover auctions",
            "Shop listings and auctions on LQTA. Discover cars, property, electronics and fashion, or post an ad.",
          ],
          "/about": [
            "About us | LQTA",
            "Learn how LQTA brings marketplace listings, direct sales, and auctions together.",
          ],
          "/contact": [
            "Contact | LQTA",
            "Find the available ways to contact a seller or raise an eligible order dispute on LQTA.",
          ],
          "/marketplace": [
            "Browse listings | LQTA",
            "Browse current marketplace listings and auctions by category, price and search.",
          ],
          "/login": ["Sign in | LQTA", "Sign in to your LQTA account."],
          "/register": [
            "Create account | LQTA",
            "Create an account to buy, sell and bid on LQTA.",
          ],
        }
      : {
          "/": [
            "لقطة — سوق البيع والشراء والمزادات",
            "اكتشف إعلانات السيارات والعقارات والإلكترونيات والأزياء، وتسوّق أو بِع عبر سوق لقطة.",
          ],
          "/about": [
            "من نحن | لقطة",
            "تعرف على سوق لقطة للإعلانات والبيع المباشر والمزادات.",
          ],
          "/contact": [
            "تواصل معنا | لقطة",
            "تعرف على طرق التواصل المتاحة مع البائعين وتقديم نزاع بشأن طلب مؤهل في لقطة.",
          ],
          "/marketplace": [
            "تصفح الإعلانات | لقطة",
            "تصفح إعلانات لقطة ومزاداتها حسب التصنيف والسعر والبحث.",
          ],
          "/login": [
            "تسجيل الدخول | لقطة",
            "سجّل الدخول إلى حسابك في منصة لقطة.",
          ],
          "/register": [
            "إنشاء حساب | لقطة",
            "أنشئ حسابًا للبيع والشراء والمزايدة في سوق لقطة.",
          ],
        };
    const listingPage = /^\/listing\/[^/]+$/.test(path);
    const knownPublicPage = Boolean(publicPages[path]) || listingPage;
    const brand = en ? "LQTA" : "لقطة";
    const title = privatePath
      ? `${privateTitles[path] ?? (en ? "Administration" : "الإدارة")} | ${brand}`
      : listingPage
        ? en
          ? `Listing details | ${brand}`
          : `تفاصيل الإعلان | ${brand}`
        : (publicPages[path]?.[0] ??
          (en ? `Page not found | ${brand}` : `الصفحة غير موجودة | ${brand}`));
    const description = privatePath
      ? ""
      : listingPage
        ? en
          ? "View product details, price, seller information and related listings on LQTA."
          : "اطّلع على تفاصيل المنتج والسعر والبائع والإعلانات المشابهة في لقطة."
        : (publicPages[path]?.[1] ?? publicPages["/"][1]);
    document.title = title;
    document.documentElement.lang = language;
    const setMeta = (
      selector: string,
      content: string,
      create?: () => HTMLMetaElement
    ) => {
      const element =
        document.querySelector<HTMLMetaElement>(selector) ??
        (create ? document.head.appendChild(create()) : null);
      if (element) element.content = content;
    };
    setMeta('meta[name="description"]', description, () =>
      Object.assign(document.createElement("meta"), { name: "description" })
    );
    const noIndex =
      privatePath ||
      path === "/login" ||
      path === "/register" ||
      !knownPublicPage;
    setMeta(
      'meta[name="robots"]',
      noIndex ? "noindex, nofollow" : "index, follow",
      () => Object.assign(document.createElement("meta"), { name: "robots" })
    );
    setMeta('meta[property="og:title"]', title, () =>
      Object.assign(document.createElement("meta"), { property: "og:title" })
    );
    setMeta('meta[property="og:description"]', description, () =>
      Object.assign(document.createElement("meta"), {
        property: "og:description",
      })
    );
    setMeta(
      'meta[property="og:type"]',
      listingPage ? "product" : "website",
      () =>
        Object.assign(document.createElement("meta"), { property: "og:type" })
    );
    setMeta(
      'meta[property="og:image"]',
      `${window.location.origin}/images/hero-cars.webp`,
      () =>
        Object.assign(document.createElement("meta"), { property: "og:image" })
    );
    setMeta('meta[property="og:image:alt"]', title, () =>
      Object.assign(document.createElement("meta"), {
        property: "og:image:alt",
      })
    );
    setMeta('meta[property="og:locale"]', en ? "en_US" : "ar_SA", () =>
      Object.assign(document.createElement("meta"), { property: "og:locale" })
    );
    setMeta('meta[property="og:url"]', `${window.location.origin}${path}`, () =>
      Object.assign(document.createElement("meta"), { property: "og:url" })
    );
    setMeta('meta[name="twitter:title"]', title, () =>
      Object.assign(document.createElement("meta"), { name: "twitter:title" })
    );
    setMeta('meta[name="twitter:description"]', description, () =>
      Object.assign(document.createElement("meta"), {
        name: "twitter:description",
      })
    );
    setMeta(
      'meta[name="twitter:image"]',
      `${window.location.origin}/images/hero-cars.webp`,
      () =>
        Object.assign(document.createElement("meta"), { name: "twitter:image" })
    );
    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("link"), { rel: "canonical" })
      );
    canonical.href = `${window.location.origin}${path}`;
    if (path === "/") {
      let structuredData = document.getElementById(
        "lqta-website-schema"
      ) as HTMLScriptElement | null;
      if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.id = "lqta-website-schema";
        structuredData.type = "application/ld+json";
        document.head.appendChild(structuredData);
      }
      structuredData.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: en ? "LQTA" : "لقطة",
        url: `${window.location.origin}/`,
        inLanguage: language,
        potentialAction: {
          "@type": "SearchAction",
          target: `${window.location.origin}/marketplace?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      });
    } else {
      document.getElementById("lqta-website-schema")?.remove();
    }
  }, [language, location]);
  return (
    <div>
      <Router />
    </div>
  );
}
