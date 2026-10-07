BEGIN;

-- Extend the immutable wallet audit vocabulary for auction escrow events.
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit','withdraw','purchase','sale','hold','release'));

-- Serialize on the listing and bidder rows. The bidder's wallet balance remains
-- unchanged while the amount is escrowed in fund_holds; available balance is
-- wallet_balance minus active holds. Every hold/release is auditable.
CREATE OR REPLACE FUNCTION public.place_bid(
  p_listing_id uuid,
  p_bidder_id uuid,
  p_amount numeric
)
RETURNS TABLE (bid_id uuid, new_current_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing public.listings%ROWTYPE;
  bidder public.users%ROWTYPE;
  previous_hold public.fund_holds%ROWTYPE;
  current_hold public.fund_holds%ROWTYPE;
  next_bid_id uuid := gen_random_uuid();
  available numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000 THEN
    RAISE EXCEPTION 'أدخل مبلغ مزايدة صحيحًا';
  END IF;

  SELECT * INTO target_listing FROM public.listings
    WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الإعلان غير موجود'; END IF;
  IF target_listing.status <> 'active' OR target_listing.type <> 'auction' THEN
    RAISE EXCEPTION 'هذا الإعلان لا يقبل المزايدات';
  END IF;
  IF target_listing.auction_end_time IS NOT NULL AND target_listing.auction_end_time <= now() THEN
    RAISE EXCEPTION 'انتهى وقت المزاد';
  END IF;
  IF target_listing.seller_id = p_bidder_id THEN
    RAISE EXCEPTION 'لا يمكن للبائع المزايدة على إعلانه';
  END IF;
  IF p_amount <= COALESCE(target_listing.current_price, target_listing.starting_price, 0) THEN
    RAISE EXCEPTION 'يجب أن يكون مبلغ المزايدة أعلى من السعر الحالي';
  END IF;

  SELECT * INTO bidder FROM public.users WHERE id = p_bidder_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المستخدم غير موجود'; END IF;
  IF bidder.is_banned THEN RAISE EXCEPTION 'لا يمكن للحساب المحظور المزايدة'; END IF;

  -- Release this bidder's previous escrow, then release the superseded leader.
  SELECT * INTO previous_hold FROM public.fund_holds
    WHERE listing_id = p_listing_id AND user_id = p_bidder_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF previous_hold.id IS NOT NULL THEN
    UPDATE public.fund_holds SET status = 'released' WHERE id = previous_hold.id;
    INSERT INTO public.wallet_transactions(user_id, type, amount, status)
      VALUES (p_bidder_id, 'release', previous_hold.amount, 'completed');
  END IF;

  SELECT * INTO current_hold FROM public.fund_holds
    WHERE listing_id = p_listing_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF current_hold.id IS NOT NULL THEN
    UPDATE public.fund_holds SET status = 'released' WHERE id = current_hold.id;
    INSERT INTO public.wallet_transactions(user_id, type, amount, status)
      VALUES (current_hold.user_id, 'release', current_hold.amount, 'completed');
  END IF;

  SELECT bidder.wallet_balance - COALESCE((
    SELECT SUM(amount) FROM public.fund_holds
    WHERE user_id = p_bidder_id AND status = 'active'
  ), 0) INTO available;
  IF available < p_amount THEN RAISE EXCEPTION 'رصيدك المتاح غير كافٍ'; END IF;

  INSERT INTO public.bids(id, listing_id, bidder_id, amount)
    VALUES (next_bid_id, p_listing_id, p_bidder_id, p_amount);
  INSERT INTO public.fund_holds(user_id, bid_id, listing_id, amount, status)
    VALUES (p_bidder_id, next_bid_id, p_listing_id, p_amount, 'active');
  INSERT INTO public.wallet_transactions(user_id, type, amount, status)
    VALUES (p_bidder_id, 'hold', p_amount, 'completed');
  UPDATE public.listings SET current_price = p_amount, updated_at = now()
    WHERE id = p_listing_id;

  RETURN QUERY SELECT next_bid_id, p_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.place_bid(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid,uuid,numeric) TO service_role;
COMMIT;
