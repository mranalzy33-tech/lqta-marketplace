BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check CHECK (status IN ('pending','active','negotiating','sold','rejected','expired'));

ALTER TABLE public.fund_holds ALTER COLUMN bid_id DROP NOT NULL;
ALTER TABLE public.fund_holds ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS fund_holds_offer_uidx ON public.fund_holds(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fund_holds_user_status_idx ON public.fund_holds(user_id, status);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_deleted_idx ON public.messages(deleted_at);

CREATE OR REPLACE FUNCTION public.create_offer_with_hold(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS TABLE(offer_id uuid, seller_id uuid, listing_title text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_listing public.listings%ROWTYPE; v_balance numeric; v_offer uuid := gen_random_uuid();
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'مبلغ العرض غير صالح'; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id=p_listing_id FOR UPDATE;
  IF NOT FOUND OR v_listing.status <> 'active' OR v_listing.type <> 'fixed' THEN RAISE EXCEPTION 'الإعلان غير متاح لتقديم عرض'; END IF;
  IF v_listing.seller_id = p_buyer_id THEN RAISE EXCEPTION 'لا يمكنك تقديم عرض على إعلانك'; END IF;
  SELECT wallet_balance INTO v_balance FROM public.users WHERE id=p_buyer_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN RAISE EXCEPTION 'رصيدك غير كافٍ لحجز قيمة العرض'; END IF;
  UPDATE public.users SET wallet_balance=wallet_balance-p_amount, updated_at=now() WHERE id=p_buyer_id;
  INSERT INTO public.offers(id,listing_id,buyer_id,seller_id,amount,message,status,updated_at)
    VALUES(v_offer,p_listing_id,p_buyer_id,v_listing.seller_id,p_amount,NULLIF(left(trim(coalesce(p_message,'')),500),''),'pending',now());
  INSERT INTO public.fund_holds(id,user_id,offer_id,listing_id,amount,status) VALUES(gen_random_uuid(),p_buyer_id,v_offer,p_listing_id,p_amount,'active');
  UPDATE public.listings SET status='negotiating', updated_at=now() WHERE id=p_listing_id;
  INSERT INTO public.notifications(user_id,listing_id,message,type) VALUES
    (p_buyer_id,p_listing_id,'تم حجز مبلغ العرض وتجميد الإعلان مؤقتاً','offer_hold'),
    (v_listing.seller_id,p_listing_id,'لديك عرض شراء جديد على إعلانك','offer_received');
  RETURN QUERY SELECT v_offer, v_listing.seller_id, v_listing.title;
END; $$;

CREATE OR REPLACE FUNCTION public.respond_to_offer(
  p_offer_id uuid,
  p_seller_id uuid,
  p_action text
)
RETURNS TABLE(order_id uuid, buyer_id uuid, listing_id uuid, amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_offer public.offers%ROWTYPE; v_listing public.listings%ROWTYPE; v_order uuid := gen_random_uuid();
BEGIN
  IF p_action NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'الإجراء غير صالح'; END IF;
  SELECT * INTO v_offer FROM public.offers WHERE id=p_offer_id AND seller_id=p_seller_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العرض غير متاح أو تمت معالجته'; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id=v_offer.listing_id FOR UPDATE;
  IF NOT FOUND OR v_listing.status <> 'negotiating' THEN RAISE EXCEPTION 'الإعلان غير متاح للتفاوض'; END IF;
  IF p_action='accepted' THEN
    UPDATE public.offers SET status='accepted',updated_at=now() WHERE id=v_offer.id;
    UPDATE public.fund_holds SET status='captured' WHERE offer_id=v_offer.id AND status='active';
    UPDATE public.users SET wallet_balance=wallet_balance+v_offer.amount,updated_at=now() WHERE id=p_seller_id;
    UPDATE public.listings SET status='sold',winner_id=v_offer.buyer_id,updated_at=now() WHERE id=v_listing.id;
    INSERT INTO public.orders(id,listing_id,buyer_id,seller_id,final_price,payment_status,delivery_status) VALUES(v_order,v_listing.id,v_offer.buyer_id,p_seller_id,v_offer.amount,'paid','pending');
    INSERT INTO public.wallet_transactions(user_id,order_id,type,amount,status) VALUES(v_offer.buyer_id,v_order,'purchase',v_offer.amount,'completed'),(p_seller_id,v_order,'sale',v_offer.amount,'completed');
    INSERT INTO public.notifications(user_id,listing_id,message,type) VALUES(v_offer.buyer_id,v_listing.id,'تم قبول عرضك وإتمام عملية الشراء بنجاح','offer_accepted'),(p_seller_id,v_listing.id,'تم قبول العرض وتحويل المبلغ إلى محفظتك','sale_completed');
    RETURN QUERY SELECT v_order,v_offer.buyer_id,v_listing.id,v_offer.amount;
  ELSE
    UPDATE public.offers SET status='rejected',updated_at=now() WHERE id=v_offer.id;
    UPDATE public.fund_holds SET status='released' WHERE offer_id=v_offer.id AND status='active';
    UPDATE public.users SET wallet_balance=wallet_balance+v_offer.amount,updated_at=now() WHERE id=v_offer.buyer_id;
    UPDATE public.listings SET status='active',updated_at=now() WHERE id=v_listing.id;
    INSERT INTO public.notifications(user_id,listing_id,message,type) VALUES(v_offer.buyer_id,v_listing.id,'تم رفض العرض وإعادة المبلغ المحجوز إلى محفظتك','offer_rejected'),(p_seller_id,v_listing.id,'تم رفض العرض وإعادة الإعلان للبيع','offer_rejected');
    RETURN QUERY SELECT NULL::uuid,v_offer.buyer_id,v_listing.id,v_offer.amount;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.create_offer_with_hold(uuid,uuid,numeric,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.respond_to_offer(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_offer_with_hold(uuid,uuid,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid,uuid,text) TO service_role;

COMMIT;
