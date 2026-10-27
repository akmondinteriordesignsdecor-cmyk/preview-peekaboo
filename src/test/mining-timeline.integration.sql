-- Reversible fixtures: the nested block rolls every write back before returning.
DO $$
DECLARE seller uuid:=gen_random_uuid(); buyer uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); starter uuid; pro uuid; team uuid; q json; p public.payments%ROWTYPE; own uuid; listing uuid;
BEGIN
BEGIN
SELECT id INTO starter FROM public.plans WHERE price_usd=2 AND active;
SELECT id INTO pro FROM public.plans WHERE price_usd=5 AND active;
SELECT id INTO team FROM public.plans WHERE price_usd=10 AND active;
IF starter IS NULL OR pro IS NULL OR team IS NULL THEN RAISE EXCEPTION 'Fixed plan prices missing'; END IF;
q:=public.prepare_checkout_for_user(seller,'plan',starter,NULL,1600);
IF (q->>'usd')::numeric<>2 THEN RAISE EXCEPTION 'Starter must cost $2'; END IF;
SELECT * INTO p FROM public.payments WHERE reference=q->>'reference';
IF public.fulfill_payment(p.reference,p.amount_ngn_kobo)<>'ok' THEN RAISE EXCEPTION 'Starter issuance failed'; END IF;
q:=public.prepare_checkout_for_user(seller,'plan',pro,NULL,1600);
IF (q->>'usd')::numeric<>5 THEN RAISE EXCEPTION 'Starter to Pro must cost $5'; END IF;
SELECT * INTO p FROM public.payments WHERE reference=q->>'reference';
IF public.fulfill_payment(p.reference,p.amount_ngn_kobo)<>'ok' THEN RAISE EXCEPTION 'Pro issuance failed'; END IF;
SELECT id INTO own FROM public.nft_ownerships WHERE user_id=seller AND payment_id=p.id;
PERFORM set_config('request.jwt.claim.sub',seller::text,true);
q:=public.prepare_checkout('plan',team,NULL,1600);
IF (q->>'usd')::numeric<>10 THEN RAISE EXCEPTION 'Pro to Team must cost $10'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.mining_nft_events WHERE ownership_id=own AND kind='upgrade' AND (details->>'amount_usd')::numeric=5) THEN RAISE EXCEPTION 'Upgrade event missing'; END IF;
listing:=public.nft_market_action('list',own,5);
IF NOT EXISTS(SELECT 1 FROM public.mining_nft_events WHERE ownership_id=own AND kind='listed') THEN RAISE EXCEPTION 'Listing event missing'; END IF;
INSERT INTO public.ledger_entries(user_id,account,amount,kind,reference) VALUES(buyer,'mvt',10,'test','TEST-'||gen_random_uuid());
PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
PERFORM public.nft_market_action('buy',listing,NULL);
IF NOT EXISTS(SELECT 1 FROM public.mining_nft_events WHERE ownership_id=own AND kind='transfer' AND actor_id=seller AND other_user_id=buyer AND (details->>'price_mvg')::numeric=5) THEN RAISE EXCEPTION 'Transfer event missing'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.mining_nft_events WHERE ownership_id=own AND kind='access_transferred') THEN RAISE EXCEPTION 'Access transfer missing'; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.my_mining_nft_timeline()) e WHERE e->>'ownership_id'=own::text AND e->>'owned'='true') THEN RAISE EXCEPTION 'Buyer timeline missing'; END IF;
PERFORM set_config('request.jwt.claim.sub',seller::text,true);
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.my_mining_nft_timeline()) e WHERE e->>'ownership_id'=own::text AND e->>'owned'='false') THEN RAISE EXCEPTION 'Seller history lost'; END IF;
PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
IF public.my_mining_nft_timeline()<>'[]'::jsonb THEN RAISE EXCEPTION 'Unrelated user timeline leaked'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Tests passed; roll back fixtures';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
END;
END $$;