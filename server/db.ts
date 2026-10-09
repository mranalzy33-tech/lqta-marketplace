import { randomUUID } from "node:crypto";
import {
  ADMIN_PERMISSION_VALUES,
  isAdminPermission,
  type AdminPermission,
} from "../shared/adminPermissions";
import { getSupabaseAdmin } from "./supabase/client";
import { storagePut } from "./storage";
import type {
  AdminPermissionRow,
  CategoryRow,
  SubcategoryRow,
  ConversationParticipantRow,
  ConversationRow,
  ConversationStatus,
  DisputeRow,
  DisputeStatus,
  ListingImageRow,
  ListingRow,
  ListingSource,
  ListingStatus,
  ListingType,
  MarketplaceRole,
  MarketplaceUserRow,
  MessageRow,
  NotificationRow,
  OfferStatus,
  OrderRow,
  ReviewRow,
  OfferRow,
  SponsoredCampaignRow,
} from "./supabase/types";

export type MarketplaceSessionUser = {
  id: string;
  authId: string;
  name: string;
  email: string;
  loginMethod: string | null;
  role: MarketplaceRole;
  isSeller: boolean;
  isBanned: boolean;
  preferredLanguage: "ar" | "en";
  adminPermissions: AdminPermission[];
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type SupabaseAuthProfileInput = {
  authId: string;
  name?: string | null;
  email?: string | null;
  city?: string | null;
  streetAddress?: string | null;
  phone?: string | null;
};

export type ListingPreview = {
  id: string;
  title: string;
  type: ListingRow["type"];
  status: ListingRow["status"];
  price: number | null;
  auctionEndTime: string | null;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
  } | null;
  subcategory: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
  } | null;
  source: ListingRow["source"];
  createdAt: string;
};

export type ListingDetails = ListingPreview & {
  description: string;
  startingPrice: number | null;
  currentPrice: number | null;
  fixedPrice: number | null;
  minimumBidIncrement: number;
  auctionHasWinner: boolean;
  viewerWonAuction: boolean;
  imageUrls: string[];
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    ratingAverage: number;
    ratingCount: number;
  };
  bids: Array<{
    id: string;
    bidderId: string;
    bidderName: string;
    amount: number;
    createdAt: string;
  }>;
};

function throwOnError(error: { message: string } | null, operation: string) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

function toSessionUser(
  row: MarketplaceUserRow,
  adminPermissions: AdminPermission[] = []
): MarketplaceSessionUser {
  const updatedAt = new Date(row.updated_at);

  return {
    id: row.id,
    authId: row.supabase_auth_id ?? "",
    name: row.name,
    email: row.email,
    loginMethod: "supabase",
    role: row.role,
    isSeller: row.is_seller,
    isBanned: row.is_banned,
    preferredLanguage: row.preferred_language === "en" ? "en" : "ar",
    adminPermissions,
    createdAt: new Date(row.created_at),
    updatedAt,
    lastSignedIn: updatedAt,
  };
}

function normalizeAdminPermissions(values: unknown): AdminPermission[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .filter(isAdminPermission)
    )
  );
}

async function getDelegatedAdminPermissions(
  userId: string
): Promise<AdminPermission[]> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("admin_permissions")
    .select("permissions")
    .eq("user_id", userId)
    .maybeSingle();

  throwOnError(error, "تعذر قراءة صلاحيات المستخدم الإدارية");
  return normalizeAdminPermissions(
    (data as Pick<AdminPermissionRow, "permissions"> | null)?.permissions
  );
}

function toListingPreview(
  listing: ListingRow,
  categories: Map<string, CategoryRow>,
  images: Map<string, ListingImageRow[]>,
  subcategories: Map<string, SubcategoryRow> = new Map()
): ListingPreview {
  const image = images.get(listing.id)?.[0] ?? null;
  const category = categories.get(listing.category_id) ?? null;
  const subcategory = listing.subcategory_id
    ? (subcategories.get(listing.subcategory_id) ?? null)
    : null;

  return {
    id: listing.id,
    title: listing.title,
    type: listing.type,
    status: listing.status,
    price:
      listing.type === "auction"
        ? (listing.current_price ?? listing.starting_price)
        : listing.fixed_price,
    auctionEndTime: listing.auction_end_time,
    imageUrl: image?.image_url ?? null,
    category: category
      ? {
          id: category.id,
          name: category.name,
          nameEn: category.name_en ?? null,
          slug: category.slug,
        }
      : null,
    subcategory: subcategory
      ? {
          id: subcategory.id,
          name: subcategory.name,
          nameEn: subcategory.name_en ?? null,
          slug: subcategory.slug,
        }
      : null,
    source: listing.source,
    createdAt: listing.created_at,
  };
}

async function fetchImagesByListingIds(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, ListingImageRow[]>();

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("listing_images")
    .select("id, listing_id, image_url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  throwOnError(error, "تعذر جلب صور الإعلانات");

  const grouped = new Map<string, ListingImageRow[]>();
  for (const image of (data ?? []) as ListingImageRow[]) {
    const existing = grouped.get(image.listing_id) ?? [];
    existing.push(image);
    grouped.set(image.listing_id, existing);
  }

  return grouped;
}

async function fetchBidCountsByListingIds(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, number>();
  const client = getSupabaseAdmin();
  const counts = new Map<string, number>();
  const results = await Promise.all(
    listingIds.map(async listingId => {
      const { count, error } = await client
        .from("bids")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);
      throwOnError(error, "تعذر جلب عدد مزايدات الإعلان");
      return [listingId, count ?? 0] as const;
    })
  );
  for (const [listingId, count] of results) {
    counts.set(listingId, count);
  }
  return counts;
}

async function fetchListingViewCounts(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, number>();
  const client = getSupabaseAdmin();
  const recentCutoff = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const counts = new Map<string, number>();
  const results = await Promise.all(
    listingIds.map(async listingId => {
      const { count, error } = await client
        .from("listing_views")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("viewed_at", recentCutoff);
      throwOnError(error, "تعذر جلب مشاهدات الإعلان");
      return [listingId, count ?? 0] as const;
    })
  );
  for (const [listingId, count] of results) {
    counts.set(listingId, count);
  }
  return counts;
}

async function fetchCategoriesByIds(categoryIds: string[]) {
  if (categoryIds.length === 0) return new Map<string, CategoryRow>();

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("categories")
    .select("id, name, name_en, slug, icon")
    .in("id", categoryIds);

  throwOnError(error, "تعذر جلب التصنيفات");
  return new Map(
    ((data ?? []) as CategoryRow[]).map(category => [category.id, category])
  );
}

async function fetchSubcategoriesByIds(ids: string[]) {
  if (!ids.length) return new Map<string, SubcategoryRow>();
  const { data, error } = await getSupabaseAdmin()
    .from("subcategories")
    .select("id, category_id, name, name_en, slug")
    .in("id", ids);
  throwOnError(error, "تعذر جلب الفئات الفرعية");
  return new Map(
    ((data ?? []) as SubcategoryRow[]).map(child => [child.id, child])
  );
}
export function normalizeSearchTerm(value: string | undefined) {
  return value?.trim().replace(/[\%_]/g, "") ?? "";
}

export function canLinkSupabaseAuthIdentity(
  existingAuthId: string | null | undefined,
  incomingAuthId: string
) {
  return !existingAuthId || existingAuthId === incomingAuthId;
}

export function isValidMarketplaceAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000;
}

export function hasSufficientAvailableBalance(
  available: number,
  amount: number
) {
  return (
    Number.isFinite(available) &&
    Number.isFinite(amount) &&
    amount > 0 &&
    available >= amount
  );
}

export function isValidFutureAuctionEnd(value: string | undefined) {
  return Boolean(
    value &&
    Number.isFinite(new Date(value).getTime()) &&
    new Date(value).getTime() > Date.now()
  );
}

export function isValidMessageContent(value: string) {
  const content = value.trim();
  return content.length > 0 && content.length <= 2_000;
}

export function isValidDisputeReason(value: string) {
  const reason = value.trim();
  return reason.length >= 10 && reason.length <= 2_000;
}

type ValidImageUpload = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  bytes: Buffer;
};

export function parseListingImageDataUrl(dataUrl: string): ValidImageUpload {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
      dataUrl
    );
  if (!match)
    throw new Error("صيغة الصورة غير مدعومة؛ استخدم JPEG أو PNG أو WebP");
  const mimeType = match[1] as ValidImageUpload["mimeType"];
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new Error("يجب ألا يتجاوز حجم الصورة 5 ميغابايت");

  const validSignature =
    (mimeType === "image/jpeg" &&
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (mimeType === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        )) ||
    (mimeType === "image/webp" &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!validSignature)
    throw new Error("محتوى الملف لا يطابق نوع الصورة المحدد");

  return {
    mimeType,
    extension:
      mimeType === "image/jpeg"
        ? "jpg"
        : mimeType === "image/png"
          ? "png"
          : "webp",
    bytes,
  };
}

const EXTERNAL_AUTH_USER_SELECT =
  "id, name, email, avatar_url, role, is_seller, is_banned, rating_avg, rating_count, created_at, updated_at, supabase_auth_id, preferred_language, city, street_address, phone";

export async function getUserBySupabaseAuthId(
  authId: string
): Promise<MarketplaceSessionUser | undefined> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("users")
    .select(EXTERNAL_AUTH_USER_SELECT)
    .eq("supabase_auth_id", authId)
    .maybeSingle();
  throwOnError(error, "تعذر قراءة ملف المستخدم");
  if (!data) return undefined;
  const row = data as MarketplaceUserRow;
  return toSessionUser(
    row,
    row.role === "super_admin"
      ? [...ADMIN_PERMISSION_VALUES]
      : await getDelegatedAdminPermissions(row.id)
  );
}

export async function upsertSupabaseAuthUser(
  input: SupabaseAuthProfileInput
): Promise<MarketplaceSessionUser> {
  const client = getSupabaseAdmin();
  const current = await getUserBySupabaseAuthId(input.authId);
  const safeName = input.name?.trim() || "مستخدم لقطة";
  const safeEmail = input.email?.trim();
  const now = new Date().toISOString();

  if (current) {
    const { error } = await client
      .from("users")
      .update({
        name: safeName,
        email: safeEmail || current.email,
        city: input.city?.trim().slice(0, 100) || undefined,
        street_address: input.streetAddress?.trim().slice(0, 240) || undefined,
        phone: input.phone?.trim().slice(0, 30) || undefined,
        updated_at: now,
      })
      .eq("id", current.id);
    throwOnError(error, "تعذر تحديث ملف المستخدم");
    return (await getUserBySupabaseAuthId(input.authId)) ?? current;
  }

  if (safeEmail) {
    const { data: emailMatch, error: emailError } = await client
      .from("users")
      .select(EXTERNAL_AUTH_USER_SELECT)
      .eq("email", safeEmail)
      .maybeSingle();
    throwOnError(emailError, "تعذر التحقق من البريد الإلكتروني للمستخدم");
    if (emailMatch) {
      const profile = emailMatch as MarketplaceUserRow;
      if (!canLinkSupabaseAuthIdentity(profile.supabase_auth_id, input.authId))
        throw new Error("هذا البريد الإلكتروني مرتبط بحساب آخر");
      const { error } = await client
        .from("users")
        .update({
          supabase_auth_id: input.authId,
          name: safeName,
          city: input.city?.trim().slice(0, 100) || undefined,
          street_address:
            input.streetAddress?.trim().slice(0, 240) || undefined,
          phone: input.phone?.trim().slice(0, 30) || undefined,
          updated_at: now,
        })
        .eq("id", profile.id);
      throwOnError(error, "تعذر ربط الحساب بملف المستخدم الحالي");
      const linked = await getUserBySupabaseAuthId(input.authId);
      if (linked) return linked;
    }
  }

  const { data, error } = await client
    .from("users")
    .insert({
      id: randomUUID(),
      supabase_auth_id: input.authId,
      name: safeName,
      email: safeEmail || `supabase-${input.authId}@lqta.invalid`,
      password_hash: `supabase-auth:${randomUUID()}`,
      role: "user",
      city: input.city?.trim().slice(0, 100) || null,
      street_address: input.streetAddress?.trim().slice(0, 240) || null,
      phone: input.phone?.trim().slice(0, 30) || null,
      updated_at: now,
    })
    .select(EXTERNAL_AUTH_USER_SELECT)
    .single();
  throwOnError(error, "تعذر إنشاء ملف المستخدم");
  return toSessionUser(data as MarketplaceUserRow, []);
}

export type PublicCategory = CategoryRow & {
  imageUrl: string | null;
  subcategories: SubcategoryRow[];
  listingCount: number;
};
function categoryImageUrl(icon: string | null | undefined) {
  return icon && /^https?:\/\//i.test(icon) ? icon : null;
}
async function getCategoriesWithSubcategories(
  limit: number
): Promise<PublicCategory[]> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("categories")
    .select("id, name, name_en, slug, icon")
    .order("name", { ascending: true })
    .limit(limit);
  throwOnError(error, "تعذر جلب التصنيفات");
  const categories = (data ?? []) as CategoryRow[];
  if (!categories.length) return [];
  const categoryIds = categories.map(category => category.id);
  const [
    { data: children, error: childError },
    { data: listings, error: listingsError },
  ] = await Promise.all([
    client
      .from("subcategories")
      .select("id, category_id, name, name_en, slug")
      .in("category_id", categoryIds)
      .order("name", { ascending: true }),
    client
      .from("listings")
      .select("category_id")
      .in("category_id", categoryIds)
      .eq("status", "active"),
  ]);
  throwOnError(childError, "تعذر جلب الفئات الفرعية");
  throwOnError(listingsError, "تعذر جلب أعداد إعلانات التصنيفات");
  const grouped = new Map<string, SubcategoryRow[]>();
  for (const child of (children ?? []) as SubcategoryRow[])
    grouped.set(child.category_id, [
      ...(grouped.get(child.category_id) ?? []),
      child,
    ]);
  const counts = new Map<string, number>();
  for (const listing of listings ?? []) {
    const categoryId = (listing as { category_id: string }).category_id;
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return categories.map(category => ({
    ...category,
    imageUrl: categoryImageUrl(category.icon),
    subcategories: grouped.get(category.id) ?? [],
    listingCount: counts.get(category.id) ?? 0,
  }));
}
export async function getPublicCategories(limit = 12) {
  return getCategoriesWithSubcategories(limit);
}
const SPONSORED_CAMPAIGN_SELECT =
  "id, company_name, title, description, image_url, target_url, starts_at, ends_at, sort_order, is_active, created_by, created_at, updated_at";
export const SPONSORED_CAMPAIGN_MIGRATION_REQUIRED =
  "SPONSORED_CAMPAIGN_MIGRATION_REQUIRED";
function toSponsoredCampaign(row: SponsoredCampaignRow) {
  return {
    id: row.id,
    companyName: row.company_name,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export async function getPublicSponsoredCampaigns(now = new Date()) {
  const nowIso = now.toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("sponsored_campaigns")
    .select(SPONSORED_CAMPAIGN_SELECT)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("sort_order", { ascending: true })
    .limit(100);
  if (error && (error.code === "42P01" || error.code === "PGRST205")) return [];
  throwOnError(error, "تعذر جلب الإعلانات المؤسسية");
  return ((data ?? []) as SponsoredCampaignRow[]).slice(0, 8).map(row => {
    const campaign = toSponsoredCampaign(row);
    return {
      id: campaign.id,
      companyName: campaign.companyName,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      targetUrl: campaign.targetUrl,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      sortOrder: campaign.sortOrder,
      isActive: campaign.isActive,
    };
  });
}
export async function getAdminSponsoredCampaigns() {
  const { data, error } = await getSupabaseAdmin()
    .from("sponsored_campaigns")
    .select(SPONSORED_CAMPAIGN_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error && (error.code === "42P01" || error.code === "PGRST205"))
    throw new Error(SPONSORED_CAMPAIGN_MIGRATION_REQUIRED);
  throwOnError(error, "تعذر جلب الحملات الإعلانية");
  return ((data ?? []) as SponsoredCampaignRow[]).map(toSponsoredCampaign);
}
export async function uploadSponsoredCampaignImage(input: { dataUrl: string }) {
  const image = parseListingImageDataUrl(input.dataUrl);
  const { url } = await storagePut(
    `sponsored-campaigns/${randomUUID()}/image.${image.extension}`,
    image.bytes,
    image.mimeType
  );
  return { url };
}
export async function createSponsoredCampaign(input: {
  createdBy: string;
  companyName: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  const payload = {
    id: randomUUID(),
    company_name: input.companyName.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    image_url: input.imageUrl,
    target_url: input.targetUrl,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabaseAdmin()
    .from("sponsored_campaigns")
    .insert(payload)
    .select(SPONSORED_CAMPAIGN_SELECT)
    .single();
  throwOnError(error, "تعذر إنشاء الحملة الإعلانية");
  return toSponsoredCampaign(data as SponsoredCampaignRow);
}
export async function updateSponsoredCampaign(input: {
  id: string;
  companyName: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  const { id, ...values } = input;
  const { data, error } = await getSupabaseAdmin()
    .from("sponsored_campaigns")
    .update({
      company_name: values.companyName.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
      image_url: values.imageUrl,
      target_url: values.targetUrl,
      starts_at: values.startsAt ?? null,
      ends_at: values.endsAt ?? null,
      sort_order: values.sortOrder,
      is_active: values.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPONSORED_CAMPAIGN_SELECT)
    .maybeSingle();
  throwOnError(error, "تعذر تحديث الحملة الإعلانية");
  if (!data) throw new Error("الحملة الإعلانية غير موجودة");
  return toSponsoredCampaign(data as SponsoredCampaignRow);
}

type HomeSectionOutcome<T> = { data: T; failed: boolean };

async function loadHomeSection<T>(
  section: string,
  load: () => Promise<T>,
  fallback: T
): Promise<HomeSectionOutcome<T>> {
  try {
    return { data: await load(), failed: false };
  } catch (error) {
    console.error(`[Marketplace] Failed to load homepage ${section}`, error);
    return { data: fallback, failed: true };
  }
}

export async function getHomeData(listingLimit = 6) {
  const client = getSupabaseAdmin();
  const now = new Date().toISOString();
  const listingColumns =
    "id, seller_id, winner_id, category_id, subcategory_id, title, description, type, starting_price, current_price, fixed_price, auction_end_time, status, source, external_market_name, external_listing_url, created_at, updated_at, is_featured";
  const categoriesPromise = loadHomeSection(
    "categories",
    () => getCategoriesWithSubcategories(50),
    [] as PublicCategory[]
  );
  const latestListingsPromise = loadHomeSection(
    "latest listings",
    async () => {
      const { data, error } = await client
        .from("listings")
        .select(listingColumns)
        .in("status", ["active", "negotiating"])
        .order("created_at", { ascending: false })
        .limit(listingLimit);
      throwOnError(error, "تعذر جلب الإعلانات الرئيسية");
      const listings = (data ?? []) as ListingRow[];
      const [images, categories] = await Promise.all([
        fetchImagesByListingIds(listings.map(listing => listing.id)),
        categoriesPromise,
      ]);
      const categoryMap = new Map(
        categories.data.map(category => [category.id, category])
      );
      return listings.map(listing =>
        toListingPreview(listing, categoryMap, images)
      );
    },
    []
  );
  const featuredListingsPromise = loadHomeSection(
    "featured listings",
    async () => {
      const { data, error } = await client
        .from("listings")
        .select(listingColumns)
        .eq("is_featured", true)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      throwOnError(error, "تعذر جلب الإعلانات المميزة");
      const listings = (data ?? []) as ListingRow[];
      const [images, viewCounts, categories] = await Promise.all([
        fetchImagesByListingIds(listings.map(listing => listing.id)),
        fetchListingViewCounts(listings.map(listing => listing.id)),
        fetchCategoriesByIds(
          Array.from(new Set(listings.map(listing => listing.category_id)))
        ),
      ]);
      return listings.map(listing => ({
        ...toListingPreview(listing, categories, images),
        viewCount: viewCounts.get(listing.id) ?? 0,
      }));
    },
    []
  );
  const activeAuctionsPromise = loadHomeSection(
    "active auctions",
    async () => {
      const { data, error } = await client
        .from("listings")
        .select(listingColumns)
        .eq("type", "auction")
        .eq("status", "active")
        .gt("auction_end_time", now)
        .order("auction_end_time", { ascending: true })
        .limit(4);
      throwOnError(error, "تعذر جلب المزادات النشطة");
      const listings = (data ?? []) as ListingRow[];
      const [images, categories, subcategories, bidCounts] = await Promise.all([
        fetchImagesByListingIds(listings.map(listing => listing.id)),
        fetchCategoriesByIds(
          Array.from(new Set(listings.map(listing => listing.category_id)))
        ),
        fetchSubcategoriesByIds(
          Array.from(
            new Set(
              listings.flatMap(listing =>
                listing.subcategory_id ? [listing.subcategory_id] : []
              )
            )
          )
        ),
        fetchBidCountsByListingIds(listings.map(listing => listing.id)),
      ]);
      return listings.map(listing => ({
        ...toListingPreview(listing, categories, images, subcategories),
        bidCount: bidCounts.get(listing.id) ?? 0,
      }));
    },
    []
  );
  const [categories, latestListings, featuredListings, activeAuctions] =
    await Promise.all([
      categoriesPromise,
      latestListingsPromise,
      featuredListingsPromise,
      activeAuctionsPromise,
    ]);

  return {
    categories: categories.data,
    featuredListings: featuredListings.data,
    latestListings: latestListings.data,
    activeAuctions: activeAuctions.data,
    sectionErrors: {
      categories: categories.failed,
      latestListings: latestListings.failed,
      featuredListings: featuredListings.failed,
      activeAuctions: activeAuctions.failed,
    },
  };
}

export async function browseListings(input: {
  query?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  type?: ListingRow["type"];
  page: number;
  pageSize: number;
}) {
  const client = getSupabaseAdmin();
  let categoryId: string | undefined;
  let subcategoryId: string | undefined;

  if (input.subcategorySlug) {
    const { data, error } = await client
      .from("subcategories")
      .select("id, category_id")
      .eq("slug", input.subcategorySlug)
      .maybeSingle();
    throwOnError(error, "تعذر التحقق من الفئة الفرعية");
    subcategoryId = (data as { id: string; category_id: string } | null)?.id;
    categoryId = (data as { id: string; category_id: string } | null)
      ?.category_id;
    if (!subcategoryId) return { items: [], page: input.page, hasMore: false };
    if (input.categorySlug) {
      const { data: parent, error: parentError } = await client
        .from("categories")
        .select("id")
        .eq("slug", input.categorySlug)
        .maybeSingle();
      throwOnError(parentError, "تعذر التحقق من التصنيف الرئيسي");
      if (!parent || (parent as { id: string }).id !== categoryId)
        return { items: [], page: input.page, hasMore: false };
    }
  } else if (input.categorySlug) {
    const { data, error } = await client
      .from("categories")
      .select("id")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    throwOnError(error, "تعذر التحقق من التصنيف");
    categoryId = (data as { id: string } | null)?.id;
    if (!categoryId) return { items: [], page: input.page, hasMore: false };
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize;
  let listingsQuery = client
    .from("listings")
    .select(
      "id, seller_id, winner_id, category_id, subcategory_id, title, description, type, starting_price, current_price, fixed_price, auction_end_time, status, source, external_market_name, external_listing_url, created_at, updated_at"
    )
    .in("status", ["active", "negotiating"])
    .order("created_at", { ascending: false })
    .range(from, to);

  const search = normalizeSearchTerm(input.query);
  if (search) listingsQuery = listingsQuery.ilike("title", `%${search}%`);
  if (categoryId) listingsQuery = listingsQuery.eq("category_id", categoryId);
  if (subcategoryId)
    listingsQuery = listingsQuery.eq("subcategory_id", subcategoryId);
  if (input.type) listingsQuery = listingsQuery.eq("type", input.type);

  const { data, error } = await listingsQuery;
  throwOnError(error, "تعذر استعراض الإعلانات");

  const pageRows = (data ?? []) as ListingRow[];
  const hasMore = pageRows.length > input.pageSize;
  const listings = pageRows.slice(0, input.pageSize);
  const [images, categories, subcategories] = await Promise.all([
    fetchImagesByListingIds(listings.map(listing => listing.id)),
    fetchCategoriesByIds(
      Array.from(new Set(listings.map(listing => listing.category_id)))
    ),
    fetchSubcategoriesByIds(
      Array.from(
        new Set(
          listings.flatMap(listing =>
            listing.subcategory_id ? [listing.subcategory_id] : []
          )
        )
      )
    ),
  ]);

  return {
    items: listings.map(listing =>
      toListingPreview(listing, categories, images, subcategories)
    ),
    page: input.page,
    hasMore,
  };
}

export async function getListingDetails(
  listingId: string,
  viewerId?: string
): Promise<ListingDetails | null> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("listings")
    .select(
      "id, seller_id, winner_id, category_id, subcategory_id, title, description, type, starting_price, current_price, fixed_price, minimum_bid_increment, auction_end_time, status, source, external_market_name, external_listing_url, created_at, updated_at"
    )
    .eq("id", listingId)
    .in("status", ["active", "negotiating", "sold", "expired"])
    .maybeSingle();

  throwOnError(error, "تعذر جلب تفاصيل الإعلان");
  if (!data) return null;

  const listing = data as ListingRow;
  if (
    listing.type !== "auction" &&
    (listing.status === "sold" || listing.status === "expired")
  )
    return null;
  const [
    { data: sellerData, error: sellerError },
    images,
    categories,
    bidsResult,
  ] = await Promise.all([
    client
      .from("users")
      .select("id, name, avatar_url, rating_avg, rating_count")
      .eq("id", listing.seller_id)
      .single(),
    fetchImagesByListingIds([listing.id]),
    fetchCategoriesByIds([listing.category_id]),
    client
      .from("bids")
      .select("id, bidder_id, amount, created_at")
      .eq("listing_id", listing.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  throwOnError(sellerError, "تعذر جلب بيانات البائع");
  throwOnError(bidsResult.error, "تعذر جلب سجل المزايدات");
  const seller = sellerData as Pick<
    MarketplaceUserRow,
    "id" | "name" | "avatar_url" | "rating_avg" | "rating_count"
  >;
  const bidRows = (bidsResult.data ?? []) as Array<{
    id: string;
    bidder_id: string;
    amount: number;
    created_at: string;
  }>;
  const bidderIds = Array.from(new Set(bidRows.map(bid => bid.bidder_id)));
  const { data: bidderData, error: bidderError } = bidderIds.length
    ? await client.from("users").select("id, name").in("id", bidderIds)
    : { data: [], error: null };
  throwOnError(bidderError, "تعذر جلب أسماء المزايدين");
  const bidderNames = new Map(
    ((bidderData ?? []) as Array<{ id: string; name: string }>).map(user => [
      user.id,
      user.name,
    ])
  );
  const preview = toListingPreview(listing, categories, images);

  return {
    ...preview,
    description: listing.description,
    startingPrice: listing.starting_price,
    currentPrice: listing.current_price,
    fixedPrice: listing.fixed_price,
    minimumBidIncrement: Number(listing.minimum_bid_increment ?? 10),
    auctionHasWinner: listing.type === "auction" && Boolean(listing.winner_id),
    viewerWonAuction:
      listing.type === "auction" &&
      Boolean(viewerId && listing.winner_id === viewerId),
    imageUrls: (images.get(listing.id) ?? []).map(image => image.image_url),
    seller: {
      id: seller.id,
      name: seller.name,
      avatarUrl: seller.avatar_url,
      ratingAverage: seller.rating_avg,
      ratingCount: seller.rating_count,
    },
    bids: bidRows.map(bid => ({
      id: bid.id,
      bidderId: bid.bidder_id,
      bidderName: bidderNames.get(bid.bidder_id) ?? "مستخدم",
      amount: Number(bid.amount),
      createdAt: bid.created_at,
    })),
  };
}

export async function getFavorites(userId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  throwOnError(error, "تعذر جلب المفضلة");
  const listingIds = ((data ?? []) as { listing_id: string }[]).map(
    item => item.listing_id
  );
  if (listingIds.length === 0) return [];

  const { data: listingsData, error: listingsError } = await client
    .from("listings")
    .select(
      "id, seller_id, winner_id, category_id, subcategory_id, title, description, type, starting_price, current_price, fixed_price, auction_end_time, status, source, external_market_name, external_listing_url, created_at, updated_at"
    )
    .in("id", listingIds)
    .eq("status", "active");

  throwOnError(listingsError, "تعذر جلب إعلانات المفضلة");
  const listings = (listingsData ?? []) as ListingRow[];
  const [images, categories, subcategories] = await Promise.all([
    fetchImagesByListingIds(listings.map(listing => listing.id)),
    fetchCategoriesByIds(
      Array.from(new Set(listings.map(listing => listing.category_id)))
    ),
    fetchSubcategoriesByIds(
      Array.from(
        new Set(
          listings.flatMap(listing =>
            listing.subcategory_id ? [listing.subcategory_id] : []
          )
        )
      )
    ),
  ]);

  return listings.map(listing => toListingPreview(listing, categories, images));
}

export async function toggleFavorite(userId: string, listingId: string) {
  const client = getSupabaseAdmin();
  const { data: existing, error: existingError } = await client
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();

  throwOnError(existingError, "تعذر التحقق من حالة المفضلة");
  if (existing) {
    const { error } = await client
      .from("favorites")
      .delete()
      .eq("id", (existing as { id: string }).id);
    throwOnError(error, "تعذر إزالة الإعلان من المفضلة");
    return { favorite: false };
  }

  const { error } = await client
    .from("favorites")
    .insert({ user_id: userId, listing_id: listingId });
  throwOnError(error, "تعذر إضافة الإعلان إلى المفضلة");
  return { favorite: true };
}

export async function getNotifications(userId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("notifications")
    .select("id, user_id, listing_id, message, type, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  throwOnError(error, "تعذر جلب الإشعارات");
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
) {
  const client = getSupabaseAdmin();
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  throwOnError(error, "تعذر تحديث حالة الإشعار");
  return { success: true };
}

async function assertConversationParticipant(
  conversationId: string,
  userId: string
) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  throwOnError(error, "تعذر التحقق من صلاحية المحادثة");
  if (!data) throw new Error("لا تملك صلاحية الوصول إلى هذه المحادثة");
}

async function getUserNameMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("users")
    .select("id, name")
    .in("id", Array.from(new Set(userIds)));
  throwOnError(error, "تعذر جلب أسماء المستخدمين");
  return new Map(
    ((data ?? []) as Array<Pick<MarketplaceUserRow, "id" | "name">>).map(
      user => [user.id, user.name]
    )
  );
}

export async function getConversations(userId: string) {
  const client = getSupabaseAdmin();
  const { data: participantRows, error: participantsError } = await client
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .limit(100);
  throwOnError(participantsError, "تعذر جلب محادثاتك");
  const conversationIds = (
    (participantRows ?? []) as Array<{ conversation_id: string }>
  ).map(row => row.conversation_id);
  if (!conversationIds.length) return [];

  const [
    { data: conversations, error: conversationsError },
    { data: allParticipants, error: allParticipantsError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
    client
      .from("conversations")
      .select("id, listing_id, status, created_by, created_at, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false }),
    client
      .from("conversation_participants")
      .select("id, conversation_id, user_id")
      .in("conversation_id", conversationIds),
    client
      .from("messages")
      .select(
        "id, conversation_id, sender_id, content, is_read, created_at, deleted_at, deleted_by"
      )
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  throwOnError(conversationsError, "تعذر جلب تفاصيل المحادثات");
  throwOnError(allParticipantsError, "تعذر جلب أطراف المحادثات");
  throwOnError(messagesError, "تعذر جلب آخر الرسائل");

  const participants = (allParticipants ?? []) as ConversationParticipantRow[];
  const names = await getUserNameMap(
    participants.map(participant => participant.user_id)
  );
  const latestMessage = new Map<string, MessageRow>();
  for (const message of (messages ?? []) as MessageRow[])
    if (!latestMessage.has(message.conversation_id))
      latestMessage.set(message.conversation_id, message);

  return ((conversations ?? []) as ConversationRow[]).map(conversation => {
    const other = participants.find(
      participant =>
        participant.conversation_id === conversation.id &&
        participant.user_id !== userId
    );
    const last = latestMessage.get(conversation.id) ?? null;
    return {
      id: conversation.id,
      listingId: conversation.listing_id,
      status: conversation.status,
      updatedAt: conversation.updated_at,
      otherParticipant: other
        ? { id: other.user_id, name: names.get(other.user_id) ?? "مستخدم" }
        : null,
      lastMessage: last
        ? {
            content: last.content,
            createdAt: last.created_at,
            senderId: last.sender_id,
          }
        : null,
    };
  });
}

export async function getConversationMessages(
  userId: string,
  conversationId: string
) {
  await assertConversationParticipant(conversationId, userId);
  const client = getSupabaseAdmin();
  const [
    { data: conversation, error: conversationError },
    { data: messageRows, error: messagesError },
  ] = await Promise.all([
    client
      .from("conversations")
      .select("id, listing_id, status, created_by, created_at, updated_at")
      .eq("id", conversationId)
      .maybeSingle(),
    client
      .from("messages")
      .select(
        "id, conversation_id, sender_id, content, is_read, created_at, deleted_at, deleted_by"
      )
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  throwOnError(conversationError, "تعذر جلب المحادثة");
  throwOnError(messagesError, "تعذر جلب الرسائل");
  if (!conversation) throw new Error("المحادثة غير موجودة");

  const messages = (messageRows ?? []) as MessageRow[];
  const names = await getUserNameMap(
    messages.map(message => message.sender_id)
  );
  return {
    conversation: conversation as ConversationRow,
    messages: messages.map(message => ({
      ...message,
      senderName: names.get(message.sender_id) ?? "مستخدم",
    })),
  };
}

export async function startConversation(input: {
  userId: string;
  recipientId: string;
  listingId?: string;
}) {
  if (input.userId === input.recipientId)
    throw new Error("لا يمكنك بدء محادثة مع حسابك");
  const client = getSupabaseAdmin();

  if (input.listingId) {
    const { data: listing, error } = await client
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", input.listingId)
      .maybeSingle();
    throwOnError(error, "تعذر التحقق من الإعلان");
    if (!listing || (listing as { status: ListingStatus }).status !== "active")
      throw new Error("الإعلان غير متاح لبدء محادثة");
    if ((listing as { seller_id: string }).seller_id !== input.recipientId)
      throw new Error("يجب أن تكون المحادثة مرتبطة ببائع الإعلان");
  }

  const { data: recipient, error: recipientError } = await client
    .from("users")
    .select("id, is_banned")
    .eq("id", input.recipientId)
    .maybeSingle();
  throwOnError(recipientError, "تعذر التحقق من المستلم");
  if (!recipient || (recipient as { is_banned: boolean }).is_banned)
    throw new Error("هذا المستخدم غير متاح للمراسلة");

  const { data: userConversations, error: userConversationsError } =
    await client
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", input.userId)
      .limit(100);
  throwOnError(userConversationsError, "تعذر التحقق من المحادثات الحالية");
  const candidateIds = (
    (userConversations ?? []) as Array<{ conversation_id: string }>
  ).map(row => row.conversation_id);
  if (candidateIds.length) {
    const [
      { data: matchingParticipants, error: matchingParticipantsError },
      { data: matchingConversations, error: matchingConversationsError },
    ] = await Promise.all([
      client
        .from("conversation_participants")
        .select("conversation_id")
        .in("conversation_id", candidateIds)
        .eq("user_id", input.recipientId),
      client
        .from("conversations")
        .select("id, listing_id, status")
        .in("id", candidateIds)
        .eq("status", "open"),
    ]);
    throwOnError(matchingParticipantsError, "تعذر التحقق من أطراف المحادثة");
    throwOnError(
      matchingConversationsError,
      "تعذر التحقق من المحادثات الحالية"
    );
    const recipientConversationIds = new Set(
      ((matchingParticipants ?? []) as Array<{ conversation_id: string }>).map(
        row => row.conversation_id
      )
    );
    const existing = (
      (matchingConversations ?? []) as Array<
        Pick<ConversationRow, "id" | "listing_id" | "status">
      >
    ).find(
      conversation =>
        recipientConversationIds.has(conversation.id) &&
        (conversation.listing_id ?? null) === (input.listingId ?? null)
    );
    if (existing) return { id: existing.id, reused: true };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const { error: createConversationError } = await client
    .from("conversations")
    .insert({
      id,
      listing_id: input.listingId ?? null,
      status: "open",
      created_by: input.userId,
      updated_at: now,
    });
  throwOnError(createConversationError, "تعذر إنشاء المحادثة");
  const { error: participantsInsertError } = await client
    .from("conversation_participants")
    .insert([
      { id: randomUUID(), conversation_id: id, user_id: input.userId },
      { id: randomUUID(), conversation_id: id, user_id: input.recipientId },
    ]);
  throwOnError(participantsInsertError, "تعذر إضافة أطراف المحادثة");
  return { id, reused: false };
}

export async function sendMessage(input: {
  userId: string;
  conversationId: string;
  content: string;
}) {
  if (!isValidMessageContent(input.content))
    throw new Error("يجب أن تكون الرسالة بين حرف واحد و2000 حرف");
  await assertConversationParticipant(input.conversationId, input.userId);
  const client = getSupabaseAdmin();
  const { data: conversation, error: conversationError } = await client
    .from("conversations")
    .select("id, status")
    .eq("id", input.conversationId)
    .maybeSingle();
  throwOnError(conversationError, "تعذر التحقق من حالة المحادثة");
  if (
    !conversation ||
    (conversation as { status: ConversationStatus }).status !== "open"
  )
    throw new Error("هذه المحادثة مغلقة");

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("messages")
    .insert({
      id: randomUUID(),
      conversation_id: input.conversationId,
      sender_id: input.userId,
      content: input.content.trim(),
      is_read: false,
    })
    .select("id, conversation_id, sender_id, content, is_read, created_at")
    .single();
  throwOnError(error, "تعذر إرسال الرسالة");
  const { error: updateError } = await client
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", input.conversationId);
  throwOnError(updateError, "تعذر تحديث وقت المحادثة");
  return data as MessageRow;
}

export async function deleteMessage(input: {
  userId: string;
  messageId: string;
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: input.userId })
    .eq("id", input.messageId)
    .eq("sender_id", input.userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  throwOnError(error, "تعذر حذف الرسالة");
  if (!data) throw new Error("لا يمكنك حذف هذه الرسالة");
  return { success: true };
}

export async function getAdminConversationMessages() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("messages")
    .select(
      "id, conversation_id, sender_id, content, is_read, created_at, deleted_at, deleted_by"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  throwOnError(error, "تعذر جلب سجل المحادثات للإدارة");
  const messages = (data ?? []) as MessageRow[];
  const names = await getUserNameMap(
    Array.from(
      new Set(
        messages.flatMap(
          message =>
            [message.sender_id, message.deleted_by].filter(Boolean) as string[]
        )
      )
    )
  );
  return messages.map(message => ({
    ...message,
    senderName: names.get(message.sender_id) ?? "مستخدم",
    deletedByName: message.deleted_by
      ? (names.get(message.deleted_by) ?? "مستخدم")
      : null,
    deletionNotice: message.deleted_at
      ? `تم حذف هذه الرسالة من قبل المستخدم ${names.get(message.deleted_by ?? "") ?? "مستخدم"}`
      : null,
  }));
}

export async function getOrdersForDisputes(userId: string) {
  const client = getSupabaseAdmin();
  const [buyerResult, sellerResult] = await Promise.all([
    client
      .from("orders")
      .select(
        "id, listing_id, buyer_id, seller_id, final_price, payment_status, delivery_status, created_at"
      )
      .eq("buyer_id", userId)
      .limit(50),
    client
      .from("orders")
      .select(
        "id, listing_id, buyer_id, seller_id, final_price, payment_status, delivery_status, created_at"
      )
      .eq("seller_id", userId)
      .limit(50),
  ]);
  throwOnError(buyerResult.error, "تعذر جلب طلبات المشتري");
  throwOnError(sellerResult.error, "تعذر جلب طلبات البائع");
  const orders = Array.from(
    new Map(
      [
        ...((buyerResult.data ?? []) as OrderRow[]),
        ...((sellerResult.data ?? []) as OrderRow[]),
      ].map(order => [order.id, order])
    ).values()
  );
  if (!orders.length) return [];
  const { data: listings, error: listingsError } = await client
    .from("listings")
    .select("id, title")
    .in(
      "id",
      orders.map(order => order.listing_id)
    );
  throwOnError(listingsError, "تعذر جلب عناوين الطلبات");
  const titles = new Map(
    ((listings ?? []) as Array<{ id: string; title: string }>).map(listing => [
      listing.id,
      listing.title,
    ])
  );
  const names = await getUserNameMap(
    Array.from(
      new Set(orders.flatMap(order => [order.buyer_id, order.seller_id]))
    )
  );
  return orders.map(order => ({
    ...order,
    listingTitle: titles.get(order.listing_id) ?? "إعلان",
    buyerName: names.get(order.buyer_id) ?? "مستخدم",
    sellerName: names.get(order.seller_id) ?? "بائع",
  }));
}

export async function createDispute(input: {
  userId: string;
  orderId: string;
  reason: string;
}) {
  if (!isValidDisputeReason(input.reason))
    throw new Error("اكتب سببًا واضحًا للنزاع بين 10 و2000 حرف");
  const client = getSupabaseAdmin();
  const { data: orderData, error: orderError } = await client
    .from("orders")
    .select("id, buyer_id, seller_id")
    .eq("id", input.orderId)
    .maybeSingle();
  throwOnError(orderError, "تعذر التحقق من الطلب");
  const order = orderData as Pick<
    OrderRow,
    "id" | "buyer_id" | "seller_id"
  > | null;
  if (
    !order ||
    (order.buyer_id !== input.userId && order.seller_id !== input.userId)
  )
    throw new Error("لا تملك صلاحية فتح نزاع لهذا الطلب");
  const { data: existing, error: existingError } = await client
    .from("disputes")
    .select("id")
    .eq("order_id", input.orderId)
    .in("status", ["open", "under_review"])
    .maybeSingle();
  throwOnError(existingError, "تعذر التحقق من النزاعات الحالية");
  if (existing) throw new Error("يوجد نزاع مفتوح لهذا الطلب بالفعل");
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("disputes")
    .insert({
      id: randomUUID(),
      order_id: input.orderId,
      opened_by: input.userId,
      reason: input.reason.trim(),
      status: "open",
      updated_at: now,
    })
    .select(
      "id, order_id, opened_by, reason, status, resolution_note, created_at, updated_at"
    )
    .single();
  throwOnError(error, "تعذر فتح النزاع");
  return data as DisputeRow;
}

export async function getMyDisputes(userId: string) {
  const orders = await getOrdersForDisputes(userId);
  if (!orders.length) return [];
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("disputes")
    .select(
      "id, order_id, opened_by, reason, status, resolution_note, created_at, updated_at"
    )
    .in(
      "order_id",
      orders.map(order => order.id)
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  throwOnError(error, "تعذر جلب النزاعات");
  const ordersById = new Map(orders.map(order => [order.id, order]));
  return ((data ?? []) as DisputeRow[]).map(dispute => ({
    ...dispute,
    order: ordersById.get(dispute.order_id) ?? null,
  }));
}

export async function getDisputeQueue() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("disputes")
    .select(
      "id, order_id, opened_by, reason, status, resolution_note, created_at, updated_at"
    )
    .in("status", ["open", "under_review"])
    .order("updated_at", { ascending: false })
    .limit(100);
  throwOnError(error, "تعذر جلب طابور النزاعات");
  const disputes = (data ?? []) as DisputeRow[];
  if (!disputes.length) return [];
  const [{ data: ordersData, error: ordersError }, names] = await Promise.all([
    client
      .from("orders")
      .select(
        "id, listing_id, buyer_id, seller_id, final_price, payment_status, delivery_status, created_at"
      )
      .in(
        "id",
        disputes.map(dispute => dispute.order_id)
      ),
    getUserNameMap(disputes.map(dispute => dispute.opened_by)),
  ]);
  throwOnError(ordersError, "تعذر جلب تفاصيل الطلبات");
  const orders = (ordersData ?? []) as OrderRow[];
  const { data: listings, error: listingsError } = await client
    .from("listings")
    .select("id, title")
    .in(
      "id",
      orders.map(order => order.listing_id)
    );
  throwOnError(listingsError, "تعذر جلب عناوين الإعلانات");
  const titles = new Map(
    ((listings ?? []) as Array<{ id: string; title: string }>).map(listing => [
      listing.id,
      listing.title,
    ])
  );
  const ordersById = new Map(orders.map(order => [order.id, order]));
  return disputes.map(dispute => ({
    ...dispute,
    openedByName: names.get(dispute.opened_by) ?? "مستخدم",
    order: ordersById.get(dispute.order_id)
      ? {
          ...ordersById.get(dispute.order_id)!,
          listingTitle:
            titles.get(ordersById.get(dispute.order_id)!.listing_id) ?? "إعلان",
        }
      : null,
  }));
}

export async function updateDispute(input: {
  disputeId: string;
  status: Exclude<DisputeStatus, "open">;
  resolutionNote?: string;
}) {
  const note = input.resolutionNote?.trim() || null;
  if (
    (input.status === "resolved" || input.status === "rejected") &&
    (!note || note.length < 3)
  )
    throw new Error("أضف ملاحظة واضحة قبل إنهاء النزاع");
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("disputes")
    .update({
      status: input.status,
      resolution_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.disputeId)
    .in("status", ["open", "under_review"])
    .select("id, status, resolution_note")
    .maybeSingle();
  throwOnError(error, "تعذر تحديث النزاع");
  if (!data) throw new Error("النزاع غير متاح للتحديث");
  return data as {
    id: string;
    status: Exclude<DisputeStatus, "open">;
    resolution_note: string | null;
  };
}

export async function placeBid(
  userId: string,
  listingId: string,
  amount: number
) {
  if (!isValidMarketplaceAmount(amount)) {
    throw new Error("أدخل مبلغ مزايدة صحيحًا");
  }

  const client = getSupabaseAdmin();
  const { data, error } = await client.rpc("place_bid", {
    p_listing_id: listingId,
    p_bidder_id: userId,
    p_amount: amount,
  });

  throwOnError(error, "تعذر تسجيل المزايدة");
  const bid = Array.isArray(data) ? data[0] : data;
  return {
    bidId: (bid as { bid_id?: string } | null)?.bid_id ?? null,
    currentPrice:
      (bid as { new_current_price?: number } | null)?.new_current_price ??
      amount,
  };
}

export async function createOffer(input: {
  buyerId: string;
  listingId: string;
  amount: number;
  message?: string;
}) {
  if (!isValidMarketplaceAmount(input.amount)) {
    throw new Error("أدخل مبلغ عرض صحيحًا");
  }

  const client = getSupabaseAdmin();
  const { data, error } = await client.rpc("create_offer_with_hold", {
    p_listing_id: input.listingId,
    p_buyer_id: input.buyerId,
    p_amount: input.amount,
    p_message: input.message?.trim().slice(0, 500) || null,
  });
  throwOnError(error, "تعذر إرسال العرض وحجز المبلغ");
  const row = (Array.isArray(data) ? data[0] : data) as {
    offer_id: string;
  } | null;
  if (!row?.offer_id) throw new Error("تعذر إنشاء العرض");
  return {
    id: row.offer_id,
    amount: input.amount,
    status: "pending" as const,
    created_at: new Date().toISOString(),
  };
}

export async function convertListingToAuction(input: {
  sellerId: string;
  listingId: string;
  startingPrice: number;
  minimumBidIncrement: number;
  auctionEndTime: string;
}) {
  if (!isValidMarketplaceAmount(input.startingPrice))
    throw new Error("سعر بداية المزاد غير صالح");
  if (!isValidMarketplaceAmount(input.minimumBidIncrement))
    throw new Error("الحد الأدنى لزيادة المزايدة غير صالح");
  if (!isValidFutureAuctionEnd(input.auctionEndTime))
    throw new Error("يجب أن يكون موعد انتهاء المزاد في المستقبل");

  const client = getSupabaseAdmin();
  const { data, error } = await client.rpc("convert_listing_to_auction", {
    p_listing_id: input.listingId,
    p_seller_id: input.sellerId,
    p_starting_price: input.startingPrice,
    p_minimum_bid_increment: input.minimumBidIncrement,
    p_auction_end_time: input.auctionEndTime,
  });
  throwOnError(error, "تعذر تحويل الإعلان إلى مزاد");
  const row = (Array.isArray(data) ? data[0] : data) as {
    listing_id?: string;
  } | null;
  if (!row?.listing_id) throw new Error("لم يتم تأكيد تحويل الإعلان إلى مزاد");
  return {
    id: row.listing_id,
    type: "auction" as const,
    startingPrice: input.startingPrice,
    minimumBidIncrement: input.minimumBidIncrement,
    auctionEndTime: input.auctionEndTime,
  };
}

export async function createListing(input: {
  sellerId: string;
  categoryId: string;
  subcategoryId?: string;
  title: string;
  description: string;
  type: ListingType;
  fixedPrice?: number;
  startingPrice?: number;
  minimumBidIncrement?: number;
  auctionEndTime?: string;
  source?: ListingSource;
  externalMarketName?: string;
  externalListingUrl?: string;
}) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || description.length < 10) {
    throw new Error("أكمل عنوانًا ووصفًا واضحين للإعلان");
  }
  if (
    input.type === "fixed" &&
    !isValidMarketplaceAmount(input.fixedPrice ?? 0)
  ) {
    throw new Error("أدخل سعر البيع المباشر");
  }
  if (
    input.type === "auction" &&
    (!isValidMarketplaceAmount(input.startingPrice ?? 0) ||
      !isValidFutureAuctionEnd(input.auctionEndTime))
  ) {
    throw new Error("أدخل سعر بداية صحيحًا ووقت انتهاء مستقبليًا للمزاد");
  }
  if (
    input.type === "auction" &&
    input.minimumBidIncrement !== undefined &&
    !isValidMarketplaceAmount(input.minimumBidIncrement)
  ) {
    throw new Error("أدخل حد زيادة صحيحًا للمزايدة");
  }
  if (input.source === "external") {
    if (!input.externalMarketName?.trim() || !input.externalListingUrl?.trim())
      throw new Error("أدخل اسم السوق الخارجي ورابط الإعلان");
    try {
      new URL(input.externalListingUrl);
    } catch {
      throw new Error("رابط السوق الخارجي غير صالح");
    }
  }

  const client = getSupabaseAdmin();
  const { data: category, error: categoryError } = await client
    .from("categories")
    .select("id")
    .eq("id", input.categoryId)
    .maybeSingle();
  throwOnError(categoryError, "تعذر التحقق من التصنيف");
  if (!category) throw new Error("التصنيف المحدد غير متاح");

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("listings")
    .insert({
      id: randomUUID(),
      seller_id: input.sellerId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId ?? null,
      title,
      description,
      type: input.type,
      fixed_price: input.type === "fixed" ? (input.fixedPrice ?? null) : null,
      starting_price:
        input.type === "auction" ? (input.startingPrice ?? null) : null,
      current_price:
        input.type === "auction" ? (input.startingPrice ?? null) : null,
      minimum_bid_increment:
        input.type === "auction" ? (input.minimumBidIncrement ?? 10) : 10,
      auction_end_time:
        input.type === "auction" ? (input.auctionEndTime ?? null) : null,
      status: "pending",
      source: input.source === "external" ? "external" : "internal",
      external_market_name:
        input.source === "external"
          ? input.externalMarketName?.trim().slice(0, 100) || null
          : null,
      external_listing_url:
        input.source === "external"
          ? input.externalListingUrl?.trim().slice(0, 1000) || null
          : null,
      updated_at: now,
    })
    .select("id, title, status, type, created_at")
    .single();

  throwOnError(error, "تعذر إرسال الإعلان للمراجعة");
  const { error: notificationError } = await client
    .from("notifications")
    .insert({
      user_id: input.sellerId,
      listing_id: (data as { id: string }).id,
      message: "تم إرسال إعلانك للمراجعة بنجاح",
      type: "listing_submitted",
    });
  throwOnError(notificationError, "تعذر إنشاء إشعار الإعلان");
  return data as {
    id: string;
    title: string;
    status: "pending";
    type: ListingType;
    created_at: string;
  };
}

export async function uploadListingImage(input: {
  sellerId: string;
  listingId: string;
  dataUrl: string;
}) {
  const client = getSupabaseAdmin();
  const { data: listing, error: listingError } = await client
    .from("listings")
    .select("id, seller_id")
    .eq("id", input.listingId)
    .maybeSingle();
  throwOnError(listingError, "تعذر التحقق من الإعلان قبل رفع الصورة");
  if (
    !listing ||
    (listing as { seller_id: string }).seller_id !== input.sellerId
  )
    throw new Error("لا تملك صلاحية إضافة صور لهذا الإعلان");

  const { count, error: countError } = await client
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", input.listingId);
  throwOnError(countError, "تعذر التحقق من عدد الصور");
  if ((count ?? 0) >= 6) throw new Error("الحد الأقصى هو 6 صور لكل إعلان");

  const image = parseListingImageDataUrl(input.dataUrl);
  const { url } = await storagePut(
    `listing-images/${input.sellerId}/${input.listingId}/image.${image.extension}`,
    image.bytes,
    image.mimeType
  );
  const { data: latest, error: latestError } = await client
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", input.listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwOnError(latestError, "تعذر ترتيب صورة الإعلان");
  const sortOrder =
    ((latest as { sort_order: number } | null)?.sort_order ?? -1) + 1;
  const { data, error } = await client
    .from("listing_images")
    .insert({
      id: randomUUID(),
      listing_id: input.listingId,
      image_url: url,
      sort_order: sortOrder,
    })
    .select("id, listing_id, image_url, sort_order")
    .single();
  throwOnError(error, "تعذر ربط الصورة بالإعلان");
  return data as Pick<
    ListingImageRow,
    "id" | "listing_id" | "image_url" | "sort_order"
  >;
}

export async function uploadCategoryImage(input: { dataUrl: string }) {
  const image = parseListingImageDataUrl(input.dataUrl);
  const { url } = await storagePut(
    `category-images/${randomUUID()}/image.${image.extension}`,
    image.bytes,
    image.mimeType
  );
  return { url };
}

export async function getPendingListings() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("listings")
    .select(
      "id, seller_id, category_id, title, description, type, starting_price, fixed_price, auction_end_time, created_at, is_featured"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  throwOnError(error, "تعذر جلب الإعلانات المعلقة");
  const listings = (data ?? []) as Array<
    Pick<
      ListingRow,
      | "id"
      | "seller_id"
      | "category_id"
      | "title"
      | "description"
      | "type"
      | "starting_price"
      | "fixed_price"
      | "auction_end_time"
      | "created_at"
      | "is_featured"
    >
  >;
  const [categories, sellers] = await Promise.all([
    fetchCategoriesByIds(
      Array.from(new Set(listings.map(listing => listing.category_id)))
    ),
    (async () => {
      if (!listings.length)
        return new Map<string, Pick<MarketplaceUserRow, "id" | "name">>();
      const { data: users, error: usersError } = await client
        .from("users")
        .select("id, name")
        .in(
          "id",
          Array.from(new Set(listings.map(listing => listing.seller_id)))
        );
      throwOnError(usersError, "تعذر جلب البائعين");
      return new Map(
        ((users ?? []) as Array<Pick<MarketplaceUserRow, "id" | "name">>).map(
          user => [user.id, user]
        )
      );
    })(),
  ]);
  return listings.map(listing => ({
    ...listing,
    categoryName: categories.get(listing.category_id)?.name ?? "غير مصنف",
    sellerName: sellers.get(listing.seller_id)?.name ?? "مستخدم",
  }));
}

export async function reviewListing(input: {
  listingId: string;
  status: "active" | "rejected";
  reason?: string;
}) {
  const client = getSupabaseAdmin();
  const changes = {
    status: input.status,
    rejection_reason:
      input.status === "rejected"
        ? input.reason?.trim().slice(0, 500) ||
          "لم يستوفِ الإعلان متطلبات النشر"
        : null,
    updated_at: new Date().toISOString(),
    ...(input.status === "rejected" ? { is_featured: false } : {}),
  };
  const { data, error } = await client
    .from("listings")
    .update(changes)
    .eq("id", input.listingId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();
  throwOnError(error, "تعذر مراجعة الإعلان");
  if (!data) throw new Error("الإعلان غير متاح للمراجعة أو تمت مراجعته مسبقًا");
  return data as { id: string; status: "active" | "rejected" };
}

export async function getAdminUsers(input: {
  query?: string;
  page: number;
  pageSize: number;
  group?: "regular" | "administrators" | "supervisors";
  includePermissions?: boolean;
}) {
  const client = getSupabaseAdmin();
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize;
  const group = input.group ?? "regular";
  const { data: permissionData, error: permissionError } = await client
    .from("admin_permissions")
    .select("user_id, permissions");
  throwOnError(permissionError, "تعذر جلب تصنيف الحسابات الإدارية");
  const permissionRows = (permissionData ?? []) as Array<
    Pick<AdminPermissionRow, "user_id" | "permissions">
  >;
  const delegatedIds = permissionRows.map(item => item.user_id);
  const permissionsByUserId = new Map(
    permissionRows.map(item => [
      item.user_id,
      normalizeAdminPermissions(item.permissions),
    ])
  );

  let request = client
    .from("users")
    .select("id, name, email, role, is_seller, is_banned, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);
  const search = normalizeSearchTerm(input.query);
  if (search) request = request.ilike("name", `%${search}%`);
  if (group === "supervisors") request = request.eq("role", "super_admin");
  if (group === "administrators") {
    if (!delegatedIds.length)
      return { items: [], page: input.page, hasMore: false };
    request = request.in("id", delegatedIds);
  }
  if (group === "regular") {
    request = request.neq("role", "super_admin");
    if (delegatedIds.length)
      request = request.not("id", "in", `(${delegatedIds.join(",")})`);
  }

  const { data, error } = await request;
  throwOnError(error, "تعذر جلب المستخدمين");
  const rows = (data ?? []) as Array<
    Pick<
      MarketplaceUserRow,
      | "id"
      | "name"
      | "email"
      | "role"
      | "is_seller"
      | "is_banned"
      | "created_at"
    >
  >;
  return {
    items: rows.slice(0, input.pageSize).map(user => ({
      ...user,
      accountGroup:
        user.role === "super_admin"
          ? ("supervisors" as const)
          : permissionsByUserId.has(user.id)
            ? ("administrators" as const)
            : ("regular" as const),
      permissions: input.includePermissions
        ? (permissionsByUserId.get(user.id) ?? [])
        : [],
    })),
    page: input.page,
    hasMore: rows.length > input.pageSize,
  };
}

export async function getAdminStaff(input: {
  query?: string;
  page: number;
  pageSize: number;
}) {
  const client = getSupabaseAdmin();
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize;
  let usersRequest = client
    .from("users")
    .select("id, name, email, role, is_banned, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);
  const search = normalizeSearchTerm(input.query);
  if (search)
    usersRequest = usersRequest.or(
      `name.ilike.%${search}%,email.ilike.%${search}%`
    );
  const { data, error } = await usersRequest;
  throwOnError(error, "تعذر جلب مستخدمي الإدارة");

  const users = (data ?? []) as Array<
    Pick<
      MarketplaceUserRow,
      "id" | "name" | "email" | "role" | "is_banned" | "created_at"
    >
  >;
  const userIds = users.map(user => user.id);
  const { data: permissionData, error: permissionError } = userIds.length
    ? await client
        .from("admin_permissions")
        .select("user_id, permissions, granted_by, created_at, updated_at")
        .in("user_id", userIds)
    : { data: [], error: null };
  throwOnError(permissionError, "تعذر جلب صلاحيات مستخدمي الإدارة");
  const permissionsByUserId = new Map(
    ((permissionData ?? []) as AdminPermissionRow[]).map(item => [
      item.user_id,
      normalizeAdminPermissions(item.permissions),
    ])
  );

  return {
    items: users.slice(0, input.pageSize).map(user => ({
      ...user,
      permissions:
        user.role === "super_admin"
          ? [...ADMIN_PERMISSION_VALUES]
          : (permissionsByUserId.get(user.id) ?? []),
      isSuperAdmin: user.role === "super_admin",
    })),
    page: input.page,
    hasMore: users.length > input.pageSize,
  };
}

export async function setDelegatedAdminPermissions(input: {
  actorId: string;
  userId: string;
  permissions: AdminPermission[];
}) {
  if (input.actorId === input.userId)
    throw new Error("لا يمكنك تعديل صلاحياتك الإدارية من هذه الصفحة");
  if (input.permissions.length === 0)
    throw new Error("اختر صلاحية إدارية واحدة على الأقل");
  const client = getSupabaseAdmin();
  const { data: target, error: targetError } = await client
    .from("users")
    .select("id, role, is_banned")
    .eq("id", input.userId)
    .maybeSingle();
  throwOnError(targetError, "تعذر التحقق من المستخدم المستهدف");
  if (!target)
    throw new Error(
      "المستخدم غير موجود. يجب أن يسجل المستخدم دخوله إلى لقطة أولاً."
    );
  if ((target as { role: MarketplaceRole }).role === "super_admin")
    throw new Error(
      "المشرف العام يمتلك كامل الصلاحيات ولا يمكن تعديلها من هذه الصفحة"
    );
  if ((target as { is_banned: boolean }).is_banned)
    throw new Error("لا يمكن إسناد صلاحيات إدارية إلى حساب محظور");

  const { data, error } = await client
    .from("admin_permissions")
    .upsert(
      {
        user_id: input.userId,
        permissions: input.permissions,
        granted_by: input.actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("user_id, permissions")
    .single();
  throwOnError(error, "تعذر حفظ صلاحيات المستخدم الإداري");
  return {
    userId: (data as { user_id: string }).user_id,
    permissions: normalizeAdminPermissions(
      (data as { permissions: unknown }).permissions
    ),
  };
}

export async function removeDelegatedAdminPermissions(input: {
  actorId: string;
  userId: string;
}) {
  if (input.actorId === input.userId)
    throw new Error("لا يمكنك إزالة صلاحياتك الإدارية من هذه الصفحة");
  const client = getSupabaseAdmin();
  const { data: target, error: targetError } = await client
    .from("users")
    .select("id, role")
    .eq("id", input.userId)
    .maybeSingle();
  throwOnError(targetError, "تعذر التحقق من المستخدم المستهدف");
  if (!target) throw new Error("المستخدم غير موجود");
  if ((target as { role: MarketplaceRole }).role === "super_admin")
    throw new Error("لا يمكن إزالة صلاحيات المشرف العام");
  const { error } = await client
    .from("admin_permissions")
    .delete()
    .eq("user_id", input.userId);
  throwOnError(error, "تعذر إزالة صلاحيات المستخدم الإداري");
  return { userId: input.userId };
}

export async function getAdminCategories() {
  return getCategoriesWithSubcategories(200);
}

export async function createAdminCategory(input: {
  name: string;
  nameEn?: string | null;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("categories")
    .insert({
      id: randomUUID(),
      name: input.name.trim(),
      name_en: input.nameEn?.trim() || null,
      slug: input.slug.trim().toLowerCase(),
      icon: input.imageUrl?.trim() || input.icon?.trim() || null,
    })
    .select("id, name, name_en, slug, icon")
    .single();
  throwOnError(error, "تعذر إضافة التصنيف");
  const category = data as CategoryRow;
  return { ...category, imageUrl: categoryImageUrl(category.icon) };
}

export async function updateAdminCategory(input: {
  categoryId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("categories")
    .update({
      name: input.name.trim(),
      name_en: input.nameEn?.trim() || null,
      slug: input.slug.trim().toLowerCase(),
      icon: input.imageUrl?.trim() || input.icon?.trim() || null,
    })
    .eq("id", input.categoryId)
    .select("id, name, name_en, slug, icon")
    .maybeSingle();
  throwOnError(error, "تعذر تعديل التصنيف");
  if (!data) throw new Error("التصنيف غير موجود");
  const category = data as CategoryRow;
  return { ...category, imageUrl: categoryImageUrl(category.icon) };
}
export async function createAdminSubcategory(input: {
  categoryId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}) {
  const client = getSupabaseAdmin();
  const { data: parent, error: parentError } = await client
    .from("categories")
    .select("id")
    .eq("id", input.categoryId)
    .maybeSingle();
  throwOnError(parentError, "تعذر التحقق من التصنيف الرئيسي");
  if (!parent) throw new Error("التصنيف الرئيسي غير موجود");
  const { data, error } = await client
    .from("subcategories")
    .insert({
      id: randomUUID(),
      category_id: input.categoryId,
      name: input.name.trim(),
      name_en: input.nameEn?.trim() || null,
      slug: input.slug.trim().toLowerCase(),
    })
    .select("id, category_id, name, name_en, slug")
    .single();
  throwOnError(error, "تعذر إضافة الفئة الفرعية");
  return data as SubcategoryRow;
}
export async function updateAdminSubcategory(input: {
  subcategoryId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("subcategories")
    .update({
      name: input.name.trim(),
      name_en: input.nameEn?.trim() || null,
      slug: input.slug.trim().toLowerCase(),
    })
    .eq("id", input.subcategoryId)
    .select("id, category_id, name, name_en, slug")
    .maybeSingle();
  throwOnError(error, "تعذر تعديل الفئة الفرعية");
  if (!data) throw new Error("الفئة الفرعية غير موجودة");
  return data as SubcategoryRow;
}

export async function deleteAdminSubcategory(subcategoryId: string) {
  const { error } = await getSupabaseAdmin()
    .from("subcategories")
    .delete()
    .eq("id", subcategoryId);
  throwOnError(error, "تعذر حذف الفئة الفرعية");
  return { success: true };
}

export async function deleteAdminCategory(categoryId: string) {
  const client = getSupabaseAdmin();
  const { count, error: listingsError } = await client
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  throwOnError(listingsError, "تعذر التحقق من إعلانات التصنيف");
  if ((count ?? 0) > 0)
    throw new Error("لا يمكن حذف تصنيف مرتبط بإعلانات؛ انقل الإعلانات أولاً");
  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", categoryId);
  throwOnError(error, "تعذر حذف التصنيف");
  return { success: true };
}

export async function setUserPreferredLanguage(input: {
  userId: string;
  language: "ar" | "en";
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("users")
    .update({
      preferred_language: input.language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
    .select("preferred_language")
    .single();

  throwOnError(error, "تعذر حفظ اللغة الافتراضية");
  return {
    preferredLanguage: (data as { preferred_language: "ar" | "en" })
      .preferred_language,
  };
}

export async function becomeSeller(userId: string) {
  // Self-service seller onboarding: any authenticated, non-banned user can
  // flip their own account to seller status. There is intentionally no
  // approval step here — listings themselves still require admin review
  // before going live (see reviewListing), so this only unlocks access to
  // the seller dashboard and its endpoints (sellerProcedure), not the
  // ability to publish unreviewed listings.
  const client = getSupabaseAdmin();
  const { data: user, error: userError } = await client
    .from("users")
    .select("is_banned, is_seller")
    .eq("id", userId)
    .maybeSingle();
  throwOnError(userError, "تعذر التحقق من الحساب");
  if (!user) throw new Error("الحساب غير موجود");
  if (user.is_banned)
    throw new Error("لا يمكن تفعيل صلاحية البائع لحساب محظور");
  if (user.is_seller) return { isSeller: true };
  const { error } = await client
    .from("users")
    .update({ is_seller: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  throwOnError(error, "تعذر تفعيل صلاحية البائع");
  return { isSeller: true };
}

export async function setUserBanStatus(input: {
  actorId: string;
  userId: string;
  isBanned: boolean;
}) {
  if (input.actorId === input.userId)
    throw new Error("لا يمكنك تغيير حالة حظر حسابك من لوحة الإدارة");
  const client = getSupabaseAdmin();
  const { data: target, error: targetError } = await client
    .from("users")
    .select("id, role")
    .eq("id", input.userId)
    .maybeSingle();
  throwOnError(targetError, "تعذر التحقق من المستخدم");
  if (!target) throw new Error("المستخدم غير موجود");
  if ((target as { role: MarketplaceRole }).role === "super_admin")
    throw new Error("لا يمكن تعديل حظر مشرف عام من هذه الواجهة");
  const { data, error } = await client
    .from("users")
    .update({ is_banned: input.isBanned, updated_at: new Date().toISOString() })
    .eq("id", input.userId)
    .select("id, is_banned")
    .single();
  throwOnError(error, "تعذر تحديث حالة المستخدم");
  return data as { id: string; is_banned: boolean };
}

export async function getAdminListings(input: {
  type?: ListingType;
  status?: ListingStatus;
  query?: string;
  page: number;
  pageSize: number;
}) {
  const client = getSupabaseAdmin();
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize;
  let request = client
    .from("listings")
    .select(
      "id, seller_id, category_id, title, description, type, status, is_featured, fixed_price, starting_price, current_price, auction_end_time, rejection_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  const search = normalizeSearchTerm(input.query);
  if (search) request = request.ilike("title", `%${search}%`);
  if (input.type) request = request.eq("type", input.type);
  if (input.status) request = request.eq("status", input.status);
  const { data, error } = await request;
  throwOnError(error, "تعذر جلب الإعلانات");
  const listings = (data ?? []) as Array<
    Pick<
      ListingRow,
      | "id"
      | "seller_id"
      | "category_id"
      | "title"
      | "description"
      | "type"
      | "status"
      | "is_featured"
      | "fixed_price"
      | "starting_price"
      | "current_price"
      | "auction_end_time"
      | "created_at"
    >
  >;
  const [sellersResult, categories, images] = await Promise.all([
    listings.length
      ? client
          .from("users")
          .select("id, name, email, phone")
          .in(
            "id",
            listings.map(listing => listing.seller_id)
          )
      : Promise.resolve({ data: [], error: null }),
    fetchCategoriesByIds(
      Array.from(new Set(listings.map(listing => listing.category_id)))
    ),
    fetchImagesByListingIds(listings.map(listing => listing.id)),
  ]);
  throwOnError(sellersResult.error, "تعذر جلب بيانات البائعين");
  const sellers = new Map(
    (
      (sellersResult.data ?? []) as Array<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
      }>
    ).map(seller => [seller.id, seller])
  );
  return {
    items: listings.slice(0, input.pageSize).map(listing => ({
      ...listing,
      images: (images.get(listing.id) ?? []).map(image => image.image_url),
      sellerName: sellers.get(listing.seller_id)?.name ?? "مستخدم",
      sellerEmail: sellers.get(listing.seller_id)?.email ?? null,
      sellerPhone: sellers.get(listing.seller_id)?.phone ?? null,
      categoryName: categories.get(listing.category_id)?.name ?? "غير مصنف",
    })),
    page: input.page,
    hasMore: listings.length > input.pageSize,
  };
}

export async function updateAdminListingStatus(input: {
  listingId: string;
  status: Extract<ListingStatus, "active" | "pending" | "rejected" | "expired">;
  reason?: string;
}) {
  const client = getSupabaseAdmin();
  const changes = {
    status: input.status,
    rejection_reason:
      input.status === "rejected"
        ? input.reason?.trim().slice(0, 500) ||
          "لم يستوفِ الإعلان متطلبات النشر"
        : null,
    updated_at: new Date().toISOString(),
    ...(["rejected", "expired"].includes(input.status)
      ? { is_featured: false }
      : {}),
  };
  const { data, error } = await client
    .from("listings")
    .update(changes)
    .eq("id", input.listingId)
    .select("id, status")
    .maybeSingle();
  throwOnError(error, "تعذر تحديث حالة الإعلان");
  if (!data) throw new Error("الإعلان غير موجود");
  return data as { id: string; status: ListingStatus };
}

export async function setAdminListingFeatured(input: {
  listingId: string;
  isFeatured: boolean;
}) {
  const client = getSupabaseAdmin();
  let request = client
    .from("listings")
    .update({
      is_featured: input.isFeatured,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.listingId);
  if (input.isFeatured) request = request.in("status", ["pending", "active"]);
  const { data, error } = await request.select("id, is_featured").maybeSingle();
  throwOnError(error, "تعذر تحديث تمييز الإعلان");
  if (!data)
    throw new Error(
      input.isFeatured
        ? "لا يمكن تمييز إعلان غير نشط أو غير منشور"
        : "الإعلان غير موجود"
    );
  return data as { id: string; is_featured: boolean };
}

export async function deleteAdminListing(listingId: string) {
  const client = getSupabaseAdmin();
  const [ordersResult, holdsResult] = await Promise.all([
    client.from("orders").select("id").eq("listing_id", listingId).limit(1),
    client.from("fund_holds").select("id").eq("listing_id", listingId).limit(1),
  ]);
  throwOnError(ordersResult.error, "تعذر التحقق من طلبات الإعلان");
  throwOnError(holdsResult.error, "تعذر التحقق من الحجوزات المالية للإعلان");
  if (ordersResult.data?.length)
    throw new Error(
      "لا يمكن حذف إعلان مرتبط بطلب شراء؛ غيّر حالته بدلًا من حذفه."
    );
  if (holdsResult.data?.length)
    throw new Error(
      "لا يمكن حذف إعلان مرتبط بحجوزات مالية أو مزايدات؛ حفاظًا على السجل المالي."
    );

  const { data, error } = await client
    .from("listings")
    .delete()
    .eq("id", listingId)
    .select("id")
    .maybeSingle();
  throwOnError(error, "تعذر حذف الإعلان");
  if (!data) throw new Error("الإعلان غير موجود");
  return { id: listingId };
}

export async function getAdminAuctions(input: {
  page: number;
  pageSize: number;
  status?: ListingStatus;
}) {
  return getAdminListings({ ...input, type: "auction" });
}

export async function getSupportQueue() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("support_tickets")
    .select("id, user_id, subject, status, created_at, updated_at")
    .in("status", ["open", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(50);
  throwOnError(error, "تعذر جلب طابور الدعم");
  return (data ?? []) as Array<{
    id: string;
    user_id: string;
    subject: string;
    status: "open" | "in_progress";
    created_at: string;
    updated_at: string;
  }>;
}

export async function updateSupportTicket(input: {
  ticketId: string;
  supportUserId: string;
  status: "in_progress" | "resolved" | "closed";
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("support_tickets")
    .update({
      assigned_admin_id: input.supportUserId,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ticketId)
    .select("id, status")
    .maybeSingle();
  throwOnError(error, "تعذر تحديث تذكرة الدعم");
  if (!data) throw new Error("تذكرة الدعم غير متاحة");
  return data as { id: string; status: "in_progress" | "resolved" | "closed" };
}

export async function getSellerOverview(userId: string) {
  const client = getSupabaseAdmin();
  const [listingsResult, auctionsResult] = await Promise.all([
    client
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId),
    client
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("type", "auction")
      .eq("status", "active"),
  ]);

  throwOnError(listingsResult.error, "تعذر جلب إحصاءات البائع");
  throwOnError(auctionsResult.error, "تعذر جلب إحصاءات المزادات");
  return {
    listingsCount: listingsResult.count ?? 0,
    activeAuctionsCount: auctionsResult.count ?? 0,
  };
}

export async function getSellerWorkspace(userId: string) {
  const client = getSupabaseAdmin();
  const [userResult, listingsResult, transactionsResult, soldResult] =
    await Promise.all([
      client.from("users").select("wallet_balance").eq("id", userId).single(),
      client
        .from("listings")
        .select(
          "id, title, type, status, source, fixed_price, current_price, starting_price, created_at"
        )
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("wallet_transactions")
        .select("id, amount, type, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      client
        .from("orders")
        .select(
          "id, listing_id, buyer_id, final_price, payment_status, delivery_status, created_at, listings(title)"
        )
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  throwOnError(userResult.error, "تعذر جلب رصيد المحفظة");
  throwOnError(listingsResult.error, "تعذر جلب إعلانات البائع");
  throwOnError(transactionsResult.error, "تعذر جلب نشاط المحفظة");
  throwOnError(soldResult.error, "تعذر جلب سجل المبيعات");

  const sellerListingRows = (listingsResult.data ?? []) as Array<
    Pick<
      ListingRow,
      | "id"
      | "title"
      | "type"
      | "status"
      | "source"
      | "fixed_price"
      | "current_price"
      | "starting_price"
      | "created_at"
    >
  >;
  const sellerListingIds = sellerListingRows.map(listing => listing.id);
  const blockedListingIds = new Set<string>();
  if (sellerListingIds.length) {
    const [ordersResult, bidsResult, offersResult] = await Promise.all([
      client
        .from("orders")
        .select("listing_id")
        .in("listing_id", sellerListingIds),
      client
        .from("bids")
        .select("listing_id")
        .in("listing_id", sellerListingIds),
      client
        .from("offers")
        .select("listing_id")
        .in("listing_id", sellerListingIds)
        .eq("status", "pending"),
    ]);
    throwOnError(ordersResult.error, "تعذر التحقق من طلبات الإعلان");
    throwOnError(bidsResult.error, "تعذر التحقق من مزايدات الإعلان");
    throwOnError(offersResult.error, "تعذر التحقق من عروض الإعلان");
    for (const row of [
      ...(ordersResult.data ?? []),
      ...(bidsResult.data ?? []),
      ...(offersResult.data ?? []),
    ] as Array<{ listing_id: string }>) {
      blockedListingIds.add(row.listing_id);
    }
  }
  const sellerListings = sellerListingRows.map(listing => ({
    ...listing,
    canConvertToAuction:
      listing.type === "fixed" &&
      listing.status === "active" &&
      listing.source === "internal" &&
      !blockedListingIds.has(listing.id),
  }));

  const soldRows = (soldResult.data ?? []) as Array<{
    id: string;
    listing_id: string;
    buyer_id: string;
    final_price: number;
    payment_status: string;
    delivery_status: string;
    created_at: string;
    listings: Array<{ title: string }> | null;
  }>;
  const soldListingIds = Array.from(
    new Set(soldRows.map(row => row.listing_id))
  );
  const soldBuyerIds = Array.from(new Set(soldRows.map(row => row.buyer_id)));
  const [
    { data: buyers, error: buyersError },
    { data: soldImages, error: soldImagesError },
  ] = await Promise.all([
    soldBuyerIds.length
      ? client.from("users").select("id, name").in("id", soldBuyerIds)
      : Promise.resolve({ data: [], error: null }),
    soldListingIds.length
      ? client
          .from("listing_images")
          .select("listing_id, image_url, sort_order")
          .in("listing_id", soldListingIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);
  throwOnError(buyersError, "تعذر جلب أسماء المشترين");
  throwOnError(soldImagesError, "تعذر جلب صور المبيعات");
  const buyerNames = new Map(
    ((buyers ?? []) as Array<{ id: string; name: string }>).map(buyer => [
      buyer.id,
      buyer.name,
    ])
  );
  const firstImages = new Map<string, string>();
  for (const image of (soldImages ?? []) as Array<{
    listing_id: string;
    image_url: string;
  }>)
    if (!firstImages.has(image.listing_id))
      firstImages.set(image.listing_id, image.image_url);

  return {
    walletBalance: Number(
      (userResult.data as { wallet_balance: number }).wallet_balance ?? 0
    ),
    listings: sellerListings,
    transactions: (transactionsResult.data ?? []) as Array<{
      id: string;
      amount: number;
      type: string;
      status: string;
      created_at: string;
    }>,
    soldItems: soldRows.map(row => ({
      ...row,
      listingTitle: row.listings?.[0]?.title ?? "إعلان",
      buyerName: buyerNames.get(row.buyer_id) ?? "مستخدم",
      imageUrl: firstImages.get(row.listing_id) ?? null,
    })),
  };
}

export async function getAdminOverview() {
  const client = getSupabaseAdmin();
  const [usersResult, listingsResult, auctionsResult, ticketsResult] =
    await Promise.all([
      client.from("users").select("id", { count: "exact", head: true }),
      client.from("listings").select("id", { count: "exact", head: true }),
      client
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("type", "auction")
        .eq("status", "active"),
      client
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
    ]);

  throwOnError(usersResult.error, "تعذر جلب إحصاءات المستخدمين");
  throwOnError(listingsResult.error, "تعذر جلب إحصاءات الإعلانات");
  throwOnError(auctionsResult.error, "تعذر جلب إحصاءات المزادات");
  throwOnError(ticketsResult.error, "تعذر جلب إحصاءات الدعم");

  return {
    usersCount: usersResult.count ?? 0,
    listingsCount: listingsResult.count ?? 0,
    activeAuctionsCount: auctionsResult.count ?? 0,
    openTicketsCount: ticketsResult.count ?? 0,
  };
}

export async function depositWallet(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)
    throw new Error("أدخل مبلغ شحن صحيحًا");
  const { error } = await getSupabaseAdmin().rpc("deposit_wallet", {
    p_user_id: userId,
    p_amount: amount,
  });
  throwOnError(error, "تعذر شحن المحفظة");
  return { success: true };
}

export async function getWalletBalance(userId: string) {
  const client = getSupabaseAdmin();
  const [{ data, error }, { data: holds, error: holdsError }] =
    await Promise.all([
      client.from("users").select("wallet_balance").eq("id", userId).single(),
      client
        .from("fund_holds")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);
  throwOnError(error, "تعذر جلب الرصيد");
  throwOnError(holdsError, "تعذر جلب الحجوزات المالية");
  const balance = Number(
    (data as { wallet_balance?: number } | null)?.wallet_balance ?? 0
  );
  const held = ((holds ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  return { balance, held, available: balance - held };
}

export async function addToCart(userId: string, listingId: string) {
  const client = getSupabaseAdmin();
  const { data: listing, error: listingError } = await client
    .from("listings")
    .select("id,type,status,fixed_price,seller_id")
    .eq("id", listingId)
    .maybeSingle();
  throwOnError(listingError, "تعذر التحقق من المنتج");
  if (
    !listing ||
    listing.status !== "active" ||
    listing.type !== "fixed" ||
    listing.fixed_price == null
  )
    throw new Error("هذا الإعلان غير متاح للسلة");
  if (listing.seller_id === userId)
    throw new Error("لا يمكنك إضافة إعلانك إلى سلتك");
  const { error } = await client
    .from("cart_items")
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id" }
    );
  throwOnError(error, "تعذر إضافة المنتج للسلة");
  return { success: true };
}

export type CartItem = {
  id: string;
  listing_id: string;
  added_at: string;
  listings: {
    title: string;
    fixed_price: number | null;
    status: ListingStatus;
    listing_images: Array<Pick<ListingImageRow, "image_url" | "sort_order">>;
  } | null;
};

export async function getCart(userId: string): Promise<CartItem[]> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("cart_items")
    .select(
      "id,listing_id,added_at,listings(title,fixed_price,status,listing_images(image_url,sort_order))"
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  throwOnError(error, "تعذر جلب السلة");
  return (data ?? []) as unknown as CartItem[];
}

export async function removeFromCart(userId: string, listingId: string) {
  const client = getSupabaseAdmin();
  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  throwOnError(error, "تعذر حذف المنتج من السلة");
  return { success: true };
}

export async function checkout(userId: string, listingId: string) {
  const client = getSupabaseAdmin();
  const { data: listing, error } = await client
    .from("listings")
    .select("id,seller_id,fixed_price,status,type")
    .eq("id", listingId)
    .maybeSingle();
  throwOnError(error, "تعذر جلب بيانات المنتج");
  if (
    !listing ||
    listing.status !== "active" ||
    listing.type !== "fixed" ||
    listing.fixed_price == null
  )
    throw new Error("هذا المنتج غير متاح للشراء حاليًا");
  if (listing.seller_id === userId) throw new Error("لا يمكنك شراء إعلانك");
  const { data: result, error: checkoutError } = await client.rpc(
    "checkout_listing",
    { p_listing_id: listingId, p_buyer_id: userId }
  );
  throwOnError(checkoutError, "تعذر إتمام الشراء");
  const row = Array.isArray(result) ? result[0] : result;
  const orderId = (row as { order_id?: string } | null)?.order_id ?? null;
  const sellerId = (listing as { seller_id: string }).seller_id;
  const [
    { error: buyerNotificationError },
    { error: sellerNotificationError },
  ] = await Promise.all([
    client.from("notifications").insert({
      user_id: userId,
      listing_id: listingId,
      message: "تم إتمام عملية الشراء وخصم المبلغ من محفظتك بنجاح",
      type: "purchase_completed",
    }),
    client.from("notifications").insert({
      user_id: sellerId,
      listing_id: listingId,
      message: "تم بيع إعلانك وتحويل المبلغ إلى محفظتك",
      type: "sale_completed",
    }),
  ]);
  throwOnError(buyerNotificationError, "تعذر إنشاء إشعار المشتري");
  throwOnError(sellerNotificationError, "تعذر إنشاء إشعار البائع");
  return { orderId };
}

export async function recordListingView(userId: string, listingId: string) {
  const client = getSupabaseAdmin();
  const { error } = await client
    .from("listing_views")
    .insert({ user_id: userId, listing_id: listingId });
  throwOnError(error, "تعذر تسجيل المشاهدة");
  return { success: true };
}

export async function getRecentlyViewed(userId: string, limit = 10) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("listing_views")
    .select("listing_id,viewed_at")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(Math.min(limit, 20));
  throwOnError(error, "تعذر جلب الإعلانات المشاهدة سابقًا");
  const uniqueIds = Array.from(
    new Set(
      ((data ?? []) as { listing_id: string }[]).map(row => row.listing_id)
    )
  );
  if (!uniqueIds.length) return [];
  const { data: listings, error: listingsError } = await client
    .from("listings")
    .select(
      "id,seller_id,winner_id,category_id,title,description,type,starting_price,current_price,fixed_price,auction_end_time,status,source,external_market_name,external_listing_url,created_at,updated_at"
    )
    .in("id", uniqueIds)
    .eq("status", "active");
  throwOnError(listingsError, "تعذر جلب الإعلانات المشاهدة سابقًا");
  const rows = (listings ?? []) as ListingRow[];
  const [images, categories] = await Promise.all([
    fetchImagesByListingIds(rows.map(row => row.id)),
    fetchCategoriesByIds(Array.from(new Set(rows.map(row => row.category_id)))),
  ]);
  const map = new Map(rows.map(row => [row.id, row]));
  return uniqueIds.flatMap(id => {
    const row = map.get(id);
    return row ? [toListingPreview(row, categories, images)] : [];
  });
}

export async function createReview(input: {
  orderId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
}) {
  const client = getSupabaseAdmin();
  const { data: order, error } = await client
    .from("orders")
    .select("id,buyer_id,seller_id,payment_status,delivery_status")
    .eq("id", input.orderId)
    .maybeSingle();
  throwOnError(error, "تعذر التحقق من الطلب");
  if (!order) throw new Error("الطلب غير موجود");
  const revieweeId =
    order.buyer_id === input.reviewerId
      ? order.seller_id
      : order.seller_id === input.reviewerId
        ? order.buyer_id
        : null;
  if (!revieweeId) throw new Error("لا يمكنك تقييم هذا الطلب");
  if (order.delivery_status !== "completed")
    throw new Error("يمكن التقييم بعد اكتمال الطلب");
  const { data, error: insertError } = await client
    .from("reviews")
    .insert({
      order_id: input.orderId,
      reviewer_id: input.reviewerId,
      reviewed_user_id: revieweeId,
      rating: input.rating,
      comment: input.comment?.trim().slice(0, 1000) || null,
    })
    .select(
      "id,order_id,reviewer_id,reviewed_user_id,rating,comment,created_at"
    )
    .single();
  throwOnError(insertError, "تعذر حفظ التقييم");
  const { data: allReviews } = await client
    .from("reviews")
    .select("rating")
    .eq("reviewed_user_id", revieweeId);
  const ratings = (allReviews ?? []) as { rating: number }[];
  const avg = ratings.length
    ? ratings.reduce((sum, row) => sum + Number(row.rating), 0) / ratings.length
    : 0;
  await client
    .from("users")
    .update({
      rating_avg: avg,
      rating_count: ratings.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", revieweeId);
  return data as ReviewRow;
}

export async function getReviewsForUser(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select(
      "id,order_id,reviewer_id,reviewed_user_id,rating,comment,created_at"
    )
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  throwOnError(error, "تعذر جلب التقييمات");
  return (data ?? []) as ReviewRow[];
}

export async function getOffersForSeller(sellerId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("offers")
    .select(
      "id,listing_id,buyer_id,seller_id,amount,message,status,created_at,updated_at"
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(100);
  throwOnError(error, "تعذر جلب العروض الواردة");
  const rows = (data ?? []) as OfferRow[];
  const [listings, buyers] = await Promise.all([
    client
      .from("listings")
      .select("id,title")
      .in("id", Array.from(new Set(rows.map(row => row.listing_id)))),
    client
      .from("users")
      .select("id,name")
      .in("id", Array.from(new Set(rows.map(row => row.buyer_id)))),
  ]);
  throwOnError(listings.error, "تعذر جلب عناوين الإعلانات");
  throwOnError(buyers.error, "تعذر جلب أسماء المشترين");
  const titles = new Map(
    ((listings.data ?? []) as Array<{ id: string; title: string }>).map(row => [
      row.id,
      row.title,
    ])
  );
  const names = new Map(
    ((buyers.data ?? []) as Array<{ id: string; name: string }>).map(row => [
      row.id,
      row.name,
    ])
  );
  return rows.map(row => ({
    ...row,
    listingTitle: titles.get(row.listing_id) ?? "إعلان",
    buyerName: names.get(row.buyer_id) ?? "مستخدم",
  }));
}

export async function getMyOffers(buyerId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("offers")
    .select(
      "id,listing_id,buyer_id,seller_id,amount,message,status,created_at,updated_at"
    )
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(100);
  throwOnError(error, "تعذر جلب عروضي");
  const rows = (data ?? []) as OfferRow[];
  const { data: listings, error: listingsError } = rows.length
    ? await client
        .from("listings")
        .select("id,title")
        .in("id", Array.from(new Set(rows.map(row => row.listing_id))))
    : { data: [], error: null };
  throwOnError(listingsError, "تعذر جلب عناوين الإعلانات");
  const titles = new Map(
    ((listings ?? []) as Array<{ id: string; title: string }>).map(row => [
      row.id,
      row.title,
    ])
  );
  return rows.map(row => ({
    ...row,
    listingTitle: titles.get(row.listing_id) ?? "إعلان",
  }));
}

export async function respondToOffer(input: {
  offerId: string;
  sellerId: string;
  action: "accepted" | "rejected";
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.rpc("respond_to_offer", {
    p_offer_id: input.offerId,
    p_seller_id: input.sellerId,
    p_action: input.action,
  });
  throwOnError(error, "تعذر معالجة العرض والحجز");
  const row = (Array.isArray(data) ? data[0] : data) as {
    order_id: string | null;
    buyer_id: string;
    listing_id: string;
    amount: number;
  } | null;
  return {
    id: input.offerId,
    status: input.action,
    orderId: row?.order_id ?? null,
  } as { id: string; status: OfferStatus; orderId: string | null };
}

export async function saveExternalListing(input: {
  sellerId: string;
  listingId: string;
  marketName: string;
  url: string;
}) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("listings")
    .update({
      source: "external",
      external_market_name: input.marketName.trim().slice(0, 100),
      external_listing_url: input.url.trim().slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.listingId)
    .eq("seller_id", input.sellerId)
    .select("id,source,external_market_name,external_listing_url")
    .single();
  throwOnError(error, "تعذر حفظ رابط السوق الخارجي");
  return data;
}
