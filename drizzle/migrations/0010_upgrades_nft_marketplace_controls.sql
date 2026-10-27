ALTER TABLE public.settings ADD COLUMN purchase_discount_pct numeric NOT NULL DEFAULT 0 CHECK (purchase_discount_pct >= 0 AND purchase_discount_pct < 100);
ALTER TABLE public.profiles ADD COLUMN marketplace_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfts ADD COLUMN quantity integer CHECK (quantity >= 0), ADD COLUMN discount_pct numeric NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct < 100), ADD COLUMN verified boolean NOT NULL DEFAULT true, ADD COLUMN history_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN upgrade_from uuid REFERENCES public.plans(id), ADD COLUMN quote_expires_at timestamptz;
ALTER TABLE public.p2p_listings ADD COLUMN source_account text NOT NULL DEFAULT 'tradable_mvt' CHECK (source_account IN ('tradable_mvt','presale_mvt'));
CREATE TABLE public.nft_listings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ownership_id uuid NOT NULL REFERENCES public.nft_ownerships(id), nft_id uuid NOT NULL REFERENCES public.nfts(id), seller_id uuid NOT NULL, buyer_id uuid, price_mvg numeric NOT NULL CHECK (price_mvg > 0), status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','sold','cancelled','removed')), history_hidden boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.nft_listings TO authenticated;
GRANT ALL ON public.nft_listings TO service_role;
ALTER TABLE public.nft_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market listings and own history" ON public.nft_listings FOR SELECT TO authenticated USING ((status='open' AND EXISTS (SELECT 1 FROM public.nfts n WHERE n.id=nft_id AND n.active) AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=seller_id AND p.marketplace_blocked)) OR seller_id=auth.uid() OR buyer_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX nft_one_open_listing ON public.nft_listings(ownership_id) WHERE status='open';
CREATE POLICY "owners read delisted NFT" ON public.nfts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.nft_ownerships o WHERE o.nft_id=nfts.id AND o.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.prepare_checkout(_kind text, _target uuid, _usd numeric, _rate numeric) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s record; target record; current_plan record; amount numeric; coins numeric; ref text; used integer;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
SELECT * INTO s FROM public.settings WHERE id=1;
IF _rate IS NULL OR _rate<=0 THEN RAISE EXCEPTION 'Invalid exchange rate'; END IF;
IF _kind='plan' THEN
SELECT * INTO target FROM public.plans WHERE id=_target AND active;
IF target.id IS NULL THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
SELECT pl.* INTO current_plan FROM public.plan_purchases pp JOIN public.plans pl ON pl.id=pp.plan_id WHERE pp.user_id=uid ORDER BY pl.price_usd DESC,pp.created_at DESC LIMIT 1;
IF current_plan.id IS NOT NULL AND target.price_usd<=current_plan.price_usd THEN RAISE EXCEPTION 'Only upward upgrades are available'; END IF;
IF EXISTS (SELECT 1 FROM public.payments WHERE user_id=uid AND kind='plan' AND status='pending' AND quote_expires_at>now()) THEN RAISE EXCEPTION 'Finish your pending plan checkout first'; END IF;
amount:=round((target.price_usd-coalesce(current_plan.price_usd,0))*(1-s.purchase_discount_pct/100),2);
ELSIF _kind='nft' THEN
IF EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
SELECT * INTO target FROM public.nfts WHERE id=_target AND active FOR UPDATE;
IF target.id IS NULL OR target.price_usd IS NULL THEN RAISE EXCEPTION 'NFT unavailable'; END IF;
IF EXISTS (SELECT 1 FROM public.nft_ownerships WHERE user_id=uid AND nft_id=_target) THEN RAISE EXCEPTION 'You already own this NFT'; END IF;
SELECT (SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='success')+(SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='pending' AND quote_expires_at>now()) INTO used;
IF target.quantity IS NOT NULL AND used>=target.quantity THEN RAISE EXCEPTION 'NFT sold out'; END IF;
amount:=round(target.price_usd*(1-target.discount_pct/100)*(1-s.purchase_discount_pct/100),2);
ELSIF _kind='presale' THEN
IF _usd IS NULL OR _usd<1 OR _usd>10000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
coins:=round(_usd,2)*s.mvt_per_usd; amount:=round(_usd*(1-s.purchase_discount_pct/100),2);
ELSE RAISE EXCEPTION 'Invalid purchase'; END IF;
IF amount<=0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
ref:='MV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
INSERT INTO public.payments(user_id,kind,plan_id,nft_id,amount_usd,amount_ngn_kobo,mvt_amount,reference,upgrade_from,quote_expires_at) VALUES(uid,_kind,CASE WHEN _kind='plan' THEN _target END,CASE WHEN _kind='nft' THEN _target END,amount,round(amount*_rate*100),coins,ref,CASE WHEN _kind='plan' THEN current_plan.id END,now()+interval '30 minutes');
RETURN json_build_object('reference',ref,'kobo',round(amount*_rate*100),'usd',amount);
END $$;
REVOKE ALL ON FUNCTION public.prepare_checkout(text,uuid,numeric,numeric) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.prepare_checkout(text,uuid,numeric,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.fulfill_payment(_reference text,_paid_kobo bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; pl record; n record; old_plan uuid; sold integer;
BEGIN
SELECT * INTO p FROM public.payments WHERE reference=_reference FOR UPDATE;
IF p.id IS NULL THEN RETURN 'not_found'; END IF;
IF p.status='success' THEN RETURN 'already'; END IF;
IF p.status='needs_review' THEN RETURN 'needs_review'; END IF;
IF _paid_kobo<>p.amount_ngn_kobo THEN UPDATE public.payments SET status='failed' WHERE id=p.id; RETURN 'amount_mismatch'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(p.user_id::text));
IF p.kind='plan' THEN
SELECT * INTO pl FROM public.plans WHERE id=p.plan_id;
SELECT pp.plan_id INTO old_plan FROM public.plan_purchases pp JOIN public.plans x ON x.id=pp.plan_id WHERE pp.user_id=p.user_id ORDER BY x.price_usd DESC,pp.created_at DESC LIMIT 1;
IF (p.quote_expires_at IS NOT NULL AND (old_plan IS DISTINCT FROM p.upgrade_from OR p.quote_expires_at<now())) OR EXISTS(SELECT 1 FROM public.plans WHERE id=old_plan AND price_usd>=pl.price_usd) THEN UPDATE public.payments SET status='needs_review',verified_at=now() WHERE id=p.id; RETURN 'needs_review'; END IF;
INSERT INTO public.plan_purchases(user_id,plan_id,payment_id) VALUES(p.user_id,p.plan_id,p.id);
INSERT INTO public.notifications(user_id,title,body) VALUES(p.user_id,'Plan activated',pl.name||' is your current plan.');
ELSIF p.kind='nft' THEN
SELECT * INTO n FROM public.nfts WHERE id=p.nft_id FOR UPDATE;
SELECT count(*) INTO sold FROM public.payments WHERE nft_id=p.nft_id AND status='success';
IF NOT n.active OR (n.quantity IS NOT NULL AND sold>=n.quantity) OR EXISTS(SELECT 1 FROM public.nft_ownerships WHERE nft_id=p.nft_id AND user_id=p.user_id) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p.user_id AND marketplace_blocked) THEN UPDATE public.payments SET status='needs_review',verified_at=now() WHERE id=p.id; RETURN 'needs_review'; END IF;
INSERT INTO public.nft_ownerships(nft_id,user_id,source,payment_id) VALUES(p.nft_id,p.user_id,'purchase',p.id);
ELSE
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference,details) VALUES(p.user_id,'presale_mvt',p.mvt_amount,'coin_purchase','BUY-'||p.reference,jsonb_build_object('usd',p.amount_usd));
INSERT INTO public.notifications(user_id,title,body) VALUES(p.user_id,'Coin purchase confirmed',p.mvt_amount||' MVG added to your purchased balance.');
END IF;
UPDATE public.payments SET status='success',verified_at=now() WHERE id=p.id;
RETURN 'ok'; END $$;
REVOKE ALL ON FUNCTION public.fulfill_payment(text,bigint) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(text,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.start_mining() RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); p record; sess record; hrs int; ref uuid; paid numeric;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
UPDATE public.mining_sessions SET status='completed' WHERE user_id=uid AND status='active' AND ends_at<=now();
IF EXISTS(SELECT 1 FROM public.mining_sessions WHERE user_id=uid AND status='active') THEN RAISE EXCEPTION 'A mining session is already running'; END IF;
SELECT pp.* INTO p FROM public.plan_purchases pp JOIN public.plans pl ON pl.id=pp.plan_id WHERE pp.user_id=uid ORDER BY pl.price_usd DESC,pp.created_at DESC LIMIT 1;
IF p.id IS NULL THEN RAISE EXCEPTION 'Activate a computing plan first'; END IF;
SELECT session_hours INTO hrs FROM public.settings WHERE id=1;
INSERT INTO public.mining_sessions(user_id,purchase_id,ends_at) VALUES(uid,p.id,now()+make_interval(hours=>hrs)) RETURNING * INTO sess;
SELECT referred_by INTO ref FROM public.profiles WHERE id=uid;
FOR p IN SELECT * FROM public.plan_purchases WHERE user_id=uid AND NOT referral_paid FOR UPDATE LOOP
SELECT amount_usd INTO paid FROM public.payments WHERE id=p.payment_id;
IF ref IS NOT NULL AND ref<>uid THEN INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference,details) VALUES(ref,'referral',round(paid*(SELECT referral_commission_pct FROM public.settings WHERE id=1)/100,2),'referral_commission','REF-'||p.id,jsonb_build_object('from_user',uid)) ON CONFLICT(reference) DO NOTHING; END IF;
UPDATE public.plan_purchases SET referral_paid=true WHERE id=p.id;
END LOOP;
RETURN row_to_json(sess); END $$;
CREATE OR REPLACE FUNCTION public.nft_market_action(_action text,_id uuid,_price numeric DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); o record; l record; result uuid; available numeric; needed numeric; a text; take numeric;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('market'||uid::text));
IF EXISTS(SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
IF _action='list' THEN
SELECT * INTO o FROM public.nft_ownerships WHERE id=_id AND user_id=uid FOR UPDATE;
IF o.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.nfts WHERE id=o.nft_id AND active) THEN RAISE EXCEPTION 'NFT unavailable'; END IF;
IF _price IS NULL OR _price<=0 THEN RAISE EXCEPTION 'Enter a positive MVG price'; END IF;
INSERT INTO public.nft_listings(ownership_id,nft_id,seller_id,price_mvg) VALUES(o.id,o.nft_id,uid,_price) RETURNING id INTO result; RETURN result;
END IF;
SELECT * INTO l FROM public.nft_listings WHERE id=_id FOR UPDATE;
IF l.id IS NULL OR l.status<>'open' THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
IF _action='cancel' AND l.seller_id=uid THEN UPDATE public.nft_listings SET status='cancelled' WHERE id=l.id; RETURN l.id; END IF;
IF _action<>'buy' OR l.seller_id=uid THEN RAISE EXCEPTION 'Invalid action'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('market'||l.seller_id::text));
SELECT * INTO o FROM public.nft_ownerships WHERE id=l.ownership_id FOR UPDATE;
IF o.user_id<>l.seller_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id=l.seller_id AND marketplace_blocked) OR NOT EXISTS(SELECT 1 FROM public.nfts WHERE id=l.nft_id AND active) THEN RAISE EXCEPTION 'Listing delisted'; END IF;
IF EXISTS(SELECT 1 FROM public.nft_ownerships WHERE nft_id=l.nft_id AND user_id=uid) THEN RAISE EXCEPTION 'You already own this NFT'; END IF;
SELECT coalesce(sum(amount),0) INTO available FROM public.ledger_entries WHERE user_id=uid AND account IN ('mvt','presale_mvt','tradable_mvt') AND status='confirmed';
IF available<l.price_mvg THEN RAISE EXCEPTION 'Not enough available MVG'; END IF;
needed:=l.price_mvg;
FOREACH a IN ARRAY ARRAY['mvt','tradable_mvt','presale_mvt'] LOOP
SELECT coalesce(sum(amount),0) INTO available FROM public.ledger_entries WHERE user_id=uid AND account=a AND status='confirmed'; take:=least(greatest(available,0),needed);
IF take>0 THEN INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(uid,a,-take,'nft_resale','NFT-'||l.id||'-'||a); needed:=needed-take; END IF;
END LOOP;
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(l.seller_id,'mvt',l.price_mvg,'nft_resale','NFT-'||l.id||'-seller');
UPDATE public.nft_ownerships SET user_id=uid WHERE id=o.id;
UPDATE public.nft_listings SET status='sold',buyer_id=uid WHERE id=l.id;
RETURN l.id;
END $$;
REVOKE ALL ON FUNCTION public.nft_market_action(text,uuid,numeric) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.nft_market_action(text,uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.moderate_market(_kind text,_id uuid,_blocked boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
IF _kind='account' THEN
IF public.has_role(_id,'admin') THEN RAISE EXCEPTION 'Cannot suspend an administrator'; END IF;
UPDATE public.profiles SET marketplace_blocked=_blocked WHERE id=_id;
IF _blocked THEN UPDATE public.nft_listings SET status='removed' WHERE seller_id=_id AND status='open'; END IF;
ELSIF _kind='nft' THEN UPDATE public.nfts SET active=false WHERE id=_id; UPDATE public.nft_listings SET status='removed' WHERE nft_id=_id AND status='open';
ELSIF _kind='nft_history' THEN UPDATE public.nfts SET active=false,history_hidden=true WHERE id=_id; UPDATE public.nft_listings SET status='removed',history_hidden=true WHERE nft_id=_id;
ELSIF _kind='listing' THEN UPDATE public.nft_listings SET status='removed',history_hidden=true WHERE id=_id;
ELSE RAISE EXCEPTION 'Invalid moderation action'; END IF;
INSERT INTO public.admin_audit_log(actor_id,action,target_user_id) VALUES(auth.uid(),'market_'||_kind,CASE WHEN _kind='account' THEN _id END);
END $$;
REVOKE ALL ON FUNCTION public.moderate_market(text,uuid,boolean) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.moderate_market(text,uuid,boolean) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.p2p_listings FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.p2p_orders FROM authenticated;
CREATE OR REPLACE FUNCTION public.list_purchased_coins(_amount numeric,_price numeric) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); bal numeric; result uuid;
BEGIN
IF uid IS NULL OR _amount IS NULL OR _price IS NULL OR _amount<=0 OR _price<=0 THEN RAISE EXCEPTION 'Enter positive amount and price'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('market'||uid::text));
IF EXISTS(SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
SELECT coalesce(sum(amount),0) INTO bal FROM public.ledger_entries WHERE user_id=uid AND account='presale_mvt' AND status='confirmed';
IF bal<_amount THEN RAISE EXCEPTION 'Not enough purchased MVG'; END IF;
INSERT INTO public.p2p_listings(user_id,side,mvt_amount,price_usd,source_account) VALUES(uid,'sell',_amount,_price,'presale_mvt') RETURNING id INTO result;
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(uid,'presale_mvt',-_amount,'p2p_escrow','P2P-'||result||'-debit'),(uid,'p2p_escrow',_amount,'p2p_escrow','P2P-'||result||'-escrow');
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.list_purchased_coins(numeric,numeric) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.list_purchased_coins(numeric,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancel_p2p_listing(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l record;
BEGIN
SELECT * INTO l FROM public.p2p_listings WHERE id=_id FOR UPDATE;
IF auth.uid() IS NULL OR l.user_id<>auth.uid() OR l.status<>'open' THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
UPDATE public.p2p_listings SET status='cancelled' WHERE id=l.id;
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(l.user_id,'p2p_escrow',-l.mvt_amount,'p2p_cancel','CANCEL-'||l.id||'-escrow'),(l.user_id,l.source_account,l.mvt_amount,'p2p_cancel','CANCEL-'||l.id||'-refund');
END $$;
CREATE OR REPLACE FUNCTION public.fill_p2p_order(_listing uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l record; bal numeric; uid uuid:=auth.uid();
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('market'||uid::text));
SELECT * INTO l FROM public.p2p_listings WHERE id=_listing FOR UPDATE;
IF l.id IS NULL OR l.status<>'open' OR l.side<>'sell' OR l.user_id=uid THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
IF EXISTS(SELECT 1 FROM public.profiles WHERE id IN(uid,l.user_id) AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('wd'||uid::text));
SELECT coalesce(sum(amount),0) INTO bal FROM public.ledger_entries WHERE user_id=uid AND account='referral' AND status IN('confirmed','reserved');
IF bal<l.price_usd THEN RAISE EXCEPTION 'Not enough withdrawable USD balance'; END IF;
UPDATE public.p2p_listings SET status='filled' WHERE id=l.id;
INSERT INTO public.p2p_orders(listing_id,buyer_id,mvt_amount,price_usd) VALUES(l.id,uid,l.mvt_amount,l.price_usd);
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(uid,'referral',-l.price_usd,'p2p_fill','FILL-'||l.id||'-pay'),(l.user_id,'referral',l.price_usd,'p2p_fill','FILL-'||l.id||'-receive'),(l.user_id,'p2p_escrow',-l.mvt_amount,'p2p_fill','FILL-'||l.id||'-escrow'),(uid,l.source_account,l.mvt_amount,'p2p_fill','FILL-'||l.id||'-coins');
RETURN json_build_object('bought',l.mvt_amount); END $$;