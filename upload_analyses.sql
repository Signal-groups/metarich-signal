-- GPTs 보장분석 결과 영구 저장용
-- Supabase SQL Editor에서 전체 실행하세요.

create table if not exists public.upload_analyses (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  customer_name text,
  file_name text,
  summary text,
  structured_json jsonb not null,
  source text not null default 'gpts',
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upload_analyses_advisor_idx on public.upload_analyses(advisor_id);
create index if not exists upload_analyses_customer_idx on public.upload_analyses(customer_id);
create index if not exists upload_analyses_created_idx on public.upload_analyses(created_at desc);

alter table public.upload_analyses enable row level security;

drop policy if exists upload_analyses_select_own on public.upload_analyses;
drop policy if exists upload_analyses_insert_own on public.upload_analyses;
drop policy if exists upload_analyses_update_own on public.upload_analyses;
drop policy if exists upload_analyses_delete_own on public.upload_analyses;

create policy upload_analyses_select_own
on public.upload_analyses
for select
using (advisor_id = auth.uid());

create policy upload_analyses_insert_own
on public.upload_analyses
for insert
with check (advisor_id = auth.uid());

create policy upload_analyses_update_own
on public.upload_analyses
for update
using (advisor_id = auth.uid())
with check (advisor_id = auth.uid());

create policy upload_analyses_delete_own
on public.upload_analyses
for delete
using (advisor_id = auth.uid());

-- GPTs 분석 내용을 회사/담보별 화면과 엑셀 출력에서 재사용하기 위한 보조 컬럼
alter table public.policies add column if not exists advisor_id uuid references auth.users(id) on delete cascade;
alter table public.policies add column if not exists analysis_id uuid references public.upload_analyses(id) on delete set null;
alter table public.policies add column if not exists source_type text not null default 'manual';
alter table public.policies add column if not exists payment_period text;
alter table public.policies add column if not exists maturity_age integer;
alter table public.policies add column if not exists paid_premium_total numeric;
alter table public.policies add column if not exists remaining_premium_total numeric;

update public.policies p
set advisor_id = c.advisor_id
from public.customers c
where p.customer_id = c.id
  and p.advisor_id is null;

create index if not exists policies_customer_idx on public.policies(customer_id);
create index if not exists policies_advisor_idx on public.policies(advisor_id);
create index if not exists policies_analysis_idx on public.policies(analysis_id);

alter table public.coverages add column if not exists advisor_id uuid references auth.users(id) on delete cascade;
alter table public.coverages add column if not exists analysis_id uuid references public.upload_analyses(id) on delete set null;
alter table public.coverages add column if not exists source_type text not null default 'manual';
alter table public.coverages add column if not exists company text;
alter table public.coverages add column if not exists product_name text;
alter table public.coverages add column if not exists coverage_type text;
alter table public.coverages add column if not exists renewal_type text;
alter table public.coverages add column if not exists payment_method_type text;

update public.coverages cv
set advisor_id = c.advisor_id
from public.customers c
where cv.customer_id = c.id
  and cv.advisor_id is null;

create index if not exists coverages_customer_idx on public.coverages(customer_id);
create index if not exists coverages_advisor_idx on public.coverages(advisor_id);
create index if not exists coverages_policy_idx on public.coverages(policy_id);
create index if not exists coverages_analysis_idx on public.coverages(analysis_id);

-- 고객별 분리 보안을 DB 레벨에서도 유지합니다.
alter table public.policies enable row level security;
alter table public.coverages enable row level security;

drop policy if exists policies_select_own on public.policies;
drop policy if exists policies_insert_own on public.policies;
drop policy if exists policies_update_own on public.policies;
drop policy if exists policies_delete_own on public.policies;

create policy policies_select_own
on public.policies
for select
using (
  exists (
    select 1 from public.customers c
    where c.id = policies.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy policies_insert_own
on public.policies
for insert
with check (
  exists (
    select 1 from public.customers c
    where c.id = policies.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy policies_update_own
on public.policies
for update
using (
  exists (
    select 1 from public.customers c
    where c.id = policies.customer_id
      and c.advisor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.customers c
    where c.id = policies.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy policies_delete_own
on public.policies
for delete
using (
  exists (
    select 1 from public.customers c
    where c.id = policies.customer_id
      and c.advisor_id = auth.uid()
  )
);

drop policy if exists coverages_select_own on public.coverages;
drop policy if exists coverages_insert_own on public.coverages;
drop policy if exists coverages_update_own on public.coverages;
drop policy if exists coverages_delete_own on public.coverages;

create policy coverages_select_own
on public.coverages
for select
using (
  exists (
    select 1 from public.customers c
    where c.id = coverages.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy coverages_insert_own
on public.coverages
for insert
with check (
  exists (
    select 1 from public.customers c
    where c.id = coverages.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy coverages_update_own
on public.coverages
for update
using (
  exists (
    select 1 from public.customers c
    where c.id = coverages.customer_id
      and c.advisor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.customers c
    where c.id = coverages.customer_id
      and c.advisor_id = auth.uid()
  )
);

create policy coverages_delete_own
on public.coverages
for delete
using (
  exists (
    select 1 from public.customers c
    where c.id = coverages.customer_id
      and c.advisor_id = auth.uid()
  )
);
