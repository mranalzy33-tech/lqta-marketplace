BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance numeric(12,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), order_id uuid REFERENCES public.orders(id),
 type text NOT NULL CHECK(type IN ('deposit','withdraw','purchase','sale')), amount numeric(12,2) NOT NULL CHECK(amount > 0),
 status text NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','failed')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS server_only_wallet_transactions ON public.wallet_transactions;
CREATE POLICY server_only_wallet_transactions ON public.wallet_transactions FOR ALL USING(false) WITH CHECK(false);
CREATE OR REPLACE FUNCTION public.deposit_wallet(p_user_id uuid,p_amount numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
 UPDATE public.users SET wallet_balance=wallet_balance+p_amount,updated_at=now() WHERE id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
 INSERT INTO public.wallet_transactions(user_id,type,amount,status) VALUES(p_user_id,'deposit',p_amount,'completed');
END; $$;
REVOKE ALL ON FUNCTION public.deposit_wallet(uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_wallet(uuid,numeric) TO service_role;
COMMIT;
