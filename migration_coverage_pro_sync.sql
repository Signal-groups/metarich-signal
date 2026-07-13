-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 보장분석 PRO → CRM 동기화를 위한 스키마 추가
-- Supabase 대시보드 > SQL Editor에서 실행
-- 작성일: 2026-07-14
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─────────────────────────────────────────────────────────────────
-- 1. policies 테이블 누락 컬럼 추가
-- ─────────────────────────────────────────────────────────────────

-- 담당 설계사 ID (RLS 직접 조회 및 필터 최적화용)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_policies_advisor_id ON policies(advisor_id);

-- 계약 상태 (policy_status — 기존 status 컬럼과 별도)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_status TEXT DEFAULT 'active';
-- active(정상), lapsed(실효), cancelled(해지), expired(만기)

-- 납입기간 문자열 (예: "20년납", "전기납", "납입완료")
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_period TEXT;

-- 만기연령 — 정수형 (예: 80, 100; 종신은 NULL)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS maturity_age INTEGER;

-- 갱신형 여부
ALTER TABLE policies ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────
-- 2. notifications 테이블 — 제목 컬럼 추가
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 3. customers 테이블 — 계약 건수 캐시 컬럼 추가
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE customers ADD COLUMN IF NOT EXISTS policy_count INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────
-- 4. 기존 coverage_pro 동기화 데이터에 advisor_id 채우기
--    (syncProToCRM이 advisor_id를 넣기 전에 저장된 데이터 보정)
-- ─────────────────────────────────────────────────────────────────

UPDATE policies p
SET advisor_id = c.advisor_id
FROM customers c
WHERE p.customer_id = c.id
  AND p.advisor_id IS NULL
  AND p.source_type = 'coverage_pro';

-- ─────────────────────────────────────────────────────────────────
-- 5. 확인 쿼리 (실행 후 결과 확인)
-- ─────────────────────────────────────────────────────────────────

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'policies'
  AND column_name IN ('advisor_id', 'policy_status', 'payment_period', 'maturity_age', 'is_renewable')
ORDER BY column_name;
