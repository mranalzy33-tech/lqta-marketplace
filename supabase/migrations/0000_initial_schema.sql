-- Baseline schema for a fresh Lqta/Supabase environment.
-- This is a non-destructive baseline: every object is CREATE IF NOT EXISTS.
-- It was reconstructed from the application's current Supabase queries/types and
-- existing migrations in this repository. Verify against the live database before
-- using it as an exact production dump.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','super_admin','support_staff')),
  is_seller boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  rating_avg numeric(4,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  preferred_language text NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar','en')),
  supabase_auth_id uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_id_key ON public.users(supabase_auth_id) WHERE supabase_auth_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  icon text
);

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.users(id),
  winner_id uuid REFERENCES public.users(id),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('fixed','auction')),
  starting_price numeric(12,2),
  current_price numeric(12,2),
  fixed_price numeric(12,2),
  auction_end_time timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','sold','rejected','expired')),
  source text NOT NULL DEFAULT 'internal' CHECK (source IN ('internal','external')),
  external_market_name text,
  external_listing_url text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings(status);
CREATE INDEX IF NOT EXISTS listings_auction_end_idx ON public.listings(auction_end_time);

CREATE TABLE IF NOT EXISTS public.listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url text NOT NULL, sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS listing_images_listing_idx ON public.listing_images(listing_id, sort_order);

CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.users(id), amount numeric(12,2) NOT NULL CHECK (amount > 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bids_listing_idx ON public.bids(listing_id, amount DESC);
CREATE INDEX IF NOT EXISTS bids_bidder_idx ON public.bids(bidder_id);

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id), seller_id uuid NOT NULL REFERENCES public.users(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0), message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offers_seller_idx ON public.offers(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_buyer_idx ON public.offers(buyer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text, recipient_name text, phone text, city text, district text, address_line text, is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON public.addresses(user_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id),
  buyer_id uuid NOT NULL REFERENCES public.users(id), seller_id uuid NOT NULL REFERENCES public.users(id),
  address_id uuid REFERENCES public.addresses(id), final_price numeric(12,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending', delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_address_id_idx ON public.orders(address_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL, message text NOT NULL, type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')), created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_created_by_idx ON public.conversations(created_by);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, UNIQUE(conversation_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id), content text NOT NULL, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id), reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','rejected')),
  resolution_note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, permissions text[] NOT NULL,
  granted_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), order_id uuid REFERENCES public.orders(id),
  type text NOT NULL CHECK (type IN ('deposit','withdraw','purchase','sale')), amount numeric(12,2) NOT NULL CHECK(amount > 0),
  status text NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','failed')), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fund_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), bid_id uuid NOT NULL REFERENCES public.bids(id),
  listing_id uuid NOT NULL REFERENCES public.listings(id), amount numeric(12,2) NOT NULL CHECK(amount > 0),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','captured')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bid_id)
);
CREATE INDEX IF NOT EXISTS idx_fund_holds_listing ON public.fund_holds(listing_id);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, added_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,listing_id)
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,listing_id)
);

CREATE TABLE IF NOT EXISTS public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_views_user ON public.listing_views(user_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.users(id), reviewed_user_id uuid NOT NULL REFERENCES public.users(id),
  rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), comment text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,reviewer_id)
);
CREATE INDEX IF NOT EXISTS reviews_reviewed_user_idx ON public.reviews(reviewed_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.external_market_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_name text NOT NULL, base_url text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), subject text NOT NULL,
  status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id), content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.users(id), action text NOT NULL,
  target_type text, target_id uuid, details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL, type text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, title text NOT NULL, content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL, answer text NOT NULL, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY, value jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
