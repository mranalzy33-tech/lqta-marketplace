BEGIN;
-- Defense-in-depth: the TypeScript layer (server/db.ts) already rejects
-- amounts above 1,000,000, but that check lived only in application code.
-- Any future caller of this SECURITY DEFINER function directly (an admin
-- script, a different server entrypoint, etc.) would bypass it. Enforce the
-- same ceiling inside the function itself so the invariant holds regardless
-- of caller.
CREATE OR REPLACE FUNCTION public.deposit_wallet(p_user_id uuid, p_amount numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
 IF p_amount > 1000000 THEN RAISE EXCEPTION 'amount_exceeds_limit'; END IF;
 UPDATE public.users SET wallet_balance=wallet_balance+p_amount,updated_at=now() WHERE id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
 INSERT INTO public.wallet_transactions(user_id,type,amount,status) VALUES(p_user_id,'deposit',p_amount,'completed');
END; $$;
REVOKE ALL ON FUNCTION public.deposit_wallet(uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_wallet(uuid,numeric) TO service_role;
COMMIT;
