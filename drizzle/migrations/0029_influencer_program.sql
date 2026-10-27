CREATE TABLE public.influencer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  channel_links text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  screenshots text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  award_usd numeric,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.influencer_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.influencer_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  payout_details text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.influencer_submissions TO authenticated;
GRANT SELECT ON public.influencer_earnings TO authenticated;
GRANT SELECT ON public.influencer_withdrawals TO authenticated;
GRANT ALL ON public.influencer_submissions, public.influencer_earnings, public.influencer_withdrawals TO service_role;
ALTER TABLE public.influencer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.influencer_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert pending" ON public.influencer_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND award_usd IS NULL AND admin_note IS NULL AND reviewed_at IS NULL);
CREATE POLICY "admin delete" ON public.influencer_submissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "own or admin read" ON public.influencer_earnings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own or admin read" ON public.influencer_withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.review_influencer(_id uuid, _approve boolean, _award numeric, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.influencer_submissions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO s FROM public.influencer_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  IF _approve THEN
    IF _award IS NULL OR _award <= 0 OR _award > 10000000 THEN RAISE EXCEPTION 'Enter a valid amount'; END IF;
    UPDATE public.influencer_submissions SET status='approved', award_usd=_award, admin_note=_note, reviewed_at=now() WHERE id=_id;
    INSERT INTO public.influencer_earnings(user_id, amount_usd, note) VALUES (s.user_id, _award, _note);
    INSERT INTO public.notifications(user_id, title, body) VALUES (s.user_id, 'Influencer reward approved', 'Admin approved your influencing and gifted you $' || _award::text);
  ELSE
    UPDATE public.influencer_submissions SET status='rejected', admin_note=_note, reviewed_at=now() WHERE id=_id;
    INSERT INTO public.notifications(user_id, title, body) VALUES (s.user_id, 'Influencer request not approved', NULLIF(_note,''));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.influencer_balance()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'earned', COALESCE((SELECT sum(amount_usd) FROM public.influencer_earnings WHERE user_id = auth.uid()),0),
    'withdrawn', COALESCE((SELECT sum(amount_usd) FROM public.influencer_withdrawals WHERE user_id = auth.uid() AND status='paid'),0),
    'reserved', COALESCE((SELECT sum(amount_usd) FROM public.influencer_withdrawals WHERE user_id = auth.uid() AND status='requested'),0))
$$;

CREATE OR REPLACE FUNCTION public.request_influencer_withdrawal(_amount numeric, _details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE avail numeric; nid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('influencer:' || auth.uid()::text));
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter a valid amount'; END IF;
  IF length(trim(coalesce(_details,''))) < 5 THEN RAISE EXCEPTION 'Enter your payout details'; END IF;
  SELECT COALESCE((SELECT sum(amount_usd) FROM public.influencer_earnings WHERE user_id=auth.uid()),0)
       - COALESCE((SELECT sum(amount_usd) FROM public.influencer_withdrawals WHERE user_id=auth.uid() AND status IN ('requested','paid')),0) INTO avail;
  IF _amount > avail THEN RAISE EXCEPTION 'Amount exceeds your influencer balance'; END IF;
  INSERT INTO public.influencer_withdrawals(user_id, amount_usd, payout_details) VALUES (auth.uid(), _amount, left(trim(_details),1000)) RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_influencer_withdrawal(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.influencer_withdrawals;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('paid','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO w FROM public.influencer_withdrawals WHERE id=_id FOR UPDATE;
  IF NOT FOUND OR w.status <> 'requested' THEN RAISE EXCEPTION 'Withdrawal not open'; END IF;
  UPDATE public.influencer_withdrawals SET status=_status WHERE id=_id;
  INSERT INTO public.notifications(user_id, title, body) VALUES (w.user_id,
    CASE WHEN _status='paid' THEN 'Influencer withdrawal paid' ELSE 'Influencer withdrawal declined' END, '$' || w.amount_usd::text);
END $$;

CREATE POLICY "influencer own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='influencer-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "influencer own or admin read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='influencer-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "influencer admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='influencer-proofs' AND public.has_role(auth.uid(),'admin'));