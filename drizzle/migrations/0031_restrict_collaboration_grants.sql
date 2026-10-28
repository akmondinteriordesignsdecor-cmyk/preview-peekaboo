REVOKE ALL ON public.collaboration_requests FROM anon;
REVOKE ALL ON public.collaboration_messages FROM anon;
REVOKE UPDATE, DELETE ON public.collaboration_requests FROM authenticated;
REVOKE UPDATE, DELETE ON public.collaboration_messages FROM authenticated;