BEGIN;
CREATE TABLE IF NOT EXISTS public.fund_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), bid_id uuid NOT NULL REFERENCES public.bids(id),
 listing_id uuid NOT NULL REFERENCES public.listings(id), amount numeric(12,2) NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','captured')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bid_id)
);
ALTER TABLE public.fund_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS server_only_fund_holds ON public.fund_holds;
CREATE POLICY server_only_fund_holds ON public.fund_holds FOR ALL USING(false) WITH CHECK(false);
CREATE INDEX IF NOT EXISTS idx_fund_holds_listing ON public.fund_holds(listing_id);
CREATE OR REPLACE FUNCTION public.place_bid(p_listing_id uuid,p_bidder_id uuid,p_amount numeric)
RETURNS TABLE(bid_id uuid,new_current_price numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_listing public.listings%ROWTYPE; next_bid_id uuid:=gen_random_uuid(); minimum_amount numeric; available numeric; previous_hold uuid;
BEGIN
 SELECT * INTO target_listing FROM public.listings WHERE id=p_listing_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الإعلان غير موجود'; END IF;
 IF target_listing.status<>'active' OR target_listing.type<>'auction' THEN RAISE EXCEPTION 'هذا الإعلان لا يقبل المزايدات'; END IF;
 IF target_listing.auction_end_time IS NOT NULL AND target_listing.auction_end_time<=now() THEN RAISE EXCEPTION 'انتهى وقت المزاد'; END IF;
 IF target_listing.seller_id=p_bidder_id THEN RAISE EXCEPTION 'لا يمكن للبائع المزايدة على إعلانه'; END IF;
 minimum_amount:=COALESCE(target_listing.current_price,target_listing.starting_price,0);
 IF p_amount<=minimum_amount THEN RAISE EXCEPTION 'يجب أن يكون مبلغ المزايدة أعلى من السعر الحالي'; END IF;
 SELECT id INTO previous_hold FROM public.fund_holds WHERE listing_id=p_listing_id AND user_id=p_bidder_id AND status='active' ORDER BY created_at DESC LIMIT 1;
 IF previous_hold IS NOT NULL THEN UPDATE public.fund_holds SET status='released' WHERE id=previous_hold; END IF;
 SELECT id INTO previous_hold FROM public.fund_holds WHERE listing_id=p_listing_id AND status='active' ORDER BY created_at DESC LIMIT 1;
 IF previous_hold IS NOT NULL THEN UPDATE public.fund_holds SET status='released' WHERE id=previous_hold; END IF;
 SELECT wallet_balance-COALESCE((SELECT SUM(amount) FROM public.fund_holds WHERE user_id=p_bidder_id AND status='active'),0) INTO available FROM public.users WHERE id=p_bidder_id FOR UPDATE;
 IF available IS NULL OR available<p_amount THEN RAISE EXCEPTION 'رصيدك المتاح غير كافٍ'; END IF;
 INSERT INTO public.bids(id,listing_id,bidder_id,amount) VALUES(next_bid_id,p_listing_id,p_bidder_id,p_amount);
 INSERT INTO public.fund_holds(user_id,bid_id,listing_id,amount,status) VALUES(p_bidder_id,next_bid_id,p_listing_id,p_amount,'active');
 UPDATE public.listings SET current_price=p_amount,updated_at=now() WHERE id=p_listing_id;
 RETURN QUERY SELECT next_bid_id,p_amount;
END; $$;
REVOKE ALL ON FUNCTION public.place_bid(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid,uuid,numeric) TO service_role;
COMMIT;
