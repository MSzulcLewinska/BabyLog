-- ============================================================
-- BabyLog — schemat Supabase
-- Wklej całość w: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- Tabele ----------

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_code text not null unique,
  photo_uri text,
  birth_date date,
  weight_kg numeric(4, 1),
  height_cm numeric(5, 1),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  secret uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- id generowane po stronie aplikacji (tekst), unikalne w obrębie dziecka
create table if not exists public.activities (
  id text not null,
  child_id uuid not null references public.children (id) on delete cascade,
  name text not null,
  icon text not null default '✨',
  unit text,
  color text not null default '#34C759',
  builtin boolean not null default false,
  kind text not null check (kind in ('milk', 'poop', 'drops', 'custom')),
  primary key (id, child_id)
);

create table if not exists public.events (
  id text not null,
  child_id uuid not null references public.children (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  kind text not null check (kind in ('milk', 'poop', 'drops', 'custom')),
  activity_id text not null,
  title text not null,
  icon text not null,
  color text not null default '#34C759',
  time text not null,
  date text not null,
  amount text,
  unit text,
  notes text,
  drop_kind text,
  author text,
  created_at timestamptz not null default now(),
  primary key (id, child_id)
);

create table if not exists public.plans (
  id text not null,
  child_id uuid not null references public.children (id) on delete cascade,
  activity_id text,
  title text not null,
  icon text not null,
  color text not null default '#F59E0B',
  date text not null,
  time text not null,
  note text,
  reminder_kind text not null default 'auto',
  minutes_before integer,
  reminder_time text,
  reminder_note text,
  notification_id text,
  created_at timestamptz not null default now(),
  primary key (id, child_id)
);

create index if not exists events_child_date_idx on public.events (child_id, date);
create index if not exists plans_child_idx on public.plans (child_id, date);

-- ---------- Uwierzytelnianie urządzeń ----------
-- Każdy telefon trzyma parę (member id + secret) i wysyła je w nagłówkach.
-- Polityki RLS sprawdzają je tymi funkcjami.
-- WAŻNE: security definer sprawia, że zapytania wewnątrz funkcji omijają
-- polityki RLS — bez tego polityki zapętlałyby się nawzajem (stack depth).

create or replace function public.current_member_child ()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.child_id
  from public.members m
  where m.id::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-id', ''
  )
    and m.secret::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-secret', ''
  )
$$;

create or replace function public.current_is_owner (p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.child_id = p_child
      and m.role = 'owner'
      and m.id::text = coalesce(
        current_setting('request.headers', true)::json ->> 'x-member-id', ''
      )
      and m.secret::text = coalesce(
        current_setting('request.headers', true)::json ->> 'x-member-secret', ''
      )
  )
$$;

-- czy dziecko nie ma jeszcze żadnych członków (rejestracja pierwszego)
create or replace function public.child_has_no_members (p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.members m where m.child_id = p_child
  )
$$;

-- ---------- Włączenie RLS ----------

alter table public.children enable row level security;
alter table public.members enable row level security;
alter table public.activities enable row level security;
alter table public.events enable row level security;
alter table public.plans enable row level security;

-- children
drop policy if exists "children_insert" on public.children;
create policy "children_insert" on public.children
  for insert with check (true); -- rejestracja nowego dziecka przed powstaniem członków

drop policy if exists "children_select_member" on public.children;
create policy "children_select_member" on public.children
  for select using (id = public.current_member_child ());

drop policy if exists "children_update_owner" on public.children;
create policy "children_update_owner" on public.children
  for update using (public.current_is_owner (id));

drop policy if exists "children_delete_owner" on public.children;
create policy "children_delete_owner" on public.children
  for delete using (public.current_is_owner (id));

-- members
drop policy if exists "members_select_member" on public.members;
create policy "members_select_member" on public.members
  for select using (child_id = public.current_member_child ());

-- pierwszy członek (właściciel) przy tworzeniu dziecka LUB dodaje właściciel
drop policy if exists "members_insert_bootstrap_or_owner" on public.members;
create policy "members_insert_bootstrap_or_owner" on public.members
  for insert with check (
    public.child_has_no_members (child_id)
    or public.current_is_owner (child_id)
  );

-- tylko właściciel usuwa dostęp (i nie może usunąć siebie)
drop policy if exists "members_delete_owner" on public.members;
create policy "members_delete_owner" on public.members
  for delete using (
    public.current_is_owner (child_id) and role <> 'owner'
  );

-- activities / events / plans — pełny dostęp dla członków dziecka

drop policy if exists "activities_member_all" on public.activities;
create policy "activities_member_all" on public.activities
  for all using (child_id = public.current_member_child ())
  with check (child_id = public.current_member_child ());

drop policy if exists "events_member_all" on public.events;
create policy "events_member_all" on public.events
  for all using (child_id = public.current_member_child ())
  with check (child_id = public.current_member_child ());

drop policy if exists "plans_member_all" on public.plans;
create policy "plans_member_all" on public.plans
  for all using (child_id = public.current_member_child ())
  with check (child_id = public.current_member_child ());

-- ---------- Rejestracja nowego dziecka ----------
-- Jedna atomowa funkcja (omija RLS): tworzy dziecko + właściciela i zwraca
-- sekret urządzenia. Bez tego polityki blokowały odczyt świeżo dodanego wiersza.

create or replace function public.create_child_with_owner (
  p_child_name text,
  p_share_code text,
  p_owner_name text,
  p_photo_uri text default null,
  p_birth_date date default null,
  p_weight_kg numeric default null,
  p_height_cm numeric default null
)
returns table (
  out_child_id uuid,
  out_child_name text,
  out_share_code text,
  out_member_id uuid,
  out_secret uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child public.children%rowtype;
  v_member public.members%rowtype;
begin
  insert into public.children (
    name, share_code, photo_uri, birth_date, weight_kg, height_cm
  )
  values (
    trim(p_child_name),
    trim(p_share_code),
    p_photo_uri,
    p_birth_date,
    p_weight_kg,
    p_height_cm
  )
  returning * into v_child;

  insert into public.members (child_id, name, role)
  values (
    v_child.id,
    case when coalesce(trim(p_owner_name), '') = ''
      then 'Właściciel' else trim(p_owner_name) end,
    'owner'
  )
  returning * into v_member;

  return query
    select v_child.id, v_child.name, v_child.share_code, v_member.id, v_member.secret;
end;
$$;

revoke all on function public.create_child_with_owner (text, text, text, text, date, numeric, numeric) from public;
grant execute on function public.create_child_with_owner (text, text, text, text, date, numeric, numeric) to anon, authenticated;

-- ---------- Dołączanie przez kod ----------

create or replace function public.join_by_code (p_code text, p_name text)
returns table (
  out_child_id uuid,
  out_child_name text,
  out_member_id uuid,
  out_secret uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child public.children%rowtype;
  v_member public.members%rowtype;
begin
  select * into v_child
  from public.children c
  where upper(replace(c.share_code, ' ', '')) = upper(replace(trim(p_code), ' ', ''));

  if not found then
    raise exception 'NIEZNANY_KOD';
  end if;

  insert into public.members (child_id, name, role)
  values (v_child.id, trim(p_name), 'member')
  returning * into v_member;

  return query
    select v_child.id, v_child.name, v_member.id, v_member.secret;
end;
$$;

revoke all on function public.join_by_code (text, text) from public;
grant execute on function public.join_by_code (text, text) to anon, authenticated;
