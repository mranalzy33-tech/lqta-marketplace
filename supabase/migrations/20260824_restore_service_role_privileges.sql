-- Restore the standard server-side database access needed by the tRPC layer.
-- RLS stays enabled on every table; no privileges are granted to anon or
-- authenticated roles. The service_role key remains server-only.

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.addresses,
  public.verification_tokens,
  public.categories,
  public.listings,
  public.listing_images,
  public.external_market_connections,
  public.bids,
  public.fund_holds,
  public.offers,
  public.orders,
  public.wallet_transactions,
  public.conversations,
  public.conversation_participants,
  public.messages,
  public.notifications,
  public.reviews,
  public.disputes,
  public.support_tickets,
  public.support_ticket_messages,
  public.admin_logs,
  public.cart_items,
  public.favorites,
  public.listing_views,
  public.content_pages,
  public.faqs,
  public.settings
TO service_role;

COMMIT;
