BEGIN;

-- Incremental schema change: existing auctions receive a safe default of 10 YER.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS minimum_bid_increment numeric(12,2) NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_minimum_bid_increment_check'
      AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_minimum_bid_increment_check
      CHECK (minimum_bid_increment > 0);
  END IF;
END;
$$;

-- A seller may convert only their own active, internal, fixed-price listing
-- that has not entered a bid/order flow. The update and cart cleanup are atomic.
CREATE OR REPLACE FUNCTION public.convert_listing_to_auction(
  p_listing_id uuid,
  p_seller_id uuid,
  p_starting_price numeric,
  p_minimum_bid_increment numeric,
  p_auction_end_time timestamptz
)
RETURNS TABLE (
  listing_id uuid,
  starting_price numeric,
  minimum_bid_increment numeric,
  auction_end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing public.listings%ROWTYPE;
BEGIN
  IF p_starting_price IS NULL OR p_starting_price <= 0 OR p_starting_price > 1000000000 THEN
    RAISE EXCEPTION 'سعر بداية المزاد غير صالح';
  END IF;
  IF p_minimum_bid_increment IS NULL OR p_minimum_bid_increment <= 0 OR p_minimum_bid_increment > 1000000000 THEN
    RAISE EXCEPTION 'الحد الأدنى لزيادة المزايدة غير صالح';
  END IF;
  IF p_auction_end_time IS NULL OR p_auction_end_time <= now() THEN
    RAISE EXCEPTION 'يجب أن يكون موعد انتهاء المزاد في المستقبل';
  END IF;

  SELECT * INTO target_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الإعلان غير موجود';
  END IF;
  IF target_listing.seller_id <> p_seller_id THEN
    RAISE EXCEPTION 'لا تملك صلاحية تعديل هذا الإعلان';
  END IF;
  IF target_listing.status <> 'active' OR target_listing.type <> 'fixed' THEN
    RAISE EXCEPTION 'لا يمكن تحويل هذا الإعلان في حالته الحالية';
  END IF;
  IF target_listing.source <> 'internal' THEN
    RAISE EXCEPTION 'لا يمكن تحويل إعلان سوق خارجي إلى مزاد داخل المنصة';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE orders.listing_id = p_listing_id) THEN
    RAISE EXCEPTION 'لا يمكن تحويل إعلان له طلب شراء سابق';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bids WHERE bids.listing_id = p_listing_id) THEN
    RAISE EXCEPTION 'لا يمكن تحويل إعلان لديه مزايدات سابقة';
  END IF;
  IF EXISTS (SELECT 1 FROM public.offers WHERE offers.listing_id = p_listing_id AND offers.status = 'pending') THEN
    RAISE EXCEPTION 'عالج عروض الشراء المعلقة قبل تحويل الإعلان';
  END IF;

  UPDATE public.listings
  SET type = 'auction',
      starting_price = p_starting_price,
      current_price = p_starting_price,
      fixed_price = NULL,
      minimum_bid_increment = p_minimum_bid_increment,
      auction_end_time = p_auction_end_time,
      winner_id = NULL,
      updated_at = now()
  WHERE id = p_listing_id;

  -- The fixed-price listing is no longer purchasable at its old price.
  DELETE FROM public.cart_items AS ci WHERE ci.listing_id = p_listing_id;

  RETURN QUERY
  SELECT p_listing_id, p_starting_price, p_minimum_bid_increment, p_auction_end_time;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_listing_to_auction(uuid, uuid, numeric, numeric, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_listing_to_auction(uuid, uuid, numeric, numeric, timestamptz) TO service_role;

-- Enforce a minimum bid increment inside the same locked database transaction
-- that releases old holds and reserves the new bid. First bid is current price + increment.
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
  minimum_bid numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000 THEN
    RAISE EXCEPTION 'أدخل مبلغ مزايدة صحيحًا';
  END IF;

  SELECT * INTO target_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الإعلان غير موجود';
  END IF;
  IF target_listing.status <> 'active' OR target_listing.type <> 'auction' THEN
    RAISE EXCEPTION 'هذا الإعلان لا يقبل المزايدات';
  END IF;
  IF target_listing.auction_end_time IS NOT NULL AND target_listing.auction_end_time <= now() THEN
    RAISE EXCEPTION 'انتهى وقت المزاد';
  END IF;
  IF target_listing.seller_id = p_bidder_id THEN
    RAISE EXCEPTION 'لا يمكن للبائع المزايدة على إعلانه';
  END IF;

  minimum_bid := GREATEST(
    COALESCE(target_listing.current_price, target_listing.starting_price, 0),
    COALESCE(target_listing.starting_price, 0)
  ) + COALESCE(target_listing.minimum_bid_increment, 10);
  IF p_amount < minimum_bid THEN
    RAISE EXCEPTION 'أقل مزايدة مسموحة لهذا الإعلان هي %', minimum_bid;
  END IF;

  SELECT * INTO bidder
  FROM public.users
  WHERE id = p_bidder_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;
  IF bidder.is_banned THEN
    RAISE EXCEPTION 'لا يمكن للحساب المحظور المزايدة';
  END IF;

  -- Release the bidder's old hold on this auction before calculating availability.
  SELECT * INTO previous_hold
  FROM public.fund_holds
  WHERE listing_id = p_listing_id
    AND user_id = p_bidder_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF previous_hold.id IS NOT NULL THEN
    UPDATE public.fund_holds SET status = 'released' WHERE id = previous_hold.id;
    INSERT INTO public.wallet_transactions(user_id, type, amount, status)
      VALUES (p_bidder_id, 'release', previous_hold.amount, 'completed');
  END IF;

  -- Release the current leader's hold. Listing lock serializes concurrent bids.
  SELECT * INTO current_hold
  FROM public.fund_holds
  WHERE listing_id = p_listing_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF current_hold.id IS NOT NULL THEN
    UPDATE public.fund_holds SET status = 'released' WHERE id = current_hold.id;
    INSERT INTO public.wallet_transactions(user_id, type, amount, status)
      VALUES (current_hold.user_id, 'release', current_hold.amount, 'completed');
  END IF;

  SELECT bidder.wallet_balance - COALESCE((
    SELECT SUM(amount)
    FROM public.fund_holds
    WHERE user_id = p_bidder_id AND status = 'active'
  ), 0)
  INTO available;

  IF available IS NULL OR available < p_amount THEN
    RAISE EXCEPTION 'رصيدك المتاح غير كافٍ للمزايدة؛ اشحن المحفظة أولاً';
  END IF;

  INSERT INTO public.bids(id, listing_id, bidder_id, amount)
    VALUES (next_bid_id, p_listing_id, p_bidder_id, p_amount);
  INSERT INTO public.fund_holds(user_id, bid_id, listing_id, amount, status)
    VALUES (p_bidder_id, next_bid_id, p_listing_id, p_amount, 'active');
  INSERT INTO public.wallet_transactions(user_id, type, amount, status)
    VALUES (p_bidder_id, 'hold', p_amount, 'completed');
  UPDATE public.listings
    SET current_price = p_amount, updated_at = now()
    WHERE id = p_listing_id;

  RETURN QUERY SELECT next_bid_id, p_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.place_bid(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid, numeric) TO service_role;

COMMIT;
