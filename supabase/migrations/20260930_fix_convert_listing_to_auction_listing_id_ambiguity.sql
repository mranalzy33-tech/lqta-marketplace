BEGIN;

-- The RETURNS TABLE output column `listing_id` is a PL/pgSQL variable. Qualify
-- the cart_items column to prevent it colliding with that output variable.
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

COMMIT;
