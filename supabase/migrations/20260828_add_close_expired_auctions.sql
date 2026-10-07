BEGIN;
CREATE OR REPLACE FUNCTION public.close_expired_auctions() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE auction record; winning_bid record; winning_hold record;
BEGIN
 FOR auction IN SELECT id,seller_id FROM public.listings WHERE type='auction' AND status='active' AND auction_end_time IS NOT NULL AND auction_end_time<=now() FOR UPDATE LOOP
  SELECT id,bidder_id,amount INTO winning_bid FROM public.bids WHERE listing_id=auction.id ORDER BY amount DESC,created_at ASC LIMIT 1;
  IF winning_bid.id IS NOT NULL THEN
   UPDATE public.listings SET status='sold',winner_id=winning_bid.bidder_id,updated_at=now() WHERE id=auction.id;
   SELECT id INTO winning_hold FROM public.fund_holds WHERE bid_id=winning_bid.id AND status='active' LIMIT 1;
   IF winning_hold.id IS NOT NULL THEN UPDATE public.fund_holds SET status='captured' WHERE id=winning_hold.id; END IF;
   UPDATE public.fund_holds SET status='released' WHERE listing_id=auction.id AND status='active' AND bid_id<>winning_bid.id;
   UPDATE public.users SET wallet_balance=wallet_balance-winning_bid.amount,updated_at=now() WHERE id=winning_bid.bidder_id;
   INSERT INTO public.orders(listing_id,buyer_id,seller_id,final_price,payment_status,delivery_status) VALUES(auction.id,winning_bid.bidder_id,auction.seller_id,winning_bid.amount,'paid','pending');
   INSERT INTO public.wallet_transactions(user_id,type,amount,status) VALUES(winning_bid.bidder_id,'purchase',winning_bid.amount,'completed');
  ELSE UPDATE public.listings SET status='expired',updated_at=now() WHERE id=auction.id;
  END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.close_expired_auctions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO service_role;
COMMIT;
