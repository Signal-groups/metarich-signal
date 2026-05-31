-- ════════════════════════════════════════════════════════════════════
-- insurance-manager Supabase 정리 / 안정화 SQL
-- Supabase 대시보드 > SQL Editor 에서 순서대로 실행하세요.
-- 각 섹션을 독립적으로 실행할 수 있습니다.
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- SECTION 1. users 테이블 정리
-- ────────────────────────────────────────────────────────────────────
-- 문제: role / role_level / rank 세 컬럼이 동일한 역할 정보를 중복 저장
--       headquarter + headquarter_name, department + department_name,
--       team + branch_name 도 동일 값 이중 저장
-- 조치: 중복 컬럼은 삭제하지 않고 동기화 트리거로 일관성 유지
--       (코드가 세 컬럼을 모두 읽기 때문에 즉시 삭제 불가)
--       신규 유료 기능 권한 컬럼 추가
-- ────────────────────────────────────────────────────────────────────

-- 1-1. 유료 기능 권한 컬럼 추가 (없으면 추가, 있으면 무시)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS office_access   boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS claim_access    boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branding_access boolean NOT NULL DEFAULT false;
-- crm_access는 이미 존재하므로 DEFAULT만 안전하게 보정
ALTER TABLE public.users ALTER COLUMN crm_access SET DEFAULT false;

-- 1-2. 역할 중복 컬럼 동기화 트리거
--      role 변경 시 role_level / rank 도 자동 동기화 → 불일치 방지
CREATE OR REPLACE FUNCTION public.sync_user_role_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- role → rank 동기화
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.rank := NEW.role;
    NEW.role_level := CASE NEW.role
      WHEN 'headquarters' THEN 'headquarters'
      WHEN 'leader'       THEN 'director'
      WHEN 'master'       THEN 'master'
      ELSE NEW.role
    END;
  END IF;
  -- 조직 중복 컬럼 동기화
  NEW.headquarter_name := COALESCE(NEW.headquarter, NEW.headquarter_name, '');
  NEW.department_name  := COALESCE(NEW.department,  NEW.department_name,  '');
  NEW.branch_name      := COALESCE(NEW.team,         NEW.branch_name,      '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role ON public.users;
CREATE TRIGGER trg_sync_user_role
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_columns();

-- 1-3. 기존 데이터 일괄 동기화 (트리거 생성 후 1회만 실행)
UPDATE public.users SET
  rank          = role,
  role_level    = CASE role
    WHEN 'headquarters' THEN 'headquarters'
    WHEN 'leader'       THEN 'director'
    WHEN 'master'       THEN 'master'
    ELSE role END,
  headquarter_name = COALESCE(headquarter, headquarter_name, ''),
  department_name  = COALESCE(department,  department_name,  ''),
  branch_name      = COALESCE(team,        branch_name,      '')
WHERE
  rank IS DISTINCT FROM role
  OR headquarter_name IS DISTINCT FROM COALESCE(headquarter, '')
  OR department_name  IS DISTINCT FROM COALESCE(department,  '')
  OR branch_name      IS DISTINCT FROM COALESCE(team,        '');

-- 1-4. users 인덱스 (없으면 생성)
CREATE INDEX IF NOT EXISTS users_email_idx      ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx       ON public.users(role);
CREATE INDEX IF NOT EXISTS users_approved_idx   ON public.users(is_approved);
CREATE INDEX IF NOT EXISTS users_headquarter_idx ON public.users(headquarter);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 2. daily_perf 테이블 안정화
-- ────────────────────────────────────────────────────────────────────
-- 문제: upsert ON CONFLICT 'user_id, date' 사용 중인데
--       UNIQUE 제약이 없으면 upsert가 insert로 동작 → 중복 행 발생 가능
-- ────────────────────────────────────────────────────────────────────

-- 2-1. 중복 행 제거 (같은 user_id+date 중 가장 최근 것만 남김)
DELETE FROM public.daily_perf
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.daily_perf
  ORDER BY user_id, date, created_at DESC NULLS LAST
);

-- 2-2. UNIQUE 제약 추가
ALTER TABLE public.daily_perf
  DROP CONSTRAINT IF EXISTS daily_perf_user_date_unique;
ALTER TABLE public.daily_perf
  ADD CONSTRAINT daily_perf_user_date_unique UNIQUE (user_id, date);

-- 2-3. 인덱스
CREATE INDEX IF NOT EXISTS daily_perf_user_id_idx ON public.daily_perf(user_id);
CREATE INDEX IF NOT EXISTS daily_perf_date_idx    ON public.daily_perf(date);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 3. departments / branches 테이블 안정화
-- ────────────────────────────────────────────────────────────────────
-- 문제: upsert ON CONFLICT 'name' / 'dept_name,name' 사용 중인데
--       UNIQUE 제약 없으면 동일 문제 발생
-- ────────────────────────────────────────────────────────────────────

-- 3-1. departments: name 중복 제거 후 UNIQUE
DELETE FROM public.departments
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM public.departments
  ORDER BY name, created_at DESC NULLS LAST
);

ALTER TABLE public.departments
  DROP CONSTRAINT IF EXISTS departments_name_unique;
ALTER TABLE public.departments
  ADD CONSTRAINT departments_name_unique UNIQUE (name);

-- 3-2. branches: (dept_name, name) 중복 제거 후 UNIQUE
DELETE FROM public.branches
WHERE id NOT IN (
  SELECT DISTINCT ON (dept_name, name) id
  FROM public.branches
  ORDER BY dept_name, name, created_at DESC NULLS LAST
);

ALTER TABLE public.branches
  DROP CONSTRAINT IF EXISTS branches_dept_name_unique;
ALTER TABLE public.branches
  ADD CONSTRAINT branches_dept_name_unique UNIQUE (dept_name, name);

CREATE INDEX IF NOT EXISTS branches_dept_name_idx ON public.branches(dept_name);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 4. customers 테이블 인덱스 / 소프트 삭제 안정화
-- ────────────────────────────────────────────────────────────────────
-- 문제: deleted_at IS NULL 필터를 자주 쓰는데 인덱스 없음
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS customers_advisor_id_idx   ON public.customers(advisor_id);
CREATE INDEX IF NOT EXISTS customers_deleted_at_idx   ON public.customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customers_advisor_active_idx ON public.customers(advisor_id) WHERE deleted_at IS NULL;


-- ────────────────────────────────────────────────────────────────────
-- SECTION 5. team_settings 테이블 안정화
-- ────────────────────────────────────────────────────────────────────
-- 문제: upsert ON CONFLICT 'key' 사용 중인데 UNIQUE 없으면 중복 발생
-- ────────────────────────────────────────────────────────────────────

-- 5-1. 중복 key 제거 (최신 것 유지)
DELETE FROM public.team_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (key) id
  FROM public.team_settings
  ORDER BY key, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- 5-2. UNIQUE 제약
ALTER TABLE public.team_settings
  DROP CONSTRAINT IF EXISTS team_settings_key_unique;
ALTER TABLE public.team_settings
  ADD CONSTRAINT team_settings_key_unique UNIQUE (key);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 6. claim_simulations 테이블 생성 (없을 경우)
-- ────────────────────────────────────────────────────────────────────
-- 코드에서 사용하지만 생성 SQL이 없음

CREATE TABLE IF NOT EXISTS public.claim_simulations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  surgery_name         text,
  hospitalization_days integer DEFAULT 0,
  results              jsonb,
  total_amount         numeric DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_simulations_customer_idx
  ON public.claim_simulations(customer_id);

ALTER TABLE public.claim_simulations ENABLE ROW LEVEL SECURITY;

-- RLS: 본인 고객의 시뮬레이션만 접근 (advisor_id 기준)
DROP POLICY IF EXISTS claim_simulations_select_own ON public.claim_simulations;
CREATE POLICY claim_simulations_select_own
  ON public.claim_simulations FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE advisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS claim_simulations_insert_own ON public.claim_simulations;
CREATE POLICY claim_simulations_insert_own
  ON public.claim_simulations FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE advisor_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────────────
-- SECTION 7. dm_logs 테이블 생성 (없을 경우)
-- ────────────────────────────────────────────────────────────────────
-- 코드에서 사용하지만 생성 SQL이 없음

CREATE TABLE IF NOT EXISTS public.dm_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.dm_templates(id) ON DELETE SET NULL,
  content     text,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_logs_advisor_idx   ON public.dm_logs(advisor_id);
CREATE INDEX IF NOT EXISTS dm_logs_sent_at_idx   ON public.dm_logs(sent_at DESC);

ALTER TABLE public.dm_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_logs_select_own ON public.dm_logs;
CREATE POLICY dm_logs_select_own
  ON public.dm_logs FOR SELECT USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS dm_logs_insert_own ON public.dm_logs;
CREATE POLICY dm_logs_insert_own
  ON public.dm_logs FOR INSERT WITH CHECK (auth.uid() = advisor_id);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 8. notifications 인덱스 추가
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS notifications_customer_id_idx ON public.notifications(customer_id);
CREATE INDEX IF NOT EXISTS notifications_due_date_idx    ON public.notifications(due_date);
CREATE INDEX IF NOT EXISTS notifications_is_done_idx     ON public.notifications(is_done) WHERE is_done = false;


-- ────────────────────────────────────────────────────────────────────
-- SECTION 9. 확인 쿼리 (실행 후 결과 검토)
-- ────────────────────────────────────────────────────────────────────

-- users 컬럼 목록 확인
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- daily_perf 중복 여부 확인 (0건이어야 정상)
SELECT user_id, date, COUNT(*) as cnt
FROM public.daily_perf
GROUP BY user_id, date
HAVING COUNT(*) > 1;

-- team_settings 중복 여부 확인 (0건이어야 정상)
SELECT key, COUNT(*) as cnt
FROM public.team_settings
GROUP BY key
HAVING COUNT(*) > 1;

-- users 역할 불일치 확인 (0건이어야 정상)
SELECT id, email, role, rank, role_level
FROM public.users
WHERE role IS DISTINCT FROM rank
   OR headquarter IS DISTINCT FROM headquarter_name
   OR department  IS DISTINCT FROM department_name
LIMIT 20;
