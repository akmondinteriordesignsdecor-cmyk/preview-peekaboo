CREATE OR REPLACE FUNCTION public.spin_roulette()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  prev record;
  reward numeric;
  new_streak int;
  nft record;
  nft_name text;
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
      nft_name := nft.name;
      INSERT INTO public.nft_ownerships(nft_id, user_id, source) VALUES (nft.id, uid, 'reward');
      INSERT INTO public.notifications(user_id, title, body) VALUES (uid, 'Streak reward unlocked', new_streak || '-day streak! You earned the NFT "' || nft.name || '".');
    END IF;
  END IF;
  INSERT INTO public.notifications(user_id, title, body) VALUES (uid, 'Daily spin', 'You won ' || reward || ' MVT. Streak: ' || new_streak || ' day(s).');
  RETURN json_build_object('reward', reward, 'streak', new_streak, 'nft', nft_name);
END $$;
REVOKE EXECUTE ON FUNCTION public.spin_roulette() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spin_roulette() TO authenticated;