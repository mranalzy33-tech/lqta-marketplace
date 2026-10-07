export type MarketplaceRole = "user" | "super_admin" | "support_staff";
export type ListingType = "fixed" | "auction";
export type ListingStatus =
  "pending" | "active" | "negotiating" | "sold" | "rejected" | "expired";
export type ListingSource = "internal" | "external";

export type MarketplaceUserRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: MarketplaceRole;
  is_seller: boolean;
  is_banned: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  supabase_auth_id?: string | null;
  preferred_language?: "ar" | "en" | null;
  city?: string | null;
  street_address?: string | null;
  phone?: string | null;
};

export type CategoryRow = {
  id: string;
  name: string;
  name_en?: string | null;
  slug: string;
  icon: string | null;
  imageUrl?: string | null;
};

export type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
  name_en?: string | null;
  slug: string;
};

export type AdminPermissionRow = {
  user_id: string;
  permissions: string[];
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingRow = {
  id: string;
  seller_id: string;
  winner_id: string | null;
  category_id: string;
  subcategory_id: string | null;
  title: string;
  description: string;
  type: ListingType;
  starting_price: number | null;
  current_price: number | null;
  fixed_price: number | null;
  minimum_bid_increment: number;
  auction_end_time: string | null;
  status: ListingStatus;
  is_featured: boolean;
  source: ListingSource;
  external_market_name: string | null;
  external_listing_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingImageRow = {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  listing_id: string | null;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationStatus = "open" | "closed";
export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

export type ConversationRow = {
  id: string;
  listing_id: string | null;
  status: ConversationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationParticipantRow = {
  id: string;
  conversation_id: string;
  user_id: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  final_price: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
};

export type DisputeRow = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletTransactionType =
  "deposit" | "withdraw" | "purchase" | "sale";
export type WalletTransactionStatus = "pending" | "completed" | "failed";
export type WalletTransactionRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  created_at: string;
};
export type FundHoldStatus = "active" | "released" | "captured";
export type FundHoldRow = {
  id: string;
  user_id: string;
  bid_id: string | null;
  offer_id?: string | null;
  listing_id: string;
  amount: number;
  status: FundHoldStatus;
  created_at: string;
};
export type OfferStatus = "pending" | "accepted" | "rejected";
export type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};
export type ReviewRow = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type SponsoredCampaignRow = {
  id: string;
  company_name: string;
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
