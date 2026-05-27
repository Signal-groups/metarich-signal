create table if not exists public.dm_content_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  content_text text,
  created_at timestamptz not null default now()
);

create index if not exists dm_content_usage_logs_user_type_idx
  on public.dm_content_usage_logs (user_id, content_type, created_at desc);

alter table public.dm_content_usage_logs enable row level security;

drop policy if exists "dm_content_usage_logs_select_own" on public.dm_content_usage_logs;
create policy "dm_content_usage_logs_select_own"
  on public.dm_content_usage_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "dm_content_usage_logs_insert_own" on public.dm_content_usage_logs;
create policy "dm_content_usage_logs_insert_own"
  on public.dm_content_usage_logs
  for insert
  with check (auth.uid() = user_id);
