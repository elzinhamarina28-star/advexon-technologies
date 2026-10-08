create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, company_name text, segment text, team_size text, main_goal text,
  email_notifications boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  answers jsonb not null, score int not null check (score between 0 and 100),
  classification text not null, categories jsonb not null, first_agent text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.diagnostics to authenticated;
grant all on public.diagnostics to service_role;
alter table public.diagnostics enable row level security;
create policy "own diag select" on public.diagnostics for select to authenticated using (auth.uid() = user_id);
create policy "own diag insert" on public.diagnostics for insert to authenticated with check (auth.uid() = user_id);
create policy "own diag delete" on public.diagnostics for delete to authenticated using (auth.uid() = user_id);
create index on public.diagnostics (user_id, created_at desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, name text not null, contact text, value numeric(12,2),
  stage text not null default 'novo' check (stage in ('novo','qualificado','proposta','ganho','perdido')),
  next_action text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.opportunities to authenticated;
grant all on public.opportunities to service_role;
alter table public.opportunities enable row level security;
create policy "own opp all" on public.opportunities for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null, due_date date,
  done boolean not null default false, created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "own task all" on public.tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entitlement source of truth. Written ONLY by the backend (future verified Kiwify webhook); clients can only read.
create table public.subscriptions (
  user_id uuid primary key,
  plan_id text check (plan_id in ('start','growth','pro')),
  status text not null default 'inactive' check (status in ('inactive','pending','active','past_due','canceled','expired','refunded')),
  provider text, provider_customer_id text, provider_subscription_id text,
  current_period_end timestamptz, updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own sub select" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

-- Idempotency log for future payment webhooks (service role only).
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null, provider_event_id text not null, event_type text not null,
  user_id uuid, payload jsonb not null, processed_at timestamptz,
  created_at timestamptz not null default now(), unique (provider, provider_event_id)
);
grant all on public.billing_events to service_role;
alter table public.billing_events enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();