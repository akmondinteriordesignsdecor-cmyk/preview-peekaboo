
-- 1. Immutable registration region on profiles
ALTER TABLE public.profiles ADD COLUMN country text;

CREATE OR REPLACE FUNCTION public.lock_profile_country()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  IF old.country IS NOT NULL AND new.country IS DISTINCT FROM old.country THEN
    RAISE EXCEPTION 'Registration region cannot be changed';
  END IF;
  RETURN new;
END
$func$;

CREATE TRIGGER lock_profile_country
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.lock_profile_country();

-- 2. Crypto withdrawal access requests (for accounts registered in Africa)
CREATE TABLE public.crypto_access_requests (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.crypto_access_requests TO authenticated;
GRANT ALL ON public.crypto_access_requests TO service_role;
ALTER TABLE public.crypto_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own crypto request" ON public.crypto_access_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own crypto request" ON public.crypto_access_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read crypto requests" ON public.crypto_access_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.review_crypto_request(_user uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.crypto_access_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, reviewed_at = now()
  WHERE user_id = _user AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending request'; END IF;
  INSERT INTO public.notifications(user_id, title, body) VALUES (
    _user,
    CASE WHEN _approve THEN 'Crypto withdrawals approved' ELSE 'Crypto withdrawal request declined' END,
    CASE WHEN _approve THEN 'You can now withdraw your referral earnings in crypto.' ELSE 'Your request for crypto withdrawals was declined. Bank withdrawal remains available.' END
  );
END
$func$;
GRANT EXECUTE ON FUNCTION public.review_crypto_request(uuid, boolean) TO authenticated;

-- 3. Fixed NFT drop prices: no discounts applied to NFT checkouts
CREATE OR REPLACE FUNCTION public.prepare_checkout(_kind text, _target uuid, _usd numeric, _rate numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE uid uuid:=auth.uid(); s record; target record; current_plan record; amount numeric; coins numeric; ref text; used integer;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
SELECT * INTO s FROM public.settings WHERE id=1;
IF _rate IS NULL OR _rate<=0 THEN RAISE EXCEPTION 'Invalid exchange rate'; END IF;
IF _kind='plan' THEN
SELECT * INTO target FROM public.plans WHERE id=_target AND active;
IF target.id IS NULL THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
SELECT pl.* INTO current_plan FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE o.user_id=uid AND o.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,o.created_at DESC LIMIT 1;
IF current_plan.id IS NOT NULL AND target.price_usd<=current_plan.price_usd THEN RAISE EXCEPTION 'Only upward upgrades are available'; END IF;
IF EXISTS (SELECT 1 FROM public.payments WHERE user_id=uid AND kind='plan' AND status='pending' AND quote_expires_at>now()) THEN RAISE EXCEPTION 'Finish your pending plan checkout first'; END IF;
amount:=round(target.price_usd,2);
ELSIF _kind='nft' THEN
IF EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
SELECT * INTO target FROM public.nfts WHERE id=_target AND active FOR UPDATE;
IF target.id IS NULL OR target.price_usd IS NULL THEN RAISE EXCEPTION 'NFT unavailable'; END IF;
IF EXISTS (SELECT 1 FROM public.nft_ownerships WHERE user_id=uid AND nft_id=_target) THEN RAISE EXCEPTION 'You already own this NFT'; END IF;
SELECT (SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='success')+(SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='pending' AND quote_expires_at>now()) INTO used;
IF target.quantity IS NOT NULL AND used>=target.quantity THEN RAISE EXCEPTION 'NFT sold out'; END IF;
amount:=round(target.price_usd,2);
ELSIF _kind='presale' THEN
IF _usd IS NULL OR _usd<1 OR _usd>10000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
coins:=round(_usd,2)*s.mvt_per_usd; amount:=round(_usd*(1-s.purchase_discount_pct/100),2);
ELSE RAISE EXCEPTION 'Invalid purchase'; END IF;
IF amount<=0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
ref:='MV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
INSERT INTO public.payments(user_id,kind,plan_id,nft_id,amount_usd,amount_ngn_kobo,mvt_amount,reference,upgrade_from,quote_expires_at) VALUES(uid,_kind,CASE WHEN _kind='plan' THEN _target END,CASE WHEN _kind='nft' THEN _target END,amount,round(amount*_rate*100),coins,ref,CASE WHEN _kind='plan' THEN current_plan.id END,now()+interval '30 minutes');
RETURN json_build_object('reference',ref,'kobo',round(amount*_rate*100),'usd',amount);
END
$func$;

CREATE OR REPLACE FUNCTION public.prepare_checkout_for_user(_user uuid, _kind text, _target uuid, _usd numeric, _rate numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE uid uuid:=_user; s record; target record; current_plan public.plans%ROWTYPE; amount numeric; coins numeric; ref text; used integer;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(uid::text));
SELECT * INTO s FROM public.settings WHERE id=1;
IF _rate IS NULL OR _rate<=0 THEN RAISE EXCEPTION 'Invalid exchange rate'; END IF;
IF _kind='plan' THEN
SELECT * INTO target FROM public.plans WHERE id=_target AND active;
IF target.id IS NULL THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
SELECT pl.* INTO current_plan FROM public.nft_ownerships o JOIN public.nfts n ON n.id=o.nft_id JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE o.user_id=uid AND o.plan_purchase_id IS NOT NULL ORDER BY pl.price_usd DESC,o.created_at DESC LIMIT 1;
IF current_plan.id IS NOT NULL AND target.price_usd<=current_plan.price_usd THEN RAISE EXCEPTION 'Only upward upgrades are available'; END IF;
IF EXISTS (SELECT 1 FROM public.payments WHERE user_id=uid AND kind='plan' AND status='pending' AND quote_expires_at>now()) THEN RAISE EXCEPTION 'Finish your pending plan checkout first'; END IF;
amount:=round(target.price_usd,2);
ELSIF _kind='nft' THEN
IF EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
SELECT * INTO target FROM public.nfts WHERE id=_target AND active FOR UPDATE;
IF target.id IS NULL OR target.price_usd IS NULL THEN RAISE EXCEPTION 'NFT unavailable'; END IF;
IF EXISTS (SELECT 1 FROM public.nft_ownerships WHERE user_id=uid AND nft_id=_target) THEN RAISE EXCEPTION 'You already own this NFT'; END IF;
SELECT (SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='success')+(SELECT count(*) FROM public.payments WHERE nft_id=_target AND status='pending' AND quote_expires_at>now()) INTO used;
IF target.quantity IS NOT NULL AND used>=target.quantity THEN RAISE EXCEPTION 'NFT sold out'; END IF;
amount:=round(target.price_usd,2);
ELSIF _kind='presale' THEN
IF _usd IS NULL OR _usd<1 OR _usd>10000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
coins:=round(_usd,2)*s.mvt_per_usd; amount:=round(_usd*(1-s.purchase_discount_pct/100),2);
ELSE RAISE EXCEPTION 'Invalid purchase'; END IF;
IF amount<=0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
ref:='MV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
INSERT INTO public.payments(user_id,kind,plan_id,nft_id,amount_usd,amount_ngn_kobo,mvt_amount,reference,upgrade_from,quote_expires_at) VALUES(uid,_kind,CASE WHEN _kind='plan' THEN _target END,CASE WHEN _kind='nft' THEN _target END,amount,round(amount*_rate*100),coins,ref,CASE WHEN _kind='plan' THEN current_plan.id END,now()+interval '30 minutes');
RETURN json_build_object('reference',ref,'kobo',round(amount*_rate*100),'usd',amount);
END
$func$;

-- 4. NFT resale price bounds per tier (USD bounds converted to MVG at the current rate)
CREATE OR REPLACE FUNCTION public.nft_market_action(_action text, _id uuid, _price numeric DEFAULT NULL::numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE uid uuid:=auth.uid(); o record; l record; result uuid; available numeric; needed numeric; a text; take numeric;
  base_usd numeric; rate numeric; min_p numeric; max_p numeric;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('market'||uid::text));
IF EXISTS(SELECT 1 FROM public.profiles WHERE id=uid AND marketplace_blocked) THEN RAISE EXCEPTION 'Marketplace access suspended'; END IF;
IF _action='list' THEN
SELECT * INTO o FROM public.nft_ownerships WHERE id=_id AND user_id=uid FOR UPDATE;
IF o.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.nfts WHERE id=o.nft_id AND active) THEN RAISE EXCEPTION 'NFT unavailable'; END IF;
IF _price IS NULL OR _price<=0 THEN RAISE EXCEPTION 'Enter a positive MVG price'; END IF;
SELECT pl.price_usd INTO base_usd FROM public.nfts n JOIN public.plans pl ON pl.id=n.mining_plan_id WHERE n.id=o.nft_id;
IF base_usd IS NOT NULL THEN
  SELECT mvt_per_usd INTO rate FROM public.settings WHERE id=1;
  min_p:=round(base_usd*rate,2);
  max_p:=round((CASE WHEN base_usd<=2 THEN 100 WHEN base_usd<=5 THEN 500 ELSE 1000 END)*rate,2);
  IF _price<min_p OR _price>max_p THEN RAISE EXCEPTION 'Price for this NFT must be between % and % MVG', trim(to_char(min_p,'FM999999990.99')), trim(to_char(max_p,'FM999999990.99')); END IF;
END IF;
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
END
$func$;

-- 5. Crypto withdrawals gated by registration region
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _bank text, _acct text, _name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
declare uid uuid := auth.uid(); avail numeric; minw numeric; refc text; w record; ctry text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('wd'||uid::text));
  select min_withdrawal_usd into minw from public.settings where id=1;
  if _amount is null or _amount < minw then raise exception 'Minimum withdrawal is $%', minw; end if;
  if coalesce(length(trim(_acct)),0) < 6 or coalesce(length(trim(_name)),0) < 2 or coalesce(length(trim(_bank)),0) < 2 then raise exception 'Enter complete payout details'; end if;
  if _method = 'crypto' then
    select country into ctry from public.profiles where id=uid;
    if ctry = any(array['DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW','EH'])
       and not exists(select 1 from public.crypto_access_requests where user_id=uid and status='approved') then
      raise exception 'Crypto withdrawals are not available for accounts registered in Africa. You can request access from the referrals page.';
    end if;
  end if;
  select coalesce(sum(amount),0) into avail from public.ledger_entries where user_id=uid and account='referral' and status in ('confirmed','reserved');
  if _amount > avail then raise exception 'Amount exceeds available balance'; end if;
  refc := 'WD-'||upper(substr(md5(gen_random_uuid()::text),1,10));
  insert into public.withdrawals(user_id, amount_usd, method, bank_name, account_number, account_name, reference)
    values (uid, round(_amount,2), _method, trim(_bank), trim(_acct), trim(_name), refc) returning * into w;
  insert into public.ledger_entries(user_id, account, amount, kind, status, reference, details)
    values (uid,'referral',-round(_amount,2),'withdrawal','reserved', refc, json_build_object('withdrawal',w.id)::jsonb);
  insert into public.notifications(user_id,title,body) values (uid,'Withdrawal requested','$'||round(_amount,2)||' is reserved and pending review. Ref '||refc);
  return row_to_json(w);
end
$func$;
