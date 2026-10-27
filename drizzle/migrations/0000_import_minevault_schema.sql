create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  referral_code text unique not null,
  referred_by uuid,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.settings (
  id int primary key default 1 check (id = 1),
  mvt_per_usd numeric not null default 50,
  usd_to_ngn numeric not null default 1600,
  referral_commission_pct numeric not null default 50,
  min_withdrawal_usd numeric not null default 5,
  session_hours int not null default 12,
  launch_label text not null default 'Q1 2027',
  launch_date timestamptz not null default '2026-12-20 12:00:00+00'
);
insert into public.settings (id) values (1);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_usd numeric not null check (price_usd > 0),
  capacity_ths numeric not null,
  mvt_per_session numeric not null default 0,
  sort int not null default 0,
  active boolean not null default true
);
insert into public.plans (name, price_usd, capacity_ths, mvt_per_session, sort) values
 ('Starter Compute', 2, 5, 5, 1), ('Pro Compute', 5, 10, 12, 2), ('Team Compute', 10, 15, 25, 3);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('plan','presale')),
  plan_id uuid references public.plans(id),
  amount_usd numeric not null,
  amount_ngn_kobo bigint not null,
  mvt_amount numeric,
  reference text unique not null,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index on public.payments(user_id, created_at desc);

create table public.plan_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.plans(id),
  payment_id uuid unique not null references public.payments(id),
  referral_paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.plan_purchases(user_id);

create table public.mining_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  purchase_id uuid not null references public.plan_purchases(id),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','completed','claimed','cancelled')),
  reward_mvt numeric,
  claimed_at timestamptz
);
create unique index one_active_session on public.mining_sessions(user_id) where status = 'active';
create index on public.mining_sessions(user_id, started_at desc);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account text not null check (account in ('mvt','referral','presale_mvt')),
  amount numeric not null,
  kind text not null,
  status text not null default 'confirmed' check (status in ('pending','confirmed','reserved','released')),
  reference text unique not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.ledger_entries(user_id, created_at desc);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_usd numeric not null,
  method text not null,
  bank_name text, account_number text, account_name text,
  reference text unique not null,
  status text not null default 'pending_review' check (status in ('requested','pending_review','processing','completed','failed','rejected','cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bank_code text, transfer_ref text, transfer_code text, amount_ngn_kobo bigint
);
create index on public.withdrawals(user_id, created_at desc);

create table public.whitelist (
  user_id uuid primary key,
  wallet_address text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);

create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ip text,
  user_agent text,
  method text,
  created_at timestamptz not null default now()
);

grant select on public.settings, public.plans to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles, public.payments, public.plan_purchases, public.mining_sessions, public.ledger_entries, public.withdrawals, public.whitelist, public.login_events to authenticated;
grant select, update on public.notifications to authenticated;
grant all on public.profiles, public.user_roles, public.settings, public.plans, public.payments, public.plan_purchases, public.mining_sessions, public.ledger_entries, public.withdrawals, public.whitelist, public.notifications, public.login_events to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.settings enable row level security;
alter table public.plans enable row level security;
alter table public.payments enable row level security;
alter table public.plan_purchases enable row level security;
alter table public.mining_sessions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.withdrawals enable row level security;
alter table public.whitelist enable row level security;
alter table public.notifications enable row level security;
alter table public.login_events enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read settings" on public.settings for select using (true);
create policy "read plans" on public.plans for select using (active or public.has_role(auth.uid(),'admin'));
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "own payments" on public.payments for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own purchases" on public.plan_purchases for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own sessions" on public.mining_sessions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own ledger" on public.ledger_entries for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own withdrawals" on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own whitelist" on public.whitelist for select to authenticated using (user_id = auth.uid());
create policy "own notifs" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifs" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logins" on public.login_events for select to authenticated using (user_id = auth.uid());

create or replace function public.protect_profile() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' then
    new.referral_code := old.referral_code; new.referred_by := old.referred_by; new.email := old.email;
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare code text; ref_id uuid;
begin
  loop
    code := upper(substr(md5(random()::text || new.id::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  select id into ref_id from public.profiles
    where referral_code = upper(nullif(new.raw_user_meta_data->>'ref','')) and id <> new.id;
  insert into public.profiles (id, email, display_name, referral_code, referred_by)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), code, ref_id);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.notifications (user_id, title, body) values (new.id, 'Welcome to MineVault', 'Your account has been created.');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_balances()
returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); s record; r json;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.settings where id = 1;
  select json_build_object(
    'mvt_confirmed', coalesce(sum(amount) filter (where account='mvt' and status='confirmed'),0),
    'mvt_pending', coalesce(sum(amount) filter (where account='mvt' and status='pending'),0),
    'referral_total', coalesce(sum(amount) filter (where account='referral' and status='confirmed' and amount > 0),0),
    'referral_available', coalesce(sum(amount) filter (where account='referral' and status in ('confirmed','reserved')),0),
    'referral_reserved', -coalesce(sum(amount) filter (where account='referral' and status='reserved'),0),
    'referral_withdrawn', -coalesce(sum(amount) filter (where account='referral' and status='confirmed' and amount < 0),0),
    'presale_mvt', coalesce(sum(amount) filter (where account='presale_mvt'),0),
    'mvt_per_usd', s.mvt_per_usd,
    'min_withdrawal_usd', s.min_withdrawal_usd
  ) into r from public.ledger_entries where user_id = uid;
  return r;
end $$;
grant execute on function public.get_balances() to authenticated;

create or replace function public.start_mining()
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p record; sess record; hrs int; ref uuid; plan record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  update public.mining_sessions set status='completed' where user_id=uid and status='active' and ends_at <= now();
  if exists (select 1 from public.mining_sessions where user_id=uid and status='active') then
    raise exception 'A mining session is already running';
  end if;
  select pp.* into p from public.plan_purchases pp join public.plans pl on pl.id = pp.plan_id
    where pp.user_id = uid order by pl.price_usd desc, pp.created_at desc limit 1;
  if p.id is null then raise exception 'Activate a computing plan first'; end if;
  select session_hours into hrs from public.settings where id=1;
  insert into public.mining_sessions (user_id, purchase_id, ends_at)
    values (uid, p.id, now() + make_interval(hours => hrs)) returning * into sess;
  insert into public.notifications(user_id,title,body) values (uid,'Mining session started','Your '||hrs||'-hour session is running.');
  for p in select pp.* from public.plan_purchases pp where pp.user_id = uid and not pp.referral_paid for update loop
    select referred_by into ref from public.profiles where id = uid;
    if ref is not null and ref <> uid then
      select pl.* into plan from public.plans pl where pl.id = p.plan_id;
      insert into public.ledger_entries(user_id, account, amount, kind, reference, details)
      values (ref, 'referral', round(plan.price_usd * (select referral_commission_pct from public.settings where id=1) / 100, 2),
              'referral_commission', 'REF-'||p.id, json_build_object('from_user', uid, 'plan', plan.name)::jsonb)
      on conflict (reference) do nothing;
      insert into public.notifications(user_id,title,body) values (ref,'Referral reward approved','A referral activated '||plan.name||' and started mining.');
    end if;
    update public.plan_purchases set referral_paid = true where id = p.id;
  end loop;
  return row_to_json(sess);
end $$;
grant execute on function public.start_mining() to authenticated;

create or replace function public.claim_mining(_session uuid)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sess record; reward numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into sess from public.mining_sessions where id=_session and user_id=uid for update;
  if sess.id is null then raise exception 'Session not found'; end if;
  if sess.status = 'claimed' then raise exception 'Already claimed'; end if;
  if sess.ends_at > now() then raise exception 'Session still running'; end if;
  select pl.mvt_per_session into reward from public.plan_purchases pp join public.plans pl on pl.id=pp.plan_id where pp.id = sess.purchase_id;
  update public.mining_sessions set status='claimed', reward_mvt=reward, claimed_at=now() where id=sess.id;
  insert into public.ledger_entries(user_id, account, amount, kind, status, reference, details)
    values (uid,'mvt',reward,'mining_reward','pending','MINE-'||sess.id, json_build_object('session',sess.id)::jsonb);
  insert into public.notifications(user_id,title,body) values (uid,'Mining session completed', reward||' MVT recorded as pending until the coin lists.');
  return json_build_object('reward', reward);
end $$;
grant execute on function public.claim_mining(uuid) to authenticated;

create or replace function public.request_withdrawal(_amount numeric, _method text, _bank text, _acct text, _name text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); avail numeric; minw numeric; refc text; w record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('wd'||uid::text));
  select min_withdrawal_usd into minw from public.settings where id=1;
  if _amount is null or _amount < minw then raise exception 'Minimum withdrawal is $%', minw; end if;
  if coalesce(length(trim(_acct)),0) < 6 or coalesce(length(trim(_name)),0) < 2 or coalesce(length(trim(_bank)),0) < 2 then raise exception 'Enter complete payout details'; end if;
  select coalesce(sum(amount),0) into avail from public.ledger_entries where user_id=uid and account='referral' and status in ('confirmed','reserved');
  if _amount > avail then raise exception 'Amount exceeds available balance'; end if;
  refc := 'WD-'||upper(substr(md5(gen_random_uuid()::text),1,10));
  insert into public.withdrawals(user_id, amount_usd, method, bank_name, account_number, account_name, reference)
    values (uid, round(_amount,2), _method, trim(_bank), trim(_acct), trim(_name), refc) returning * into w;
  insert into public.ledger_entries(user_id, account, amount, kind, status, reference, details)
    values (uid,'referral',-round(_amount,2),'withdrawal','reserved', refc, json_build_object('withdrawal',w.id)::jsonb);
  insert into public.notifications(user_id,title,body) values (uid,'Withdrawal requested','$'||round(_amount,2)||' is reserved and pending review. Ref '||refc);
  return row_to_json(w);
end $$;
grant execute on function public.request_withdrawal(numeric,text,text,text,text) to authenticated;

create or replace function public.admin_set_withdrawal(_id uuid, _status text, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select * into w from public.withdrawals where id=_id for update;
  if w.status in ('completed','failed','rejected','cancelled') then raise exception 'Withdrawal already finalised'; end if;
  if _status not in ('processing','completed','failed','rejected') then raise exception 'Bad status'; end if;
  update public.withdrawals set status=_status, admin_note=_note, updated_at=now() where id=_id;
  if _status = 'completed' then
    update public.ledger_entries set status='confirmed' where reference=w.reference and status='reserved';
  elsif _status in ('failed','rejected') then
    update public.ledger_entries set status='released' where reference=w.reference and status='reserved';
  end if;
  insert into public.notifications(user_id,title,body) values (w.user_id,'Withdrawal '||_status, 'Ref '||w.reference||coalesce(' — '||_note,''));
end $$;
grant execute on function public.admin_set_withdrawal(uuid,text,text) to authenticated;

create or replace function public.cancel_withdrawal(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.withdrawals where id=_id and user_id=auth.uid() for update;
  if w.id is null or w.status not in ('requested','pending_review') then raise exception 'Cannot cancel'; end if;
  update public.withdrawals set status='cancelled', updated_at=now() where id=_id;
  update public.ledger_entries set status='released' where reference=w.reference and status='reserved';
end $$;
grant execute on function public.cancel_withdrawal(uuid) to authenticated;

create or replace function public.join_whitelist(_wallet text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.whitelist(user_id, wallet_address) values (auth.uid(), nullif(trim(_wallet),''))
  on conflict (user_id) do update set wallet_address = excluded.wallet_address;
end $$;
grant execute on function public.join_whitelist(text) to authenticated;

create or replace function public.referral_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', count(*),
    'eligible', count(*) filter (where exists (select 1 from public.plan_purchases pp where pp.user_id=p.id and pp.referral_paid)),
    'list', coalesce(json_agg(json_build_object('name', p.display_name, 'joined', p.created_at,
       'eligible', exists (select 1 from public.plan_purchases pp where pp.user_id=p.id and pp.referral_paid)) order by p.created_at desc), '[]'::json)
  ) from public.profiles p where p.referred_by = auth.uid()
$$;
grant execute on function public.referral_stats() to authenticated;

create or replace function public.platform_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'members', (select count(*) from public.profiles),
    'sessions', (select count(*) from public.mining_sessions),
    'whitelist', (select count(*) from public.whitelist))
$$;
grant execute on function public.platform_stats() to anon, authenticated;

create or replace function public.fulfill_payment(_reference text, _paid_kobo bigint)
returns text language plpgsql security definer set search_path = public as $$
declare p record; pl record;
begin
  select * into p from public.payments where reference=_reference for update;
  if p.id is null then return 'not_found'; end if;
  if p.status = 'success' then return 'already'; end if;
  if _paid_kobo < p.amount_ngn_kobo then
    update public.payments set status='failed' where id=p.id; return 'amount_mismatch';
  end if;
  update public.payments set status='success', verified_at=now() where id=p.id;
  if p.kind = 'plan' then
    select * into pl from public.plans where id=p.plan_id;
    insert into public.plan_purchases(user_id, plan_id, payment_id) values (p.user_id, p.plan_id, p.id);
    insert into public.notifications(user_id,title,body) values (p.user_id,'Plan activated', pl.name||' is active. Start mining now.');
  else
    insert into public.ledger_entries(user_id, account, amount, kind, reference, details)
      values (p.user_id,'presale_mvt',p.mvt_amount,'coin_purchase','BUY-'||p.reference, json_build_object('usd',p.amount_usd)::jsonb);
    insert into public.notifications(user_id,title,body) values (p.user_id,'Coin purchase confirmed', p.mvt_amount||' MVT added to your presale balance.');
  end if;
  return 'ok';
end $$;
revoke execute on function public.fulfill_payment(text,bigint) from public, anon, authenticated;
grant execute on function public.fulfill_payment(text,bigint) to service_role;

create or replace function public.system_set_withdrawal(_id uuid, _status text, _note text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare w record;
begin
  select * into w from public.withdrawals where id=_id for update;
  if w.id is null or w.status in ('completed','failed','rejected','cancelled') then return; end if;
  update public.withdrawals set status=_status, admin_note=coalesce(_note, admin_note), updated_at=now() where id=_id;
  if _status = 'completed' then
    update public.ledger_entries set status='confirmed' where reference=w.reference and status='reserved';
  elsif _status in ('failed','rejected') then
    update public.ledger_entries set status='released' where reference=w.reference and status='reserved';
  end if;
  if _status <> 'processing' then
    insert into public.notifications(user_id,title,body) values (w.user_id,'Withdrawal '||_status, 'Ref '||w.reference||coalesce(' — '||_note,''));
  end if;
end $$;
revoke all on function public.system_set_withdrawal(uuid,text,text) from public, anon, authenticated;
grant execute on function public.system_set_withdrawal(uuid,text,text) to service_role;