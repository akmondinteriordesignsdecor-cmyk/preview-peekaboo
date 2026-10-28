-- Permission contract: fails if either private table loses RLS or gains public access.
SELECT 1 / CASE WHEN count(*) = 2 THEN 1 ELSE 0 END AS both_tables_protected
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('collaboration_requests', 'collaboration_messages') AND c.relrowsecurity;
SELECT 1 / CASE WHEN NOT has_table_privilege('anon', 'public.collaboration_requests', 'SELECT')
 AND NOT has_table_privilege('anon', 'public.collaboration_messages', 'SELECT') THEN 1 ELSE 0 END AS no_anonymous_reads;
SELECT 1 / CASE WHEN count(*) = 2 THEN 1 ELSE 0 END AS owner_and_admin_read_policies
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('collaboration_requests', 'collaboration_messages')
 AND cmd = 'SELECT' AND qual LIKE '%auth.uid()%' AND qual LIKE '%has_role%admin%';
SELECT 1 / CASE WHEN count(*) = 2 THEN 1 ELSE 0 END AS authenticated_insert_policies
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('collaboration_requests', 'collaboration_messages')
 AND cmd = 'INSERT' AND with_check LIKE '%auth.uid()%';