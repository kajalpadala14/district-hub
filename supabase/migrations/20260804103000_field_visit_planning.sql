create extension if not exists pgcrypto;

create table if not exists public.field_visit_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  administrative_unit text not null default 'District',
  block_name text not null,
  gp_name text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_legacy boolean not null default false,
  priority_score integer not null default 50 check (priority_score >= 0 and priority_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, administrative_unit, block_name, gp_name)
);

create table if not exists public.field_visit_records (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.field_visit_units(id) on delete cascade,
  visited_on date not null,
  status text not null default 'visited' check (status in ('visited', 'legacy')),
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.field_visit_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  plan_date date not null,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_visit_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.field_visit_plans(id) on delete cascade,
  unit_id uuid not null references public.field_visit_units(id) on delete cascade,
  route_order integer not null default 1,
  assigned_to uuid references public.profiles(id) on delete set null,
  message text,
  created_at timestamptz not null default now(),
  unique (plan_id, unit_id)
);

create index if not exists idx_field_visit_units_owner on public.field_visit_units(owner_id);
create index if not exists idx_field_visit_units_admin_block on public.field_visit_units(administrative_unit, block_name);
create index if not exists idx_field_visit_units_location on public.field_visit_units(latitude, longitude);
create index if not exists idx_field_visit_records_unit_date on public.field_visit_records(unit_id, visited_on desc);
create index if not exists idx_field_visit_records_recorded_by on public.field_visit_records(recorded_by);
create index if not exists idx_field_visit_plans_owner_date on public.field_visit_plans(owner_id, plan_date desc);
create index if not exists idx_field_visit_plan_items_plan_order on public.field_visit_plan_items(plan_id, route_order);

create or replace function public.touch_field_visit_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_field_visit_units_updated_at on public.field_visit_units;
create trigger trg_field_visit_units_updated_at
before update on public.field_visit_units
for each row execute function public.touch_field_visit_updated_at();

drop trigger if exists trg_field_visit_plans_updated_at on public.field_visit_plans;
create trigger trg_field_visit_plans_updated_at
before update on public.field_visit_plans
for each row execute function public.touch_field_visit_updated_at();

alter table public.field_visit_units enable row level security;
alter table public.field_visit_records enable row level security;
alter table public.field_visit_plans enable row level security;
alter table public.field_visit_plan_items enable row level security;

drop policy if exists "Users can read their field visit units" on public.field_visit_units;
create policy "Users can read their field visit units"
on public.field_visit_units for select
to authenticated
using (owner_id = auth.uid() or owner_id is null or public.has_any_role(auth.uid(), array['admin', 'manager']));

drop policy if exists "Users can manage their field visit units" on public.field_visit_units;
create policy "Users can manage their field visit units"
on public.field_visit_units for all
to authenticated
using (owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']))
with check (owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']));

drop policy if exists "Users can read allowed field visit records" on public.field_visit_records;
create policy "Users can read allowed field visit records"
on public.field_visit_records for select
to authenticated
using (
  exists (
    select 1 from public.field_visit_units u
    where u.id = unit_id
      and (u.owner_id = auth.uid() or u.owner_id is null or public.has_any_role(auth.uid(), array['admin', 'manager']))
  )
);

drop policy if exists "Users can manage allowed field visit records" on public.field_visit_records;
create policy "Users can manage allowed field visit records"
on public.field_visit_records for all
to authenticated
using (
  recorded_by = auth.uid()
  or public.has_any_role(auth.uid(), array['admin', 'manager'])
  or exists (
    select 1 from public.field_visit_units u
    where u.id = unit_id and u.owner_id = auth.uid()
  )
)
with check (
  recorded_by = auth.uid()
  or public.has_any_role(auth.uid(), array['admin', 'manager'])
  or exists (
    select 1 from public.field_visit_units u
    where u.id = unit_id and u.owner_id = auth.uid()
  )
);

drop policy if exists "Users can manage own field visit plans" on public.field_visit_plans;
create policy "Users can manage own field visit plans"
on public.field_visit_plans for all
to authenticated
using (owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']))
with check (owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']));

drop policy if exists "Users can manage allowed field visit plan items" on public.field_visit_plan_items;
create policy "Users can manage allowed field visit plan items"
on public.field_visit_plan_items for all
to authenticated
using (
  exists (
    select 1 from public.field_visit_plans p
    where p.id = plan_id
      and (p.owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']))
  )
)
with check (
  exists (
    select 1 from public.field_visit_plans p
    where p.id = plan_id
      and (p.owner_id = auth.uid() or public.has_any_role(auth.uid(), array['admin', 'manager']))
  )
);
