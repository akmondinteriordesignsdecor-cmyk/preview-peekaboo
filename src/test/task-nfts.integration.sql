-- Requires a privileged database test connection (sandbox_exec cannot execute service-only RPCs).
-- Run with psql ON_ERROR_STOP. Every fixture and temporary role rolls back.
BEGIN;
DO $$
DECLARE seller uuid; buyer uuid:=gen_random_uuid(); nft uuid; task uuid; submission uuid; instance uuid; listing uuid; quote json; outcome text; ref text; base_count int;
BEGIN
SELECT id INTO seller FROM public.profiles LIMIT 1;
IF seller IS NULL THEN RAISE EXCEPTION 'A signed-up account is required'; END IF;
INSERT INTO public.user_roles(user_id,role) VALUES(seller,'admin') ON CONFLICT DO NOTHING;
PERFORM set_config('request.jwt.claim.sub',seller::text,true);
INSERT INTO public.nfts(name,active,price_usd) VALUES('Temporary integration collectible',true,5) RETURNING id INTO nft;
PERFORM public.admin_set_task_reward(30);
task:=public.admin_create_nft_task('Integration task','Submit evidence',nft,2);
submission:=public.submit_nft_task(task,'Completed task proof');
IF EXISTS(SELECT 1 FROM public.task_nft_instances WHERE submission_id=submission) THEN RAISE EXCEPTION 'Pending submissions must not award NFTs'; END IF;
PERFORM public.review_nft_task(submission,true,'Approved');
IF (SELECT count(*) FROM public.task_nft_instances WHERE submission_id=submission)<>2 THEN RAISE EXCEPTION 'Approval must award two distinct NFT instances'; END IF;
IF EXISTS(SELECT 1 FROM public.nft_ownerships WHERE nft_id=nft) THEN RAISE EXCEPTION 'Task rewards must not create mining ownership'; END IF;
BEGIN
 PERFORM public.review_nft_task(submission,true,'Again');
 RAISE EXCEPTION 'Duplicate approval succeeded';
EXCEPTION WHEN raise_exception THEN IF SQLERRM='Duplicate approval succeeded' THEN RAISE; END IF;
END;
SELECT id INTO instance FROM public.task_nft_instances WHERE submission_id=submission LIMIT 1;
listing:=public.task_nft_market_action('list',instance,5);
IF EXISTS(SELECT 1 FROM public.ledger_entries WHERE kind='task_nft_sale_reward' AND details->>'listing_id'=listing::text) THEN RAISE EXCEPTION 'Listing alone must not earn rewards'; END IF;
quote:=public.prepare_task_nft_checkout(buyer,listing,1600); ref:=quote->>'reference';
IF (SELECT mining_mvg FROM public.task_nft_orders WHERE reference=ref)<>30 THEN RAISE EXCEPTION '$5 sale must quote 30 MVG at configured rate'; END IF;
outcome:=public.settle_task_nft_verified(ref,(quote->>'kobo')::bigint);
IF outcome<>'ok' THEN RAISE EXCEPTION 'Verified sale did not settle: %',outcome; END IF;
IF (SELECT user_id FROM public.task_nft_instances WHERE id=instance)<>buyer THEN RAISE EXCEPTION 'Buyer must own the sold instance'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.ledger_entries WHERE user_id=seller AND account='referral' AND amount=5 AND status='confirmed' AND reference='TASK-PROCEEDS-'||ref) THEN RAISE EXCEPTION 'Seller must receive $5 proceeds'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.ledger_entries WHERE user_id=seller AND account='mvt' AND amount=30 AND status='pending' AND reference='TASK-REWARD-'||ref) THEN RAISE EXCEPTION 'Mining bonus must be 30 locked MVG'; END IF;
IF public.settle_task_nft_verified(ref,(quote->>'kobo')::bigint)<>'already' THEN RAISE EXCEPTION 'Settlement must be idempotent'; END IF;
IF (SELECT count(*) FROM public.ledger_entries WHERE reference='TASK-REWARD-'||ref)<>1 THEN RAISE EXCEPTION 'Reward duplicated'; END IF;
SELECT id INTO instance FROM public.task_nft_instances WHERE submission_id=submission AND user_id=seller LIMIT 1;
listing:=public.task_nft_market_action('list',instance,5);
quote:=public.prepare_task_nft_checkout(buyer,listing,1600); ref:=quote->>'reference';
UPDATE public.task_nft_orders SET expires_at=now()-interval '1 second' WHERE reference=ref;
IF public.settle_task_nft_verified(ref,(quote->>'kobo')::bigint)<>'needs_review' THEN RAISE EXCEPTION 'Expired paid order must require review'; END IF;
IF (SELECT user_id FROM public.task_nft_instances WHERE id=instance)<>seller THEN RAISE EXCEPTION 'Expired checkout transferred ownership'; END IF;
PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
BEGIN
 PERFORM public.admin_set_task_reward(50);
 RAISE EXCEPTION 'Ordinary member changed reward rate';
EXCEPTION WHEN raise_exception THEN IF SQLERRM='Ordinary member changed reward rate' THEN RAISE; END IF;
END;
PERFORM set_config('request.jwt.claim.sub',seller::text,true);
PERFORM public.admin_set_task_reward(50);
quote:=public.prepare_task_nft_checkout(buyer,listing,1600);
IF (SELECT mining_mvg FROM public.task_nft_orders WHERE reference=quote->>'reference')<>50 THEN RAISE EXCEPTION 'Admin rate update must affect new checkout'; END IF;
END $$;
ROLLBACK;