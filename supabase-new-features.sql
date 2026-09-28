-- =============================================================
-- BabyLog — aktualizacja bazy. Uruchom w Supabase → SQL Editor.
-- Zawiera: pomiary wzrostu, powtarzane plany, naprawę zmiany roli,
-- logowanie e-mail po członkach, dołączanie kodem bez roli właściciela
-- oraz posiłki BLW w dzienniku.
-- Skrypt jest idempotentny — można go odpalić więcej niż raz.
-- =============================================================

-- ---------- 1. Kolumny zdarzeń (gorączka / koniec snu) ----------

alter table public.events add column if not exists fever_medication text;
alter table public.events add column if not exists end_time text;

-- posiłki BLW są zwykłym zdarzeniem zapisanym w dzienniku
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('milk', 'poop', 'drops', 'meal', 'custom'));

alter table public.activities drop constraint if exists activities_kind_check;
alter table public.activities add constraint activities_kind_check
  check (kind in ('milk', 'poop', 'drops', 'meal', 'custom'));

-- ---------- 2. Serie powtarzanych przypomnień ----------

alter table public.plans add column if not exists series_id text;
alter table public.plans add column if not exists series_time text;

-- ---------- 3. Historia wagi i wzrostu ----------

create table if not exists public.measurements (
  id text not null,
  child_id uuid not null references public.children (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  date text not null,
  weight_kg numeric,
  height_cm numeric,
  note text,
  author text,
  created_at timestamptz not null default now(),
  primary key (id, child_id),
  constraint measurements_values check (
    (weight_kg is not null and weight_kg > 0 and weight_kg < 60)
    or (height_cm is not null and height_cm > 0 and height_cm < 200)
  )
);

alter table public.measurements enable row level security;

drop policy if exists "measurements_member_select" on public.measurements;
create policy "measurements_member_select" on public.measurements
  for select using (child_id = public.current_member_child ());

drop policy if exists "measurements_member_write" on public.measurements;
create policy "measurements_member_write" on public.measurements
  for all using (
    child_id = public.current_member_child ()
    and public.current_member_role () in ('owner', 'member')
  ) with check (
    child_id = public.current_member_child ()
    and public.current_member_role () in ('owner', 'member')
  );

create index if not exists measurements_child_date_idx
  on public.measurements (child_id, date);

-- ---------- 4. Zmiana roli: konkretne komunikaty błędów ----------

create or replace function public.update_member_role (p_member_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
begin
  select m.child_id into v_child_id
  from public.members m
  where m.id::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-id', ''
  )
  and m.secret::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-secret', ''
  )
  and m.role = 'owner';

  if v_child_id is null then
    raise exception 'BRAK_UPRAWNIEN';
  end if;

  if p_new_role not in ('member', 'observer') then
    raise exception 'NIEZNANA_ROLA';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.child_id = v_child_id
  ) then
    raise exception 'NIE_ZNANY_CZLONEK';
  end if;

  if exists (
    select 1 from public.members m
    where m.id = p_member_id and m.role = 'owner'
  ) then
    raise exception 'NIE_MOZNA_ZMIENIC_OWNERA';
  end if;

  update public.members m
  set role = p_new_role
  where m.id = p_member_id
    and m.child_id = v_child_id;
end;
$$;

revoke all on function public.update_member_role (uuid, text) from public;
grant execute on function public.update_member_role (uuid, text) to anon, authenticated;

-- ---------- 5. Naprawa profilu bez właściciela ----------

create or replace function public.repair_member_role ()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_child_id uuid;
  v_owner_count integer;
  v_oldest_id uuid;
begin
  select m.id, m.child_id into v_member_id, v_child_id
  from public.members m
  where m.id::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-id', ''
  )
  and m.secret::text = coalesce(
    current_setting('request.headers', true)::json ->> 'x-member-secret', ''
  );

  if v_member_id is null then
    raise exception 'BRAK_SESJI';
  end if;

  select count(*) into v_owner_count
  from public.members m
  where m.child_id = v_child_id and m.role = 'owner';

  if v_owner_count > 0 then
    return 'JUZ_ISTNIE_WLASCICIEL';
  end if;

  select m.id into v_oldest_id
  from public.members m
  where m.child_id = v_child_id
  order by m.created_at asc, m.id asc
  limit 1;

  if v_oldest_id is distinct from v_member_id then
    return 'NIE_MOZNA_NAPRAWIC';
  end if;

  update public.members m
  set role = 'owner'
  where m.id = v_member_id;

  return 'NAPRAWIONO';
end;
$$;

revoke all on function public.repair_member_role () from public;
grant execute on function public.repair_member_role () to anon, authenticated;

-- ---------- 6. Logowanie e-mail: wszystkie dziecka z danego adresu ----------
-- Logowanie po e-mail musi znaleźć nie tylko właściciela, ale każdego
-- członka z tym adresem (np. mamę z rolą 'member').

create or replace function public.accounts_by_email (p_email text)
returns table (
  out_child_id uuid,
  out_child_name text,
  out_share_code text,
  out_member_id uuid,
  out_secret uuid,
  out_role text,
  out_member_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.share_code,
    m.id,
    m.secret,
    m.role,
    m.name
  from public.members m
  join public.children c on c.id = m.child_id
  where lower(m.email) = lower(trim(p_email))
    and m.email is not null
    and m.email <> ''
  order by (m.role = 'owner') desc, c.created_at desc;
$$;

revoke all on function public.accounts_by_email (text) from public;
grant execute on function public.accounts_by_email (text) to anon, authenticated;

-- ---------- 7. Dołączenie kodem nie daje roli właściciela ----------

create or replace function public.join_by_code (p_code text, p_name text, p_email text default null)
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

  -- Ponowne dołączenie: przywracamy istniejące konto zamiast tworzyć duplikat.
  if nullif(trim(p_email), '') is not null then
    select * into v_member
    from public.members m
    where m.child_id = v_child.id
      and lower(m.email) = lower(trim(p_email))
    order by m.created_at desc
    limit 1;
  end if;

  if v_member.id is null then
    select * into v_member
    from public.members m
    where m.child_id = v_child.id
      and m.name = trim(p_name)
      and (select count(*) from public.members m2
           where m2.child_id = v_child.id and m2.name = trim(p_name)) = 1
    limit 1;
  end if;

  if v_member.id is null then
    insert into public.members (child_id, name, role, email)
    values (v_child.id, trim(p_name), 'member', nullif(trim(p_email), ''))
    returning * into v_member;
  else
    -- Właścicielem może być tylko pierwszy członek profilu. Kto dołączył
    -- na kod (np. mama) zostaje opiekunem, nawet jeśli błędnie miał 'owner'.
    update public.members m
    set name = trim(p_name),
        email = coalesce(nullif(trim(p_email), ''), m.email),
        role = case
          when m.role = 'owner' and exists (
            select 1
            from public.members o
            where o.child_id = m.child_id
              and o.role = 'owner'
              and (o.created_at, o.id) < (m.created_at, m.id)
          ) then 'member'
          else m.role
        end
    where m.id = v_member.id
    returning * into v_member;
  end if;

  return query
    select v_child.id, v_child.name, v_member.id, v_member.secret;
end;
$$;

revoke all on function public.join_by_code (text, text, text) from public;
grant execute on function public.join_by_code (text, text, text) to anon, authenticated;

-- ---------- 8. Jedno dziecko = jeden rodzic (z raportem zmian) ----------

do $$
declare
  v_row record;
begin
  for v_row in
    select m.id, c.name as child_name, m.name as member_name, m.email
    from public.members m
    join public.children c on c.id = m.child_id
    where m.role = 'owner'
      and exists (
        select 1
        from public.members o
        where o.child_id = m.child_id
          and o.role = 'owner'
          and (o.created_at, o.id) < (m.created_at, m.id)
      )
  loop
    update public.members
    set role = 'member'
    where id = v_row.id;

    raise notice 'Naprawa roli: "%" (profil "%", e-mail: %) → opiekun',
      v_row.member_name,
      v_row.child_name,
      coalesce(v_row.email, 'brak');
  end loop;
end;
$$;

-- ---------- 9. Podsumowanie ----------
-- Wszystkie profile z więcej niż jednym właścicielem (po powyższej naprawie
-- lista powinna być pusta):

select c.id as child_id,
       c.name as child_name,
       count(*) as owners
from public.members m
join public.children c on c.id = m.child_id
where m.role = 'owner'
group by c.id, c.name
having count(*) > 1;
