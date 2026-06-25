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

-- 서비스 이용 등급: guest / general / pro / premium / event
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_level text DEFAULT 'guest';

-- 이벤트 프리미엄 만료일. 만료되면 앱에서 일반 등급으로 자동 정리
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

-- 회원 접속/활용내역 기록 테이블
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  page text,
  page_label text,
  action text DEFAULT 'page_view',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);

-- 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('crm_access', 'office_access', 'claim_access', 'branding_access', 'service_level', 'premium_expires_at')
ORDER BY column_name;
