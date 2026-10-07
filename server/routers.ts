import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ADMIN_PERMISSION_CATALOG,
  ADMIN_PERMISSION_VALUES,
} from "../shared/adminPermissions";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  adminPermissionProcedure,
  adminProcedure,
  anyAdminProcedure,
  getAuthenticatedUser,
  protectedProcedure,
  publicProcedure,
  router,
  sellerProcedure,
  supportProcedure,
} from "./_core/trpc";
import * as marketplace from "./db";

/** تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية قبل التحقق. */
const normalizeDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .trim();

/**
 * يقبل السعر كرقم أو كنص رقمي، ثم يحوله دائماً إلى number.
 * هذا يمنع فشل التحقق عند إرسال القيمة من input رقمي أو عند استخدام أرقام عربية.
 */
const moneyInput = z.preprocess(value => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const normalized = normalizeDigits(value).replace(/[,،\s]/g, "");
    return normalized === "" ? undefined : Number(normalized);
  }
  return value;
}, z.number().finite("يجب أن يكون السعر رقماً منتهياً").positive("يجب أن يكون السعر أكبر من صفر").max(1_000_000_000, "السعر يتجاوز الحد المسموح").optional());
const httpUrlInput = z
  .string()
  .url()
  .max(2_000)
  .refine(
    value => /^https?:\/\//i.test(value),
    "يجب أن يبدأ الرابط بـ https:// أو http://"
  );
const sponsoredCampaignFields = z.object({
  companyName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(1_000),
  imageUrl: httpUrlInput,
  targetUrl: httpUrlInput,
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(false),
});
const sponsoredCampaignInput = sponsoredCampaignFields.refine(
  value =>
    !value.startsAt ||
    !value.endsAt ||
    Date.parse(value.endsAt) > Date.parse(value.startsAt),
  {
    message: "يجب أن يكون انتهاء الحملة بعد بدايتها",
    path: ["endsAt"],
  }
);
const sponsoredCampaignUpdateInput = sponsoredCampaignFields
  .extend({ id: z.string().uuid() })
  .refine(
    value =>
      !value.startsAt ||
      !value.endsAt ||
      Date.parse(value.endsAt) > Date.parse(value.startsAt),
    {
      message: "يجب أن يكون انتهاء الحملة بعد بدايتها",
      path: ["endsAt"],
    }
  );
const createListingInput = z
  .object({
    categoryId: z.string().uuid("معرّف التصنيف غير صحيح"),
    subcategoryId: z.string().uuid("معرّف الفئة الفرعية غير صحيح").optional(),
    title: z
      .string()
      .trim()
      .min(3, "عنوان الإعلان مطلوب ولا يقل عن 3 أحرف")
      .max(160),
    description: z
      .string()
      .trim()
      .min(10, "الوصف يجب ألا يقل عن 10 أحرف")
      .max(5_000),
    type: z.enum(["fixed", "auction"]),
    fixedPrice: moneyInput,
    startingPrice: moneyInput,
    minimumBidIncrement: moneyInput,
    auctionEndTime: z
      .string()
      .datetime("تاريخ انتهاء المزاد غير صحيح")
      .optional(),
    source: z.enum(["internal", "external"]).optional(),
    externalMarketName: z.string().trim().max(100).optional(),
    externalListingUrl: z
      .string()
      .url("رابط الإعلان الخارجي غير صحيح")
      .max(1000)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "fixed" && value.fixedPrice === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedPrice"],
        message: "يرجى إدخال سعر البيع",
      });
    }

    if (value.type === "auction" && value.startingPrice === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startingPrice"],
        message: "يرجى إدخال سعر بداية المزاد",
      });
    }

    if (value.type === "auction" && !value.auctionEndTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["auctionEndTime"],
        message: "موعد انتهاء المزاد مطلوب",
      });
    }

    if (value.type === "fixed" && value.startingPrice !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startingPrice"],
        message: "لا ترسل سعر بداية المزاد مع الإعلان الثابت",
      });
    }

    if (value.type === "fixed" && value.minimumBidIncrement !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumBidIncrement"],
        message: "لا ترسل حد زيادة للمزايدة مع البيع المباشر",
      });
    }

    if (value.type === "auction" && value.fixedPrice !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedPrice"],
        message: "لا ترسل سعر البيع مع إعلان المزاد",
      });
    }
  });

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  marketplace: router({
    home: publicProcedure
      .input(
        z
          .object({ listingLimit: z.number().int().min(3).max(12).default(6) })
          .optional()
      )
      .query(({ input }) => marketplace.getHomeData(input?.listingLimit ?? 6)),
    categories: publicProcedure
      .input(
        z
          .object({ limit: z.number().int().min(1).max(50).default(12) })
          .optional()
      )
      .query(({ input }) =>
        marketplace.getPublicCategories(input?.limit ?? 12)
      ),
    sponsoredAds: publicProcedure.query(() =>
      marketplace.getPublicSponsoredCampaigns()
    ),
    browse: publicProcedure
      .input(
        z.object({
          query: z.string().max(120).optional(),
          categorySlug: z.string().max(80).optional(),
          subcategorySlug: z.string().max(80).optional(),
          type: z.enum(["fixed", "auction"]).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(3).max(24).default(12),
        })
      )
      .query(({ input }) => marketplace.browseListings(input)),
    details: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const viewerId = ctx.user
          ? getAuthenticatedUser(ctx.user).id
          : undefined;
        const details = await marketplace.getListingDetails(input.id, viewerId);
        if (details && ctx.user) {
          void marketplace
            .recordListingView(ctx.user.id, input.id)
            .catch(() => undefined);
        }
        return details;
      }),
    placeBid: protectedProcedure
      .input(
        z.object({
          listingId: z.string().uuid(),
          amount: z.number().positive().max(1_000_000_000),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.placeBid(
          getAuthenticatedUser(ctx.user).id,
          input.listingId,
          input.amount
        )
      ),
    createOffer: protectedProcedure
      .input(
        z.object({
          listingId: z.string().uuid(),
          amount: z.number().positive().max(1_000_000_000),
          message: z.string().max(500).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.createOffer({
          buyerId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    sellerOffers: sellerProcedure.query(({ ctx }) =>
      marketplace.getOffersForSeller(getAuthenticatedUser(ctx.user).id)
    ),
    myOffers: protectedProcedure.query(({ ctx }) =>
      marketplace.getMyOffers(getAuthenticatedUser(ctx.user).id)
    ),
    respondToOffer: sellerProcedure
      .input(
        z.object({
          offerId: z.string().uuid(),
          action: z.enum(["accepted", "rejected"]),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.respondToOffer({
          sellerId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
  }),

  wallet: router({
    balance: protectedProcedure.query(({ ctx }) =>
      marketplace.getWalletBalance(getAuthenticatedUser(ctx.user).id)
    ),
    deposit: protectedProcedure
      .input(z.object({ amount: z.number().positive().max(1_000_000) }))
      .mutation(({ ctx, input }) =>
        marketplace.depositWallet(
          getAuthenticatedUser(ctx.user).id,
          input.amount
        )
      ),
  }),

  cart: router({
    list: protectedProcedure.query(({ ctx }) =>
      marketplace.getCart(getAuthenticatedUser(ctx.user).id)
    ),
    add: protectedProcedure
      .input(z.object({ listingId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.addToCart(
          getAuthenticatedUser(ctx.user).id,
          input.listingId
        )
      ),
    checkout: protectedProcedure
      .input(z.object({ listingId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.checkout(getAuthenticatedUser(ctx.user).id, input.listingId)
      ),
  }),

  reviews: router({
    create: protectedProcedure
      .input(
        z.object({
          orderId: z.string().uuid(),
          rating: z.number().int().min(1).max(5),
          comment: z.string().max(1000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.createReview({
          reviewerId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    forUser: publicProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .query(({ input }) => marketplace.getReviewsForUser(input.userId)),
  }),

  recentlyViewed: protectedProcedure.query(({ ctx }) =>
    marketplace.getRecentlyViewed(getAuthenticatedUser(ctx.user).id)
  ),

  account: router({
    settings: protectedProcedure.query(({ ctx }) => ({
      preferredLanguage: getAuthenticatedUser(ctx.user).preferredLanguage,
    })),
    setPreferredLanguage: protectedProcedure
      .input(z.object({ language: z.enum(["ar", "en"]) }))
      .mutation(({ ctx, input }) =>
        marketplace.setUserPreferredLanguage({
          userId: getAuthenticatedUser(ctx.user).id,
          language: input.language,
        })
      ),
    favorites: protectedProcedure.query(({ ctx }) =>
      marketplace.getFavorites(getAuthenticatedUser(ctx.user).id)
    ),
    toggleFavorite: protectedProcedure
      .input(z.object({ listingId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.toggleFavorite(
          getAuthenticatedUser(ctx.user).id,
          input.listingId
        )
      ),
    notifications: protectedProcedure.query(({ ctx }) =>
      marketplace.getNotifications(getAuthenticatedUser(ctx.user).id)
    ),
    markNotificationRead: protectedProcedure
      .input(z.object({ notificationId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.markNotificationRead(
          getAuthenticatedUser(ctx.user).id,
          input.notificationId
        )
      ),
    becomeSeller: protectedProcedure.mutation(({ ctx }) =>
      marketplace.becomeSeller(getAuthenticatedUser(ctx.user).id)
    ),
  }),

  conversations: router({
    list: protectedProcedure.query(({ ctx }) =>
      marketplace.getConversations(getAuthenticatedUser(ctx.user).id)
    ),
    messages: protectedProcedure
      .input(z.object({ conversationId: z.string().uuid() }))
      .query(({ ctx, input }) =>
        marketplace.getConversationMessages(
          getAuthenticatedUser(ctx.user).id,
          input.conversationId
        )
      ),
    start: protectedProcedure
      .input(
        z.object({
          recipientId: z.string().uuid(),
          listingId: z.string().uuid().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.startConversation({
          userId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.string().uuid(),
          content: z.string().trim().min(1).max(2_000),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.sendMessage({
          userId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    delete: protectedProcedure
      .input(z.object({ messageId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.deleteMessage({
          userId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
  }),

  disputes: router({
    orders: protectedProcedure.query(({ ctx }) =>
      marketplace.getOrdersForDisputes(getAuthenticatedUser(ctx.user).id)
    ),
    mine: protectedProcedure.query(({ ctx }) =>
      marketplace.getMyDisputes(getAuthenticatedUser(ctx.user).id)
    ),
    create: protectedProcedure
      .input(
        z.object({
          orderId: z.string().uuid(),
          reason: z.string().trim().min(10).max(2_000),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.createDispute({
          userId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    queue: supportProcedure.query(() => marketplace.getDisputeQueue()),
    update: supportProcedure
      .input(
        z.object({
          disputeId: z.string().uuid(),
          status: z.enum(["under_review", "resolved", "rejected"]),
          resolutionNote: z.string().trim().max(2_000).optional(),
        })
      )
      .mutation(({ input }) => marketplace.updateDispute(input)),
  }),

  seller: router({
    overview: sellerProcedure.query(({ ctx }) =>
      marketplace.getSellerOverview(getAuthenticatedUser(ctx.user).id)
    ),
    workspace: sellerProcedure.query(({ ctx }) =>
      marketplace.getSellerWorkspace(getAuthenticatedUser(ctx.user).id)
    ),
    createListing: sellerProcedure
      .input(createListingInput)
      .mutation(({ ctx, input }) => {
        const sellerId = getAuthenticatedUser(ctx.user).id;
        console.info("CREATE LISTING REQUEST", {
          sellerId,
          categoryId: input.categoryId,
          type: input.type,
          fixedPrice: input.fixedPrice,
          startingPrice: input.startingPrice,
        });
        return marketplace.createListing({ sellerId, ...input });
      }),
    convertToAuction: sellerProcedure
      .input(
        z
          .object({
            listingId: z.string().uuid(),
            startingPrice: z.number().finite().positive().max(1_000_000_000),
            minimumBidIncrement: z
              .number()
              .finite()
              .positive()
              .max(1_000_000_000),
            auctionEndTime: z.string().datetime(),
          })
          .refine(value => Date.parse(value.auctionEndTime) > Date.now(), {
            message: "يجب أن يكون موعد انتهاء المزاد في المستقبل",
            path: ["auctionEndTime"],
          })
      )
      .mutation(({ ctx, input }) =>
        marketplace.convertListingToAuction({
          sellerId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    uploadImage: sellerProcedure
      .input(
        z.object({
          listingId: z.string().uuid(),
          dataUrl: z.string().max(7_500_000),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.uploadListingImage({
          sellerId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
  }),

  admin: router({
    access: anyAdminProcedure.query(({ ctx }) => {
      const user = getAuthenticatedUser(ctx.user);
      return {
        isSuperAdmin: user.role === "super_admin",
        permissions:
          user.role === "super_admin"
            ? [...ADMIN_PERMISSION_VALUES]
            : user.adminPermissions,
      };
    }),
    permissionCatalog: adminProcedure.query(() => ADMIN_PERMISSION_CATALOG),
    overview: adminPermissionProcedure("admin.dashboard.view").query(() =>
      marketplace.getAdminOverview()
    ),
    pendingListings: adminPermissionProcedure("admin.listings.manage").query(
      () => marketplace.getPendingListings()
    ),
    reviewListing: adminPermissionProcedure("admin.listings.manage")
      .input(
        z.object({
          listingId: z.string().uuid(),
          status: z.enum(["active", "rejected"]),
          reason: z.string().max(500).optional(),
        })
      )
      .mutation(({ input }) => marketplace.reviewListing(input)),
    users: adminPermissionProcedure("admin.users.read")
      .input(
        z.object({
          query: z.string().max(120).optional(),
          group: z
            .enum(["regular", "administrators", "supervisors"])
            .default("regular"),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(20),
        })
      )
      .query(({ ctx, input }) =>
        marketplace.getAdminUsers({
          ...input,
          includePermissions:
            getAuthenticatedUser(ctx.user).role === "super_admin",
        })
      ),
    setUserBan: adminPermissionProcedure("admin.users.manage")
      .input(z.object({ userId: z.string().uuid(), isBanned: z.boolean() }))
      .mutation(({ ctx, input }) =>
        marketplace.setUserBanStatus({
          actorId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    listings: adminPermissionProcedure("admin.listings.read")
      .input(
        z.object({
          type: z.enum(["fixed", "auction"]).optional(),
          status: z
            .enum([
              "pending",
              "active",
              "negotiating",
              "sold",
              "rejected",
              "expired",
            ])
            .optional(),
          query: z.string().max(120).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(20),
        })
      )
      .query(({ input }) => marketplace.getAdminListings(input)),
    auctions: adminPermissionProcedure("admin.auctions.read")
      .input(
        z.object({
          status: z
            .enum([
              "pending",
              "active",
              "negotiating",
              "sold",
              "rejected",
              "expired",
            ])
            .optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(20),
        })
      )
      .query(({ input }) => marketplace.getAdminAuctions(input)),
    updateListingStatus: adminPermissionProcedure("admin.listings.manage")
      .input(
        z
          .object({
            listingId: z.string().uuid(),
            status: z.enum(["pending", "active", "rejected", "expired"]),
            reason: z.string().trim().max(500).optional(),
          })
          .refine(
            value => value.status !== "rejected" || Boolean(value.reason),
            { message: "سبب الرفض إلزامي" }
          )
      )
      .mutation(({ input }) => marketplace.updateAdminListingStatus(input)),
    setListingFeatured: adminPermissionProcedure("admin.listings.manage")
      .input(
        z.object({ listingId: z.string().uuid(), isFeatured: z.boolean() })
      )
      .mutation(({ input }) => marketplace.setAdminListingFeatured(input)),
    deleteListing: adminPermissionProcedure("admin.listings.manage")
      .input(z.object({ listingId: z.string().uuid() }))
      .mutation(({ input }) => marketplace.deleteAdminListing(input.listingId)),
    updateAuctionStatus: adminPermissionProcedure("admin.auctions.manage")
      .input(
        z
          .object({
            listingId: z.string().uuid(),
            status: z.enum(["pending", "active", "rejected", "expired"]),
            reason: z.string().trim().max(500).optional(),
          })
          .refine(
            value => value.status !== "rejected" || Boolean(value.reason),
            { message: "سبب الرفض إلزامي" }
          )
      )
      .mutation(({ input }) => marketplace.updateAdminListingStatus(input)),
    staff: adminProcedure
      .input(
        z.object({
          query: z.string().max(120).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(50),
        })
      )
      .query(({ input }) => marketplace.getAdminStaff(input)),
    assignStaffPermissions: adminProcedure
      .input(
        z.object({
          userId: z.string().uuid(),
          permissions: z
            .array(z.enum(ADMIN_PERMISSION_VALUES))
            .min(1)
            .max(ADMIN_PERMISSION_VALUES.length),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.setDelegatedAdminPermissions({
          actorId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    removeStaffPermissions: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        marketplace.removeDelegatedAdminPermissions({
          actorId: getAuthenticatedUser(ctx.user).id,
          ...input,
        })
      ),
    conversations: adminPermissionProcedure("admin.dashboard.view").query(() =>
      marketplace.getAdminConversationMessages()
    ),
    categories: adminPermissionProcedure("admin.categories.read").query(() =>
      marketplace.getAdminCategories()
    ),
    sponsoredAds: adminPermissionProcedure("admin.ads.read").query(async () => {
      try {
        return await marketplace.getAdminSponsoredCampaigns();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === marketplace.SPONSORED_CAMPAIGN_MIGRATION_REQUIRED
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Campaign storage is not installed. Apply supabase/migrations/20260925_add_sponsored_campaigns.sql to this Supabase project.",
          });
        }
        throw error;
      }
    }),
    uploadSponsoredAdImage: adminPermissionProcedure("admin.ads.manage")
      .input(z.object({ dataUrl: z.string().max(7_500_000) }))
      .mutation(({ input }) => marketplace.uploadSponsoredCampaignImage(input)),
    createSponsoredAd: adminPermissionProcedure("admin.ads.manage")
      .input(sponsoredCampaignInput)
      .mutation(({ ctx, input }) =>
        marketplace.createSponsoredCampaign({
          ...input,
          createdBy: getAuthenticatedUser(ctx.user).id,
        })
      ),
    updateSponsoredAd: adminPermissionProcedure("admin.ads.manage")
      .input(sponsoredCampaignUpdateInput)
      .mutation(({ input }) => marketplace.updateSponsoredCampaign(input)),
    uploadCategoryImage: adminPermissionProcedure("admin.categories.manage")
      .input(z.object({ dataUrl: z.string().max(7_500_000) }))
      .mutation(({ input }) => marketplace.uploadCategoryImage(input)),
    createCategory: adminPermissionProcedure("admin.categories.manage")
      .input(
        z.object({
          name: z.string().trim().min(2).max(80),
          nameEn: z.string().trim().min(2).max(80).optional(),
          slug: z
            .string()
            .trim()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .max(80),
          icon: z.string().trim().max(40).optional(),
          imageUrl: z.string().url().max(2_000).nullable().optional(),
        })
      )
      .mutation(({ input }) => marketplace.createAdminCategory(input)),
    updateCategory: adminPermissionProcedure("admin.categories.manage")
      .input(
        z.object({
          categoryId: z.string().uuid(),
          name: z.string().trim().min(2).max(80),
          nameEn: z.string().trim().min(2).max(80).optional(),
          slug: z
            .string()
            .trim()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .max(80),
          icon: z.string().trim().max(40).optional(),
          imageUrl: z.string().url().max(2_000).nullable().optional(),
        })
      )
      .mutation(({ input }) => marketplace.updateAdminCategory(input)),
    createSubcategory: adminPermissionProcedure("admin.categories.manage")
      .input(
        z.object({
          categoryId: z.string().uuid(),
          name: z.string().trim().min(2).max(80),
          nameEn: z.string().trim().min(2).max(80).optional(),
          slug: z
            .string()
            .trim()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .max(80),
        })
      )
      .mutation(({ input }) => marketplace.createAdminSubcategory(input)),
    updateSubcategory: adminPermissionProcedure("admin.categories.manage")
      .input(
        z.object({
          subcategoryId: z.string().uuid(),
          name: z.string().trim().min(2).max(80),
          nameEn: z.string().trim().min(2).max(80).optional(),
          slug: z
            .string()
            .trim()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .max(80),
        })
      )
      .mutation(({ input }) => marketplace.updateAdminSubcategory(input)),
    deleteCategory: adminPermissionProcedure("admin.categories.manage")
      .input(z.object({ categoryId: z.string().uuid() }))
      .mutation(({ input }) =>
        marketplace.deleteAdminCategory(input.categoryId)
      ),
    deleteSubcategory: adminPermissionProcedure("admin.categories.manage")
      .input(z.object({ subcategoryId: z.string().uuid() }))
      .mutation(({ input }) =>
        marketplace.deleteAdminSubcategory(input.subcategoryId)
      ),
  }),

  support: router({
    queue: supportProcedure.query(() => marketplace.getSupportQueue()),
    updateTicket: supportProcedure
      .input(
        z.object({
          ticketId: z.string().uuid(),
          status: z.enum(["in_progress", "resolved", "closed"]),
        })
      )
      .mutation(({ ctx, input }) =>
        marketplace.updateSupportTicket({
          ...input,
          supportUserId: getAuthenticatedUser(ctx.user).id,
        })
      ),
  }),
});

export type AppRouter = typeof appRouter;
