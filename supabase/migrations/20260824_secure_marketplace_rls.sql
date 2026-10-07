-- Security baseline for the existing Lqta marketplace schema.
-- This migration is intentionally non-destructive: it creates no tables,
-- alters no application data, and removes no existing indexes or policies.
-- Application mutations are performed only through the server-side tRPC layer
-- using the Supabase service-role key, which never reaches the browser.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_market_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- The marketplace is read through tRPC. The following policies are deliberately
-- the only browser-visible data: active catalogue data and public legal content.
CREATE POLICY public_read_categories
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_active_listings
  ON public.listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY public_read_active_listing_images
  ON public.listing_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings
      WHERE listings.id = listing_images.listing_id
        AND listings.status = 'active'
    )
  );

CREATE POLICY public_read_content_pages
  ON public.content_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_faqs
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (true);

-- FKs highlighted by the database performance advisor.
CREATE INDEX IF NOT EXISTS conversations_created_by_idx
  ON public.conversations (created_by);

CREATE INDEX IF NOT EXISTS orders_address_id_idx
  ON public.orders (address_id);

COMMIT;
