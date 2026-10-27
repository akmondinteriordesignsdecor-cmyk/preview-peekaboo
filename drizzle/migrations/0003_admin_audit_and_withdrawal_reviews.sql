CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_email text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_user_id, target_email, role)
  VALUES (actor,
    COALESCE((SELECT email FROM auth.users WHERE id = actor), 'system'),
    CASE TG_OP WHEN 'INSERT' THEN 'role_granted' WHEN 'DELETE' THEN 'role_removed' ELSE 'role_changed' END,
    r.user_id, (SELECT email FROM auth.users WHERE id = r.user_id),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.role::text || ' -> ' || NEW.role::text ELSE r.role::text END);
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER user_roles_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

CREATE TABLE public.withdrawal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  admin_details text,
  summary text NOT NULL,
  risk text NOT NULL,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_reviews TO authenticated;
GRANT ALL ON public.withdrawal_reviews TO service_role;
ALTER TABLE public.withdrawal_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read reviews" ON public.withdrawal_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins add reviews" ON public.withdrawal_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());