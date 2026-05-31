-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK SQL — 아래 변경사항을 모두 되돌립니다
-- 생성일: 2026-05-31
-- 대상 프로젝트: metarichsignal-wise (wnffguwcipylmyymhwqb)
-- ════════════════════════════════════════════════════════════════════
-- 이 파일을 실행하면 supabase_apply.sql 의 모든 변경이 취소됩니다.
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ════════════════════════════════════════════════════════════════════

-- 1. role 동기화 트리거 제거
DROP TRIGGER IF EXISTS trg_sync_user_role ON public.users;
DROP FUNCTION IF EXISTS public.sync_user_role_columns();

-- 2. users 인덱스 제거
DROP INDEX IF EXISTS public.users_email_idx;
DROP INDEX IF EXISTS public.users_role_idx;
DROP INDEX IF EXISTS public.users_is_approved_idx;
DROP INDEX IF EXISTS public.users_headquarter_idx;

-- 3. customers 인덱스 제거
DROP INDEX IF EXISTS public.customers_advisor_id_idx;
DROP INDEX IF EXISTS public.customers_active_advisor_idx;

-- 확인
SELECT 'rollback_complete' as status;
