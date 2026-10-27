ALTER TABLE public.nfts ADD COLUMN mining_plan_id uuid REFERENCES public.plans(id);
CREATE UNIQUE INDEX nft_mining_plan_unique ON public.nfts(mining_plan_id) WHERE mining_plan_id IS NOT NULL;
ALTER TABLE public.nft_ownerships ADD COLUMN plan_purchase_id uuid REFERENCES public.plan_purchases(id);
CREATE UNIQUE INDEX ownership_plan_purchase_unique ON public.nft_ownerships(plan_purchase_id) WHERE plan_purchase_id IS NOT NULL;
ALTER TABLE public.mining_sessions ADD COLUMN ownership_id uuid REFERENCES public.nft_ownerships(id);
INSERT INTO public.nfts(name,description,sort,mining_plan_id,price_usd,verified) SELECT replace(name,'Compute','NFT'),'Mining access follows ownership of this NFT.',sort,id,NULL,true FROM public.plans;
INSERT INTO public.nft_ownerships(nft_id,user_id,source,payment_id,plan_purchase_id) SELECT n.id,pp.user_id,'purchase',pp.payment_id,pp.id FROM public.plan_purchases pp JOIN public.nfts n ON n.mining_plan_id=pp.plan_id;
UPDATE public.mining_sessions ms SET ownership_id=o.id FROM public.nft_ownerships o WHERE o.plan_purchase_id=ms.purchase_id;
CREATE POLICY "mining NFT owner reads source purchase" ON public.plan_purchases FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.nft_ownerships o WHERE o.plan_purchase_id=plan_purchases.id AND o.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.mint_mining_nft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE nft uuid;
BEGIN
SELECT id INTO nft FROM public.nfts WHERE mining_plan_id=NEW.plan_id;
IF nft IS NULL THEN RAISE EXCEPTION 'Mining NFT is not configured'; END IF;
INSERT INTO public.nft_ownerships(nft_id,user_id,source,payment_id,plan_purchase_id) VALUES(nft,NEW.user_id,'purchase',NEW.payment_id,NEW.id);
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mint_mining_nft() FROM public,anon,authenticated;
CREATE TRIGGER mint_mining_nft_after_purchase AFTER INSERT ON public.plan_purchases FOR EACH ROW EXECUTE FUNCTION public.mint_mining_nft();
CREATE OR REPLACE FUNCTION public.transfer_mining_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NEW.user_id IS DISTINCT FROM OLD.user_id AND OLD.plan_purchase_id IS NOT NULL THEN
PERFORM pg_advisory_xact_lock(hashtext(least(OLD.user_id,NEW.user_id)::text));
PERFORM pg_advisory_xact_lock(hashtext(greatest(OLD.user_id,NEW.user_id)::text));
UPDATE public.mining_sessions SET status='cancelled' WHERE ownership_id=OLD.id AND user_id=OLD.user_id AND status IN('active','completed');
INSERT INTO public.notifications(user_id,title,body) VALUES(OLD.user_id,'Mining NFT sold','Mining access for the sold NFT has transferred to its buyer.'),(NEW.user_id,'Mining NFT received','Your mining NFT is in your collection and its mining access is ready.');
END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.transfer_mining_access() FROM public,anon,authenticated;
CREATE TRIGGER transfer_mining_access_before_update BEFORE UPDATE OF user_id ON public.nft_ownerships FOR EACH ROW EXECUTE FUNCTION public.transfer_mining_access();
CREATE OR REPLACE FUNCTION public.start_mining() RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); p record; own record; sess record; hrs int; ref uuid; paid numeric;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
UPDATE public.mining_sessions SET status='completed' WHERE user_id=uid AND status='active' AND ends_at<=now();
IF EXISTS(SELECT 1 FROM public.mining_sessions WHERE user_id=uid AND status IN('active','completed')) THEN RAISE EXCEPTION 'Finish and claim your current mining session first'; END IF;
SELECT o.* INTO own FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE o.user_id=uid AND o.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,o.created_at DESC LIMIT 1;
IF own.id IS NULL THEN RAISE EXCEPTION 'Purchase or own a mining NFT first'; END IF;
SELECT session_hours INTO hrs FROM public.settings WHERE id=1;
INSERT INTO public.mining_sessions(user_id,purchase_id,ownership_id,ends_at) VALUES(uid,own.plan_purchase_id,own.id,now()+make_interval(hours=>hrs)) RETURNING * INTO sess;
SELECT referred_by INTO ref FROM public.profiles WHERE id=uid;
FOR p IN SELECT * FROM public.plan_purchases WHERE user_id=uid AND NOT referral_paid FOR UPDATE LOOP
SELECT amount_usd INTO paid FROM public.payments WHERE id=p.payment_id;
IF ref IS NOT NULL AND ref<>uid THEN INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference,details) VALUES(ref,'referral',round(paid*(SELECT referral_commission_pct FROM public.settings WHERE id=1)/100,2),'referral_commission','REF-'||p.id,jsonb_build_object('from_user',uid)) ON CONFLICT(reference) DO NOTHING; END IF;
UPDATE public.plan_purchases SET referral_paid=true WHERE id=p.id;
END LOOP;
RETURN row_to_json(sess);
END $$;
CREATE OR REPLACE FUNCTION public.claim_mining(_session uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); sess record; reward numeric;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
SELECT * INTO sess FROM public.mining_sessions WHERE id=_session AND user_id=uid FOR UPDATE;
IF sess.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
IF sess.status NOT IN('active','completed') THEN RAISE EXCEPTION 'Session is cancelled or already claimed'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.nft_ownerships WHERE id=sess.ownership_id AND user_id=uid) THEN RAISE EXCEPTION 'You no longer own this mining NFT'; END IF;
IF sess.ends_at>now() THEN RAISE EXCEPTION 'Session still running'; END IF;
SELECT pl.mvt_per_session INTO reward FROM public.plan_purchases pp JOIN public.plans pl ON pl.id=pp.plan_id WHERE pp.id=sess.purchase_id;
UPDATE public.mining_sessions SET status='claimed',reward_mvt=reward,claimed_at=now() WHERE id=sess.id;
INSERT INTO public.ledger_entries(user_id,account,amount,kind,status,reference,details) VALUES(uid,'mvt',reward,'mining_reward','pending','MINE-'||sess.id,jsonb_build_object('session',sess.id));
RETURN json_build_object('reward',reward);
END $$;
REVOKE ALL ON FUNCTION public.start_mining(),public.claim_mining(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.start_mining(),public.claim_mining(uuid) TO authenticated;
DO $$ DECLARE body text; old_query text; new_query text; BEGIN
old_query:='SELECT pl.* INTO current_plan FROM public.plan_purchases pp JOIN public.plans pl ON pl.id=pp.plan_id WHERE pp.user_id=uid ORDER BY pl.price_usd DESC,pp.created_at DESC LIMIT 1;';
new_query:='SELECT pl.* INTO current_plan FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE o.user_id=uid AND o.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,o.created_at DESC LIMIT 1;';
SELECT prosrc INTO body FROM pg_proc WHERE oid='public.prepare_checkout_for_user(uuid,text,uuid,numeric,numeric)'::regprocedure;
IF position(old_query in body)=0 THEN RAISE EXCEPTION 'Unexpected checkout definition'; END IF;
body:=replace(body,old_query,new_query);
EXECUTE format('CREATE OR REPLACE FUNCTION public.prepare_checkout_for_user(_user uuid,_kind text,_target uuid,_usd numeric,_rate numeric) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L',body);
SELECT prosrc INTO body FROM pg_proc WHERE oid='public.fulfill_payment(text,bigint)'::regprocedure;
old_query:='SELECT pp.plan_id INTO old_plan FROM public.plan_purchases pp JOIN public.plans x ON x.id=pp.plan_id WHERE pp.user_id=p.user_id ORDER BY x.price_usd DESC,pp.created_at DESC LIMIT 1;';
IF position(old_query in body)=0 THEN RAISE EXCEPTION 'Unexpected fulfillment definition'; END IF;
body:=replace(body,old_query,'SELECT n.mining_plan_id INTO old_plan FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans x ON x.id=n.mining_plan_id WHERE o.user_id=p.user_id AND o.plan_purchase_id IS NOT NULL ORDER BY x.price_usd DESC,o.created_at DESC LIMIT 1;');
EXECUTE format('CREATE OR REPLACE FUNCTION public.fulfill_payment(_reference text,_paid_kobo bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L',body);
SELECT prosrc INTO body FROM pg_proc WHERE oid='public.spin_roulette()'::regprocedure;
body:=replace(body,'where active and price_usd is null','where active and price_usd is null and mining_plan_id is null');
body:=replace(body,'WHERE active AND price_usd IS NULL','WHERE active AND price_usd IS NULL AND mining_plan_id IS NULL');
EXECUTE format('CREATE OR REPLACE FUNCTION public.spin_roulette() RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L',body);
END $$;
REVOKE ALL ON FUNCTION public.prepare_checkout_for_user(uuid,text,uuid,numeric,numeric),public.fulfill_payment(text,bigint) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_checkout_for_user(uuid,text,uuid,numeric,numeric),public.fulfill_payment(text,bigint) TO service_role;
COMMENT ON COLUMN public.nft_ownerships.plan_purchase_id IS 'Original paid issuance; ownership, not the original purchaser, determines mining access.';