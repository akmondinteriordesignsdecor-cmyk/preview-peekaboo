ALTER TABLE public.settings
  ADD COLUMN spin_min_mvt numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN spin_max_mvt numeric NOT NULL DEFAULT 0.9,
  ADD COLUMN mystery_min_mvt numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN mystery_max_mvt numeric NOT NULL DEFAULT 0.15,
  ADD COLUMN streak_reward_days int NOT NULL DEFAULT 7;

CREATE TABLE public.daily_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  spin_date date not null default current_date,
  reward_mvt numeric not null,
  streak int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, spin_date)
);
GRANT SELECT ON public.daily_spins TO authenticated;
GRANT ALL ON public.daily_spins TO service_role;
ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own spins" ON public.daily_spins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mystery_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reward_mvt numeric not null,
  created_at timestamptz not null default now()
);
create index on public.mystery_opens(user_id, created_at desc);
GRANT SELECT ON public.mystery_opens TO authenticated;
GRANT ALL ON public.mystery_opens TO service_role;
ALTER TABLE public.mystery_opens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own mystery opens" ON public.mystery_opens FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.nfts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  model_url text,
  price_usd numeric,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.nfts TO anon, authenticated;
GRANT ALL ON public.nfts TO service_role;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active NFTs" ON public.nfts FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins manage NFTs" ON public.nfts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.nft_ownerships (
  id uuid primary key default gen_random_uuid(),
  nft_id uuid not null references public.nfts(id),
  user_id uuid not null,
  source text not null check (source in ('purchase','reward')),
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.nft_ownerships TO authenticated;
GRANT ALL ON public.nft_ownerships TO service_role;
ALTER TABLE public.nft_ownerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own NFTs" ON public.nft_ownerships FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.payments ADD COLUMN nft_id uuid references public.nfts(id);
ALTER TABLE public.payments DROP CONSTRAINT payments_kind_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_kind_check CHECK (kind IN ('plan','presale','nft'));

CREATE OR REPLACE FUNCTION public.game_status()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  last_spin record;
  last_box timestamptz;
BEGIN
  SELECT * INTO s FROM public.settings ORDER BY id LIMIT 1;
  SELECT spin_date, streak INTO last_spin FROM public.daily_spins WHERE user_id = uid ORDER BY spin_date DESC LIMIT 1;
  SELECT max(created_at) INTO last_box FROM public.mystery_opens WHERE user_id = uid;
  RETURN json_build_object(
    'can_spin', last_spin.spin_date IS NULL OR last_spin.spin_date < current_date,
    'streak', CASE WHEN last_spin.spin_date >= current_date - 1 THEN last_spin.streak ELSE 0 END,
    'last_reward', (SELECT reward_mvt FROM public.daily_spins WHERE user_id = uid ORDER BY spin_date DESC LIMIT 1),
    'can_box', last_box IS NULL OR last_box <= now() - interval '1 hour',
    'next_box_at', last_box + interval '1 hour',
    'spin_min', s.spin_min_mvt, 'spin_max', s.spin_max_mvt,
    'box_min', s.mystery_min_mvt, 'box_max', s.mystery_max_mvt,
    'streak_days', s.streak_reward_days
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.game_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.game_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.spin_roulette()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  prev record;
  reward numeric;
  new_streak int;
  nft record;
  ref text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_spins WHERE user_id = uid AND spin_date = current_date) THEN
    RAISE EXCEPTION 'You already spun today. Come back tomorrow.';
  END IF;
  SELECT * INTO s FROM public.settings ORDER BY id LIMIT 1;
  SELECT spin_date, streak INTO prev FROM public.daily_spins WHERE user_id = uid ORDER BY spin_date DESC LIMIT 1;
  new_streak := CASE WHEN prev.spin_date = current_date - 1 THEN prev.streak + 1 ELSE 1 END;
  reward := round((s.spin_min_mvt + random() * (s.spin_max_mvt - s.spin_min_mvt))::numeric, 2);
  ref := 'SPIN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(uid::text, 1, 8);
  INSERT INTO public.daily_spins(user_id, reward_mvt, streak) VALUES (uid, reward, new_streak);
  INSERT INTO public.ledger_entries(user_id, account, amount, kind, reference, details)
    VALUES (uid, 'mvt', reward, 'daily_spin', ref, json_build_object('streak', new_streak)::jsonb);
  IF new_streak % s.streak_reward_days = 0 THEN
    SELECT * INTO nft FROM public.nfts
      WHERE active AND price_usd IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.nft_ownerships o WHERE o.nft_id = nfts.id AND o.user_id = uid)
      ORDER BY random() LIMIT 1;
    IF nft.id IS NOT NULL THEN
      INSERT INTO public.nft_ownerships(nft_id, user_id, source) VALUES (nft.id, uid, 'reward');
      INSERT INTO public.notifications(user_id, title, body) VALUES (uid, 'Streak reward unlocked', new_streak || '-day streak! You earned the NFT "' || nft.name || '".');
    END IF;
  END IF;
  INSERT INTO public.notifications(user_id, title, body) VALUES (uid, 'Daily spin', 'You won ' || reward || ' MVT. Streak: ' || new_streak || ' day(s).');
  RETURN json_build_object('reward', reward, 'streak', new_streak, 'nft', CASE WHEN nft.id IS NOT NULL THEN nft.name ELSE NULL END);
END $$;
REVOKE EXECUTE ON FUNCTION public.spin_roulette() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spin_roulette() TO authenticated;

CREATE OR REPLACE FUNCTION public.open_mystery_box()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  reward numeric;
  ref text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.mystery_opens WHERE user_id = uid AND created_at > now() - interval '1 hour') THEN
    RAISE EXCEPTION 'The mystery box is still cooling down. Try again later.';
  END IF;
  SELECT * INTO s FROM public.settings ORDER BY id LIMIT 1;
  reward := round((s.mystery_min_mvt + random() * (s.mystery_max_mvt - s.mystery_min_mvt))::numeric, 2);
  ref := 'BOX-' || substr(gen_random_uuid()::text, 1, 12);
  INSERT INTO public.mystery_opens(user_id, reward_mvt) VALUES (uid, reward);
  INSERT INTO public.ledger_entries(user_id, account, amount, kind, reference, details)
    VALUES (uid, 'mvt', reward, 'mystery_box', ref, '{}'::jsonb);
  RETURN json_build_object('reward', reward, 'next_at', now() + interval '1 hour');
END $$;
REVOKE EXECUTE ON FUNCTION public.open_mystery_box() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_mystery_box() TO authenticated;

CREATE OR REPLACE FUNCTION public.fulfill_payment(_reference text, _paid_kobo bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; pl record; n record;
BEGIN
  SELECT * INTO p FROM public.payments WHERE reference = _reference FOR UPDATE;
  IF p.id IS NULL THEN RETURN 'not_found'; END IF;
  IF p.status = 'success' THEN RETURN 'already'; END IF;
  IF _paid_kobo < p.amount_ngn_kobo THEN
    UPDATE public.payments SET status = 'failed' WHERE id = p.id; RETURN 'amount_mismatch';
  END IF;
  UPDATE public.payments SET status = 'success', verified_at = now() WHERE id = p.id;
  IF p.kind = 'plan' THEN
    SELECT * INTO pl FROM public.plans WHERE id = p.plan_id;
    INSERT INTO public.plan_purchases(user_id, plan_id, payment_id) VALUES (p.user_id, p.plan_id, p.id);
    INSERT INTO public.notifications(user_id, title, body) VALUES (p.user_id, 'Plan activated', pl.name || ' is active. Start mining now.');
  ELSIF p.kind = 'nft' THEN
    SELECT * INTO n FROM public.nfts WHERE id = p.nft_id;
    INSERT INTO public.nft_ownerships(nft_id, user_id, source, payment_id) VALUES (p.nft_id, p.user_id, 'purchase', p.id);
    INSERT INTO public.notifications(user_id, title, body) VALUES (p.user_id, 'NFT purchased', coalesce(n.name, 'NFT') || ' is now in your collection.');
  ELSE
    INSERT INTO public.ledger_entries(user_id, account, amount, kind, reference, details)
      VALUES (p.user_id, 'presale_mvt', p.mvt_amount, 'coin_purchase', 'BUY-' || p.reference, json_build_object('usd', p.amount_usd)::jsonb);
    INSERT INTO public.notifications(user_id, title, body) VALUES (p.user_id, 'Coin purchase confirmed', p.mvt_amount || ' MVT added to your presale balance.');
  END IF;
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(text, bigint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(text, bigint) TO service_role;

CREATE POLICY "Public read NFT media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'nft-media');
CREATE POLICY "Admins upload NFT media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nft-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update NFT media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'nft-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete NFT media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nft-media' AND public.has_role(auth.uid(), 'admin'));