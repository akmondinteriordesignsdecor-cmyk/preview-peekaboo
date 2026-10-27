DO $$
DECLARE fname text; def text;
BEGIN
FOREACH fname IN ARRAY ARRAY['prepare_checkout','prepare_checkout_for_user'] LOOP
SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=fname;
def:=replace(def,'amount:=round((target.price_usd-coalesce(current_plan.price_usd,0))*(1-s.purchase_discount_pct/100),2);','amount:=round(target.price_usd,2);');
def:=replace(def,'SELECT pl.* INTO current_plan FROM public.plan_purchases pp JOIN public.plans pl ON pl.id=pp.plan_id WHERE pp.user_id=uid ORDER BY pl.price_usd DESC,pp.created_at DESC LIMIT 1;','SELECT pl.* INTO current_plan FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE o.user_id=uid AND o.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,o.created_at DESC LIMIT 1;');
EXECUTE def;
END LOOP;
SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='fulfill_payment';
def:=replace(def,'SELECT * INTO pl FROM public.plans WHERE id=p.plan_id;','SELECT * INTO pl FROM public.plans WHERE id=p.plan_id; IF p.amount_usd<>pl.price_usd THEN UPDATE public.payments SET status=''needs_review'',verified_at=now() WHERE id=p.id; RETURN ''needs_review''; END IF;');
EXECUTE def;
END $$;
CREATE TABLE public.mining_nft_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ownership_id uuid NOT NULL REFERENCES public.nft_ownerships(id),
 kind text NOT NULL,
 occurred_at timestamptz,
 actor_id uuid,
 other_user_id uuid,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 source_key text UNIQUE
);
GRANT SELECT ON public.mining_nft_events TO authenticated;
GRANT ALL ON public.mining_nft_events TO service_role;
ALTER TABLE public.mining_nft_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read mining NFT events" ON public.mining_nft_events FOR SELECT TO authenticated USING (actor_id=auth.uid() OR other_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.nft_ownerships o WHERE o.id=ownership_id AND o.user_id=auth.uid()));
CREATE INDEX mining_nft_events_ownership_time ON public.mining_nft_events(ownership_id,occurred_at);
CREATE FUNCTION public.capture_mining_nft_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; o record;
BEGIN
IF TG_TABLE_NAME='nft_ownerships' THEN
 IF NEW.plan_purchase_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
 SELECT pay.amount_usd,pay.upgrade_from,pl.name AS previous_plan INTO p FROM public.payments pay LEFT JOIN public.plans pl ON pl.id=pay.upgrade_from WHERE pay.id=NEW.payment_id;
 INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,details) VALUES(NEW.id,CASE WHEN p.upgrade_from IS NULL THEN 'purchase' ELSE 'upgrade' END,now(),NEW.user_id,jsonb_build_object('amount_usd',p.amount_usd,'previous_plan',p.previous_plan));
 INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id) VALUES(NEW.id,'access_granted',now(),NEW.user_id);
 ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
 INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,other_user_id) VALUES(NEW.id,'transfer',now(),OLD.user_id,NEW.user_id),(NEW.id,'access_transferred',now(),OLD.user_id,NEW.user_id);
 END IF;
ELSE
 SELECT * INTO o FROM public.nft_ownerships WHERE id=NEW.ownership_id;
 IF o.plan_purchase_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
 INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,details) VALUES(NEW.ownership_id,'listed',now(),NEW.seller_id,jsonb_build_object('price_mvg',NEW.price_mvg));
 ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status<>'sold' THEN
 INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,details) VALUES(NEW.ownership_id,'listing_'||NEW.status,now(),NEW.seller_id,jsonb_build_object('price_mvg',NEW.price_mvg));
 ELSIF NEW.status='sold' AND OLD.status<>'sold' THEN
 UPDATE public.mining_nft_events SET details=details||jsonb_build_object('price_mvg',NEW.price_mvg) WHERE ownership_id=NEW.ownership_id AND kind='transfer' AND occurred_at=now() AND other_user_id=NEW.buyer_id;
 END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER audit_mining_ownership AFTER INSERT OR UPDATE ON public.nft_ownerships FOR EACH ROW EXECUTE FUNCTION public.capture_mining_nft_event();
CREATE TRIGGER audit_mining_listing AFTER INSERT OR UPDATE ON public.nft_listings FOR EACH ROW EXECUTE FUNCTION public.capture_mining_nft_event();
INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,details,source_key)
SELECT o.id,CASE WHEN p.upgrade_from IS NULL THEN 'purchase' ELSE 'upgrade' END,pp.created_at,pp.user_id,jsonb_build_object('amount_usd',p.amount_usd,'previous_plan',pl.name),'purchase-'||o.id FROM public.nft_ownerships o JOIN public.plan_purchases pp ON pp.id=o.plan_purchase_id JOIN public.payments p ON p.id=pp.payment_id LEFT JOIN public.plans pl ON pl.id=p.upgrade_from;
INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,source_key)
SELECT o.id,'access_granted',pp.created_at,pp.user_id,'access-'||o.id FROM public.nft_ownerships o JOIN public.plan_purchases pp ON pp.id=o.plan_purchase_id;
INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,details,source_key)
SELECT l.ownership_id,'listed',l.created_at,l.seller_id,jsonb_build_object('price_mvg',l.price_mvg),'listing-'||l.id FROM public.nft_listings l JOIN public.nft_ownerships o ON o.id=l.ownership_id WHERE o.plan_purchase_id IS NOT NULL;
INSERT INTO public.mining_nft_events(ownership_id,kind,occurred_at,actor_id,other_user_id,details,source_key)
SELECT l.ownership_id,CASE WHEN l.status='sold' THEN 'transfer' ELSE 'listing_'||l.status END,NULL,l.seller_id,l.buyer_id,jsonb_build_object('price_mvg',l.price_mvg,'historical',true),'completion-'||l.id FROM public.nft_listings l JOIN public.nft_ownerships o ON o.id=l.ownership_id WHERE o.plan_purchase_id IS NOT NULL AND l.status<>'open';
CREATE FUNCTION public.my_mining_nft_timeline() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT coalesce(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC),'[]'::jsonb) FROM (
 SELECT jsonb_build_object('ownership_id',o.id,'name',n.name,'created_at',o.created_at,'owned',o.user_id=auth.uid(),'access',CASE WHEN o.user_id<>auth.uid() THEN 'Transferred' WHEN o.id=(SELECT own.id FROM public.nft_ownerships own JOIN public.nfts mn ON mn.id=own.nft_id JOIN public.plans pl ON pl.id=mn.mining_plan_id WHERE own.user_id=auth.uid() AND own.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,own.created_at DESC LIMIT 1) THEN 'Current mining tier' ELSE 'Mining access retained' END,'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'occurred_at',e.occurred_at,'details',e.details,'by_you',e.actor_id=auth.uid(),'to_you',e.other_user_id=auth.uid()) ORDER BY e.occurred_at ASC NULLS LAST,e.id),'[]'::jsonb) FROM public.mining_nft_events e WHERE e.ownership_id=o.id)) AS row_data
 FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id WHERE auth.uid() IS NOT NULL AND o.plan_purchase_id IS NOT NULL AND (o.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.mining_nft_events e WHERE e.ownership_id=o.id AND (e.actor_id=auth.uid() OR e.other_user_id=auth.uid())))
) rows;
$$;
REVOKE ALL ON FUNCTION public.my_mining_nft_timeline() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_mining_nft_timeline() TO authenticated;
REVOKE ALL ON FUNCTION public.capture_mining_nft_event() FROM PUBLIC,anon,authenticated;