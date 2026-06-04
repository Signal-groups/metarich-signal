-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PDF 보장분석 제안서 기능 - 스키마 추가
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ─────────────────────────────────────────────────────────────────
-- 1. policies 테이블 누락 컬럼 추가
-- ─────────────────────────────────────────────────────────────────

-- 계약 상태 (정상/실효/해지/만기)
-- 기존 policyForm에 status 필드가 있지만 DB에 없는 경우를 대비
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_status TEXT DEFAULT 'active';
-- active(정상계약), lapsed(실효), cancelled(해지), expired(만기)

COMMENT ON COLUMN policies.policy_status IS '계약상태: active(정상), lapsed(실효), cancelled(해지), expired(만기)';

-- 납입기간 문자열 (GPT 파싱값 저장 + 수동입력 지원)
-- 예: "20년납", "전기납", "납입완료", "10년납"
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_period TEXT;

COMMENT ON COLUMN policies.payment_period IS '납입기간 (예: 20년납, 전기납, 납입완료)';

-- 만기연령 (종신/80세/100세 등)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS end_age TEXT;

COMMENT ON COLUMN policies.end_age IS '만기연령 (예: 종신, 80세, 100세)';

-- 납입 완료 총액 (원) - 도넛 차트용
ALTER TABLE policies ADD COLUMN IF NOT EXISTS paid_total BIGINT DEFAULT 0;

COMMENT ON COLUMN policies.paid_total IS '현재까지 납입 완료 총액 (원)';

-- 납입 예정 총액 (원) - 도넛 차트용
-- = monthly_premium × 총 납입횟수
-- GPT 분석 시 자동 계산해서 저장, 수동 입력도 가능
ALTER TABLE policies ADD COLUMN IF NOT EXISTS expected_total BIGINT DEFAULT 0;

COMMENT ON COLUMN policies.expected_total IS '납입 예정 총액 (원) = 월보험료 × 총 납입횟수';

-- 총 납입 횟수 (도넛 차트 + 보험현황표 용)
-- 예: 120회(10년납 월납), 240회(20년납 월납)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_count INTEGER;

COMMENT ON COLUMN policies.payment_count IS '총 납입 횟수 (예: 120, 240)';

-- 현재까지 납입 횟수 (납입률 계산용)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS paid_count INTEGER DEFAULT 0;

COMMENT ON COLUMN policies.paid_count IS '현재까지 납입한 횟수';


-- ─────────────────────────────────────────────────────────────────
-- 2. coverages 테이블 - 치매 카테고리 지원
--    (기존 category 컬럼에 'dementia' 값 허용 - 별도 변경 불필요)
--    단, 치매 관련 coverage_name 매핑을 위해 아래 확인만 필요
-- ─────────────────────────────────────────────────────────────────
-- 현재 coverages.category 허용값 확인용 (실행 후 결과 확인)
SELECT DISTINCT category FROM coverages ORDER BY category;


-- ─────────────────────────────────────────────────────────────────
-- 3. 권장금액 기준 테이블 (나이/성별별 권장보장금액)
--    PDF 보장분석 제안서에서 부족금액 계산 기준으로 사용
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coverage_recommendations (
  id           SERIAL PRIMARY KEY,
  coverage_key TEXT NOT NULL,         -- 담보 식별자 (예: cancer_general, brain_vascular)
  label        TEXT NOT NULL,         -- 표시명 (예: 일반암 진단비)
  age_min      INTEGER NOT NULL,      -- 적용 최소 나이
  age_max      INTEGER NOT NULL,      -- 적용 최대 나이
  gender       TEXT DEFAULT 'all',    -- 'M', 'F', 'all'
  amount       BIGINT NOT NULL,       -- 권장금액 (만원)
  category     TEXT NOT NULL,         -- 카테고리 (cancer/brain/heart/death/surgery/hospital/driver/etc)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE coverage_recommendations IS '담보별 권장금액 기준 (나이/성별별)';

-- 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_rec_key_age_gender
  ON coverage_recommendations(coverage_key, age_min, age_max, gender);

-- 기본 권장금액 데이터 삽입 (30~50대 기준, 만원 단위)
INSERT INTO coverage_recommendations (coverage_key, label, age_min, age_max, gender, amount, category) VALUES
-- 사망
('death_disease',   '질병사망',       20, 40,  'all', 10000, 'death'),
('death_disease',   '질병사망',       41, 60,  'all', 10000, 'death'),
('death_accident',  '상해사망',       20, 40,  'all', 20000, 'death'),
('death_accident',  '상해사망',       41, 60,  'all', 20000, 'death'),
-- 암 진단비
('cancer_general',  '일반암 진단비',   20, 40,  'all', 15000, 'cancer'),
('cancer_general',  '일반암 진단비',   41, 60,  'all', 15000, 'cancer'),
('cancer_similar',  '유사암 진단비',   20, 60,  'all',  3000, 'cancer'),
('cancer_combined', '통합암 진단비',   20, 60,  'all',  5000, 'cancer'),
-- 뇌혈관
('brain_vascular',  '뇌혈관질환 진단비', 20, 60, 'all', 5000, 'brain'),
('brain_stroke',    '뇌졸중 진단비',   20, 60,  'all',  5000, 'brain'),
('brain_bleed',     '뇌출혈 진단비',   20, 60,  'all',  1000, 'brain'),
-- 심장
('heart_mi',        '급성심근경색 진단비', 20, 60, 'all', 5000, 'heart'),
('heart_ischemic',  '허혈성심장질환 진단비', 20, 60, 'all', 5000, 'heart'),
('heart_vascular',  '심혈관질환 진단비', 20, 60, 'all', 5000, 'heart'),
-- 치매
('dementia_severe', '중증치매 진단비', 20, 60,  'all',  5000, 'dementia'),
('dementia_mild',   '경증치매 진단비', 20, 60,  'all',  2000, 'dementia'),
-- 암 치료비
('cancer_chemo',    '항암치료비(방사선/약물)', 20, 60, 'all', 500, 'cancer_treat'),
('cancer_targeted', '표적/면역 항암치료',      20, 60, 'all', 10000, 'cancer_treat'),
('cancer_major',    '암 주요치료비',           20, 60, 'all',  2000, 'cancer_treat'),
('brain_heart_major', '2대질환 주요치료비',    20, 60, 'all',  1000, 'brain'),
-- 수술비
('surgery_disease', '질병수술비',     20, 60,  'all',   500, 'surgery'),
('surgery_accident','상해수술비',     20, 60,  'all',  2000, 'surgery'),
('surgery_brain',   '뇌혈관수술비',   20, 60,  'all',  3000, 'surgery'),
('surgery_heart',   '심혈관수술비',   20, 60,  'all',  3000, 'surgery'),
-- 입원일당
('hosp_disease',    '질병입원일당',   20, 60,  'all',     3, 'hospital'),
('hosp_accident',   '상해입원일당',   20, 60,  'all',     3, 'hospital'),
('nursing_disease', '질병간병지원금', 20, 60,  'all',     1, 'hospital'),
-- 실손의료비 (한도 기준)
('silson_disease_hosp', '질병입원의료비(실손)', 20, 60, 'all', 5000, 'silson'),
('silson_disease_out',  '질병통원의료비(실손)', 20, 60, 'all',   30, 'silson'),
('silson_acc_hosp',     '상해입원의료비(실손)', 20, 60, 'all', 5000, 'silson'),
('silson_acc_out',      '상해통원의료비(실손)', 20, 60, 'all',   30, 'silson'),
-- 운전자
('driver_support',  '교통사고처리지원금', 20, 60, 'all', 20000, 'driver'),
('driver_lawyer',   '변호사선임비용',    20, 60, 'all',  5000, 'driver'),
('driver_fine',     '교통사고벌금',      20, 60, 'all',  3000, 'driver'),
('driver_injury',   '자동차부상치료비',  20, 60, 'all',   300, 'driver'),
-- 치아
('dental_implant',  '임플란트',   20, 60,  'all',   200, 'dental'),
('dental_crown',    '크라운',     20, 60,  'all',    50, 'dental'),
-- 후유장해
('disability_disease',  '질병후유장해(3%이상)', 20, 60, 'all', 5000, 'disability'),
('disability_accident', '상해후유장해(3%이상)', 20, 60, 'all', 10000, 'disability')
ON CONFLICT (coverage_key, age_min, age_max, gender) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────
-- 4. policies 테이블 - GPT 분석 결과 자동 업데이트 트리거
--    (paid_count를 월 기준으로 자동 계산하는 view)
-- ─────────────────────────────────────────────────────────────────

-- 납입 진행률 자동 계산 뷰 (도넛 차트용)
CREATE OR REPLACE VIEW policies_with_progress AS
SELECT
  p.*,
  -- 시작일~오늘까지 경과 개월 수 (현재 납입 횟수 추정)
  CASE
    WHEN p.paid_count > 0 THEN p.paid_count
    WHEN p.start_date IS NOT NULL THEN
      GREATEST(0,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.start_date::date)) * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.start_date::date))
      )::INTEGER
    ELSE 0
  END AS calc_paid_count,
  -- 납입 완료 총액 추정
  CASE
    WHEN p.paid_total > 0 THEN p.paid_total
    WHEN p.start_date IS NOT NULL AND p.monthly_premium > 0 THEN
      GREATEST(0,
        (EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.start_date::date)) * 12 +
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.start_date::date)))
      )::BIGINT * p.monthly_premium
    ELSE 0
  END AS calc_paid_total,
  -- 납입 예정 총액 추정
  CASE
    WHEN p.expected_total > 0 THEN p.expected_total
    WHEN p.payment_count IS NOT NULL AND p.monthly_premium > 0 THEN
      p.payment_count::BIGINT * p.monthly_premium
    ELSE 0
  END AS calc_expected_total
FROM policies p;

COMMENT ON VIEW policies_with_progress IS '납입 진행률 자동 계산 뷰 (PDF 도넛 차트용)';


-- ─────────────────────────────────────────────────────────────────
-- 5. 현재 policies 컬럼 확인 (실행 후 결과 확인)
-- ─────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'policies'
ORDER BY ordinal_position;
