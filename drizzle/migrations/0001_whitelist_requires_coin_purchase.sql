create or replace function public.join_whitelist(_wallet text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce((select sum(amount) from public.ledger_entries where user_id = auth.uid() and account = 'presale_mvt'), 0) <= 0 then
    raise exception 'Buy MVT coins first to join the whitelist';
  end if;
  insert into public.whitelist(user_id, wallet_address) values (auth.uid(), nullif(trim(_wallet),''))
  on conflict (user_id) do update set wallet_address = excluded.wallet_address;
end $$;