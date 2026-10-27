
-- P2P marketplace listings
CREATE TABLE public.p2p_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  side text not null check (side in ('sell','buy')),
  mvt_amount numeric not null check (mvt_amount > 0),
  price_usd numeric not null check (price_usd > 0),
  status text not null default 'open',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE ON public.p2p_listings TO authenticated;
GRANT ALL ON public.p2p_listings TO service_role;
ALTER TABLE public.p2p_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read open listings" ON public.p2p_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "create own listing" ON public.p2p_listings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own listing" ON public.p2p_listings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- P2P orders (fills)
CREATE TABLE public.p2p_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.p2p_listings(id),
  buyer_id uuid not null,
  mvt_amount numeric not null,
  price_usd numeric not null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.p2p_orders TO authenticated;
GRANT ALL ON public.p2p_orders TO service_role;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own orders" ON public.p2p_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.p2p_listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

-- Listing alert opt-in
CREATE TABLE public.listing_alerts (
  user_id uuid primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE ON public.listing_alerts TO authenticated;
GRANT ALL ON public.listing_alerts TO service_role;
ALTER TABLE public.listing_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alert" ON public.listing_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "set own alert" ON public.listing_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own alert" ON public.listing_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Convert mined (confirmed) MVT into tradable MVT
CREATE OR REPLACE FUNCTION public.convert_mvt(_mvt numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b json; avail numeric;
BEGIN
  IF _mvt IS NULL OR _mvt <= 0 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  b := public.get_balances();
  avail := COALESCE((b->>'mvt_confirmed')::numeric, 0);
  IF _mvt > avail THEN RAISE EXCEPTION 'You only have % MVT confirmed', avail; END IF;
  INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
    VALUES (auth.uid(), 'mvt', -_mvt, 'convert', 'CONV-' || gen_random_uuid()::text, jsonb_build_object('to','tradable_mvt'));
  INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
    VALUES (auth.uid(), 'tradable_mvt', _mvt, 'convert', 'CONV-' || gen_random_uuid()::text, jsonb_build_object('from','mvt'));
  RETURN json_build_object('converted', _mvt);
END $$;
GRANT EXECUTE ON FUNCTION public.convert_mvt(numeric) TO authenticated;

-- Create a P2P listing (sell side escrows tradable MVT)
CREATE OR REPLACE FUNCTION public.create_p2p_listing(_side text, _mvt numeric, _price numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; bal numeric;
BEGIN
  IF _side NOT IN ('sell','buy') THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF _mvt <= 0 OR _price <= 0 THEN RAISE EXCEPTION 'Amount and price must be above zero'; END IF;
  IF _side = 'sell' THEN
    SELECT COALESCE(SUM(amount),0) INTO bal FROM public.ledger_entries WHERE user_id = auth.uid() AND account = 'tradable_mvt';
    IF _mvt > bal THEN RAISE EXCEPTION 'Not enough tradable MVT. Convert mined coins first.'; END IF;
    INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
      VALUES (auth.uid(), 'tradable_mvt', -_mvt, 'p2p_escrow', 'P2P-' || gen_random_uuid()::text, '{}'::jsonb);
    INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
      VALUES (auth.uid(), 'p2p_escrow', _mvt, 'p2p_escrow', 'P2P-' || gen_random_uuid()::text, '{}'::jsonb);
  END IF;
  INSERT INTO public.p2p_listings (user_id, side, mvt_amount, price_usd) VALUES (auth.uid(), _side, _mvt, _price) RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_p2p_listing(text, numeric, numeric) TO authenticated;

-- Fill (buy) an open sell listing
CREATE OR REPLACE FUNCTION public.fill_p2p_order(_listing uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.p2p_listings%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.p2p_listings WHERE id = _listing FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF l.status <> 'open' THEN RAISE EXCEPTION 'Listing is no longer open'; END IF;
  IF l.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot fill your own listing'; END IF;
  IF l.side <> 'sell' THEN RAISE EXCEPTION 'Only sell listings can be filled here'; END IF;
  UPDATE public.p2p_listings SET status = 'filled' WHERE id = l.id;
  INSERT INTO public.p2p_orders (listing_id, buyer_id, mvt_amount, price_usd) VALUES (l.id, auth.uid(), l.mvt_amount, l.price_usd);
  INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
    VALUES (l.user_id, 'p2p_escrow', -l.mvt_amount, 'p2p_fill', 'P2P-' || l.id::text, jsonb_build_object('buyer', auth.uid()));
  INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
    VALUES (auth.uid(), 'tradable_mvt', l.mvt_amount, 'p2p_fill', 'P2P-' || l.id::text, jsonb_build_object('seller', l.user_id));
  RETURN json_build_object('bought', l.mvt_amount, 'price_usd', l.price_usd);
END $$;
GRANT EXECUTE ON FUNCTION public.fill_p2p_order(uuid) TO authenticated;

-- Cancel own open listing (refund escrow)
CREATE OR REPLACE FUNCTION public.cancel_p2p_listing(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.p2p_listings%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.p2p_listings WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR l.user_id <> auth.uid() THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF l.status <> 'open' THEN RAISE EXCEPTION 'Only open listings can be cancelled'; END IF;
  UPDATE public.p2p_listings SET status = 'cancelled' WHERE id = l.id;
  IF l.side = 'sell' THEN
    INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
      VALUES (l.user_id, 'p2p_escrow', -l.mvt_amount, 'p2p_cancel', 'P2P-' || l.id::text, '{}'::jsonb);
    INSERT INTO public.ledger_entries (user_id, account, amount, kind, reference, details)
      VALUES (l.user_id, 'tradable_mvt', l.mvt_amount, 'p2p_cancel', 'P2P-' || l.id::text, '{}'::jsonb);
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_p2p_listing(uuid) TO authenticated;

-- Referral stats: stop exposing referee emails (privacy)
CREATE OR REPLACE FUNCTION public.referral_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; list json := '[]'::json; total int := 0; eligible int := 0; is_eligible boolean;
BEGIN
  FOR r IN SELECT p.id, p.display_name, p.created_at FROM public.profiles p WHERE p.referred_by = auth.uid() ORDER BY p.created_at DESC LOOP
    total := total + 1;
    SELECT EXISTS (
      SELECT 1 FROM public.plan_purchases pp
      JOIN public.mining_sessions ms ON ms.user_id = r.id
      WHERE pp.user_id = r.id
    ) INTO is_eligible;
    IF is_eligible THEN eligible := eligible + 1; END IF;
    list := list || jsonb_build_object('name', COALESCE(r.display_name, 'Member'), 'joined', r.created_at, 'eligible', is_eligible);
  END LOOP;
  RETURN json_build_object('total', total, 'eligible', eligible, 'list', list);
END $$;
GRANT EXECUTE ON FUNCTION public.referral_stats() TO authenticated;
