ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_account_check;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_account_check CHECK (account in ('mvt','referral','presale_mvt','tradable_mvt','p2p_escrow'));

CREATE OR REPLACE FUNCTION public.referral_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; list jsonb := '[]'::jsonb; total int := 0; eligible int := 0; is_eligible boolean;
BEGIN
  FOR r IN SELECT p.id, p.display_name, p.created_at FROM public.profiles p WHERE p.referred_by = auth.uid() ORDER BY p.created_at DESC LOOP
    total := total + 1;
    SELECT EXISTS (SELECT 1 FROM public.plan_purchases pp JOIN public.mining_sessions ms ON ms.user_id = r.id WHERE pp.user_id = r.id) INTO is_eligible;
    IF is_eligible THEN eligible := eligible + 1; END IF;
    list := list || jsonb_build_array(jsonb_build_object('name', COALESCE(r.display_name, 'Member'), 'joined', r.created_at, 'eligible', is_eligible));
  END LOOP;
  RETURN json_build_object('total', total, 'eligible', eligible, 'list', list);
END $$;
GRANT EXECUTE ON FUNCTION public.referral_stats() TO authenticated;