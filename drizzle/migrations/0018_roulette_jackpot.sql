UPDATE public.settings SET spin_min_mvt = 0.5, spin_max_mvt = 1.0;
ALTER TABLE public.daily_spins ADD COLUMN IF NOT EXISTS jackpot boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.spin_roulette()
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid(); s record; prev record; reward numeric; new_streak int;
  nft record; nft_name text; ref text; total int; is_jackpot boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('spin:' || uid::text));
  IF EXISTS (SELECT 1 FROM public.daily_spins WHERE user_id = uid AND spin_date = current_date) THEN
    RAISE EXCEPTION 'You already spun today. Come back tomorrow.';
  END IF;
  SELECT * INTO s FROM public.settings ORDER BY id LIMIT 1;
  SELECT spin_date, streak INTO prev FROM public.daily_spins WHERE user_id = uid ORDER BY spin_date DESC LIMIT 1;
  SELECT count(*) + 1 INTO total FROM public.daily_spins WHERE user_id = uid;
  new_streak := CASE WHEN prev.spin_date = current_date - 1 THEN prev.streak + 1 ELSE 1 END;
  -- Jackpot: only possible on every 10th spin, and only a 15% chance then
  IF total % 10 = 0 AND random() < 0.15 THEN
    is_jackpot := true; reward := 10;
  ELSE
    reward := round((s.spin_min_mvt + random() * (s.spin_max_mvt - s.spin_min_mvt))::numeric, 1);
  END IF;
  ref := 'SPIN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(uid::text, 1, 8);
  INSERT INTO public.daily_spins(user_id, reward_mvt, streak, jackpot) VALUES (uid, reward, new_streak, is_jackpot);
  INSERT INTO public.ledger_entries(user_id, account, amount, kind, reference, details)
    VALUES (uid, 'mvt', reward, 'daily_spin', ref, json_build_object('streak', new_streak, 'jackpot', is_jackpot)::jsonb);
  IF new_streak % s.streak_reward_days = 0 THEN
    SELECT * INTO nft FROM public.nfts
      WHERE active AND price_usd IS NULL AND mining_plan_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.nft_ownerships o WHERE o.nft_id = nfts.id AND o.user_id = uid)
      ORDER BY random() LIMIT 1;
    IF nft.id IS NOT NULL THEN
      nft_name := nft.name;
      INSERT INTO public.nft_ownerships(nft_id, user_id, source) VALUES (nft.id, uid, 'reward');
      INSERT INTO public.notifications(user_id, title, body) VALUES (uid, 'Streak reward unlocked', new_streak || '-day streak! You earned the NFT "' || nft.name || '".');
    END IF;
  END IF;
  INSERT INTO public.notifications(user_id, title, body) VALUES (uid, CASE WHEN is_jackpot THEN 'JACKPOT!' ELSE 'Daily spin' END, 'You won ' || reward || ' MVG. Streak: ' || new_streak || ' day(s).');
  RETURN json_build_object('reward', reward, 'streak', new_streak, 'nft', nft_name, 'jackpot', is_jackpot, 'total_spins', total);
END $function$;

CREATE OR REPLACE FUNCTION public.game_status()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); s record; last_spin record; last_box timestamptz;
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
    'streak_days', s.streak_reward_days,
    'total_spins', (SELECT count(*) FROM public.daily_spins WHERE user_id = uid),
    'jackpot_amount', 10, 'jackpot_every', 10,
    'recent', COALESCE((SELECT json_agg(r) FROM (
      SELECT 'spin' AS kind, reward_mvt AS reward, jackpot, created_at FROM public.daily_spins WHERE user_id = uid
      UNION ALL SELECT 'box', reward_mvt, false, created_at FROM public.mystery_opens WHERE user_id = uid
      ORDER BY created_at DESC LIMIT 6) r), '[]'::json)
  );
END $function$;