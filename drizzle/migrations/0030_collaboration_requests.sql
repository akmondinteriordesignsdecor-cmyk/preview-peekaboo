CREATE TABLE public.collaboration_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 platform_name text NOT NULL CHECK (char_length(btrim(platform_name)) BETWEEN 1 AND 160),
 email text NOT NULL CHECK (char_length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
 topic text NOT NULL DEFAULT 'Collaboration' CHECK (topic IN ('Collaboration', 'Coin partnership', 'Shareholding')),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.collaboration_requests TO authenticated;
GRANT ALL ON public.collaboration_requests TO service_role;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY collaboration_request_read ON public.collaboration_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY collaboration_request_insert ON public.collaboration_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX collaboration_requests_owner_idx ON public.collaboration_requests(user_id, created_at DESC);
CREATE TABLE public.collaboration_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.collaboration_requests(id) ON DELETE CASCADE,
 author_id uuid NOT NULL DEFAULT auth.uid(),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.collaboration_messages TO authenticated;
GRANT ALL ON public.collaboration_messages TO service_role;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY collaboration_message_read ON public.collaboration_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.collaboration_requests r WHERE r.id = request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY collaboration_message_insert ON public.collaboration_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.collaboration_requests r WHERE r.id = request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE INDEX collaboration_messages_request_idx ON public.collaboration_messages(request_id, created_at);