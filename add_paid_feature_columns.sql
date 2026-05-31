-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 유료 기능 접근 권한 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 사무실 업무 탭 접근 권한
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_access boolean DEFAULT false;

-- AI 자동화 청구 접근 권한
ALTER TABLE users ADD COLUMN IF NOT EXISTS claim_access boolean DEFAULT false;

-- 설계사 브랜딩 AI 접근 권한
ALTER TABLE users ADD COLUMN IF NOT EXISTS branding_access boolean DEFAULT false;

-- crm_access는 이미 존재하므로 생략
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_access boolean DEFAULT false;

-- 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('crm_access', 'office_access', 'claim_access', 'branding_access')
ORDER BY column_name;
