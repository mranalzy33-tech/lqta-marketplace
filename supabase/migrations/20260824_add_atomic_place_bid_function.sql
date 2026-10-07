-- Atomic bid placement for the tRPC server layer. This prevents concurrent
-- requests from accepting the same stale price and is executable only by
-- service_role; browser roles retain no bid-write capability.

BEGIN;

CREATE OR REPLACE FUNCTION public.place_bid(
  p_listing_id uuid,
  p_bidder_id uuid,
  p_amount numeric
)
RETURNS TABLE (bid_id uuid, new_current_price numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_listing public.listings%ROWTYPE;
  next_bid_id uuid := gen_random_uuid();
  minimum_amount numeric;
BEGIN
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

  minimum_amount := COALESCE(target_listing.current_price, target_listing.starting_price, 0);
  IF p_amount <= minimum_amount THEN
    RAISE EXCEPTION 'يجب أن يكون مبلغ المزايدة أعلى من السعر الحالي';
  END IF;

  INSERT INTO public.bids (id, listing_id, bidder_id, amount)
  VALUES (next_bid_id, p_listing_id, p_bidder_id, p_amount);

  UPDATE public.listings
  SET current_price = p_amount,
      updated_at = now()
  WHERE id = p_listing_id;

  RETURN QUERY SELECT next_bid_id, p_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.place_bid(uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_bid(uuid, uuid, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid, numeric) TO service_role;

COMMIT;
