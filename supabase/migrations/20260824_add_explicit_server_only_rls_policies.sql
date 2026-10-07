-- Explicit browser-role denial policies. RLS was already enabled, but these
-- policies document and enforce the server-only access contract for protected
-- tables. Existing public catalogue SELECT policies remain effective because
-- permissive policies are evaluated with OR semantics.

BEGIN;

CREATE POLICY block_direct_access_addresses ON public.addresses FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_admin_logs ON public.admin_logs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_bids ON public.bids FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_cart_items ON public.cart_items FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_conversation_participants ON public.conversation_participants FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_conversations ON public.conversations FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_disputes ON public.disputes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_external_market_connections ON public.external_market_connections FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_favorites ON public.favorites FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_fund_holds ON public.fund_holds FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_listing_views ON public.listing_views FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_messages ON public.messages FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_notifications ON public.notifications FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_offers ON public.offers FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_orders ON public.orders FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_reviews ON public.reviews FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_settings ON public.settings FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_support_ticket_messages ON public.support_ticket_messages FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_support_tickets ON public.support_tickets FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_users ON public.users FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_verification_tokens ON public.verification_tokens FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY block_direct_access_wallet_transactions ON public.wallet_transactions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMIT;
