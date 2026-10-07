BEGIN;
CREATE OR REPLACE FUNCTION public.checkout_listing(p_listing_id uuid,p_buyer_id uuid)
RETURNS TABLE(order_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE listing public.listings%ROWTYPE; buyer_balance numeric; new_order uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO listing FROM public.listings WHERE id=p_listing_id FOR UPDATE;
 IF NOT FOUND OR listing.status<>'active' OR listing.type<>'fixed' OR listing.fixed_price IS NULL THEN RAISE EXCEPTION 'هذا المنتج غير متاح للشراء حاليًا'; END IF;
 IF listing.seller_id=p_buyer_id THEN RAISE EXCEPTION 'لا يمكنك شراء إعلانك'; END IF;
 SELECT wallet_balance INTO buyer_balance FROM public.users WHERE id=p_buyer_id FOR UPDATE;
 IF buyer_balance IS NULL OR buyer_balance<listing.fixed_price THEN RAISE EXCEPTION 'رصيدك غير كافٍ لإتمام الشراء'; END IF;
 UPDATE public.users SET wallet_balance=wallet_balance-listing.fixed_price,updated_at=now() WHERE id=p_buyer_id;
 UPDATE public.users SET wallet_balance=wallet_balance+listing.fixed_price,updated_at=now() WHERE id=listing.seller_id;
 UPDATE public.listings SET status='sold',updated_at=now() WHERE id=listing.id;
 INSERT INTO public.orders(id,listing_id,buyer_id,seller_id,final_price,payment_status,delivery_status) VALUES(new_order,listing.id,p_buyer_id,listing.seller_id,listing.fixed_price,'paid','pending');
 INSERT INTO public.wallet_transactions(user_id,order_id,type,amount,status) VALUES(p_buyer_id,new_order,'purchase',listing.fixed_price,'completed');
 INSERT INTO public.wallet_transactions(user_id,order_id,type,amount,status) VALUES(listing.seller_id,new_order,'sale',listing.fixed_price,'completed');
 DELETE FROM public.cart_items WHERE user_id=p_buyer_id AND listing_id=listing.id;
 RETURN QUERY SELECT new_order;
END; $$;
REVOKE ALL ON FUNCTION public.checkout_listing(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_listing(uuid,uuid) TO service_role;
COMMIT;
