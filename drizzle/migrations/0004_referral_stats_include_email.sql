CREATE OR REPLACE FUNCTION public.referral_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select json_build_object(
    'total', count(*),
    'eligible', count(*) filter (where exists (select 1 from public.plan_purchases pp where pp.user_id=p.id and pp.referral_paid)),
    'list', coalesce(json_agg(json_build_object('name', p.display_name, 'email', p.email, 'joined', p.created_at,
       'eligible', exists (select 1 from public.plan_purchases pp where pp.user_id=p.id and pp.referral_paid)) order by p.created_at desc), '[]'::json)
  ) from public.profiles p where p.referred_by = auth.uid()
$$;