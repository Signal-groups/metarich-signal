// lib/insurance/data/diagnosis-db.ts
// 출처: KB 금쪽같은(별표17·22·23·24·48·49) — KCD 9차 개정 기준 (2026.1.1. 시행)

import type { DiagnosisItem } from './types'

// ─────────────────────────────────────────────────────────
// KCD 코드 범위 → 개별 코드 매핑 헬퍼
// ─────────────────────────────────────────────────────────
export const DIAGNOSIS_DB: DiagnosisItem[] = [

  // ══════════════════════════════════════════════════
  // 1. 암 (악성신생물) — 별표22
  // ══════════════════════════════════════════════════

  { id: 'd-c00', kcd_code: 'C00', kcd_name: '입술의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서(KCD코드 명기)'], required_tests: ['조직검사(생검)', '영상검사(CT/MRI)'], sources: ['KB'] },
  { id: 'd-c01', kcd_code: 'C01-C02', kcd_name: '혀의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c03', kcd_code: 'C03-C06', kcd_name: '구강의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c07', kcd_code: 'C07-C08', kcd_name: '침샘의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', '영상검사'], sources: ['KB'] },
  { id: 'd-c09', kcd_code: 'C09-C10', kcd_name: '편도·구인두의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', '내시경'], sources: ['KB'] },
  { id: 'd-c11', kcd_code: 'C11', kcd_name: '비인두의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', '내시경', 'MRI'], sources: ['KB'] },
  { id: 'd-c12', kcd_code: 'C12-C13', kcd_name: '하인두의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', '내시경'], sources: ['KB'] },
  { id: 'd-c14', kcd_code: 'C14', kcd_name: '기타 및 상세불명의 입술·구강·인두의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c15', kcd_code: 'C15', kcd_name: '식도의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['내시경', '조직검사', 'CT'], sources: ['KB'] },
  { id: 'd-c16', kcd_code: 'C16', kcd_name: '위의 악성신생물 (위암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['위내시경', '조직검사', 'CT'], sources: ['KB'], notes: '위암 — 가장 빈번한 암종 중 하나' },
  { id: 'd-c17', kcd_code: 'C17', kcd_name: '소장의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', 'CT', '캡슐내시경'], sources: ['KB'] },
  { id: 'd-c18', kcd_code: 'C18', kcd_name: '결장의 악성신생물 (대장암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['대장내시경', '조직검사', 'CT'], sources: ['KB'] },
  { id: 'd-c19', kcd_code: 'C19-C20', kcd_name: '직장의 악성신생물 (직장암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['대장내시경', '조직검사', 'CT/MRI'], sources: ['KB'] },
  { id: 'd-c21', kcd_code: 'C21', kcd_name: '항문 및 항문관의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c22', kcd_code: 'C22', kcd_name: '간 및 간내 담관의 악성신생물 (간암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지 또는 영상진단', '진단서', 'AFP 등 종양표지자'], required_tests: ['복부초음파', 'CT/MRI', '조직검사(필요시)'], sources: ['KB'], notes: '간암은 영상진단+종양표지자로 확진 가능 (조직검사 없이 가능한 경우 있음)' },
  { id: 'd-c23', kcd_code: 'C23-C24', kcd_name: '담낭 및 담도의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', 'CT/MRI', '조직검사'], sources: ['KB'] },
  { id: 'd-c25', kcd_code: 'C25', kcd_name: '췌장의 악성신생물 (췌장암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['CT/MRI', 'ERCP', '조직검사'], sources: ['KB'] },
  { id: 'd-c26', kcd_code: 'C26', kcd_name: '기타 및 상세불명의 소화기관의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c30', kcd_code: 'C30-C31', kcd_name: '비강·부비동의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['내시경', 'CT/MRI', '조직검사'], sources: ['KB'] },
  { id: 'd-c32', kcd_code: 'C32', kcd_name: '후두의 악성신생물 (후두암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['후두경', '조직검사', 'CT'], sources: ['KB'] },
  { id: 'd-c33', kcd_code: 'C33-C34', kcd_name: '기관 및 폐의 악성신생물 (폐암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['흉부CT', '기관지내시경', '조직검사', 'PET-CT'], sources: ['KB'] },
  { id: 'd-c37', kcd_code: 'C37-C39', kcd_name: '흉선·심장·종격·흉막의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['CT/MRI', '조직검사'], sources: ['KB'] },
  { id: 'd-c40', kcd_code: 'C40-C41', kcd_name: '골 및 관절연골의 악성신생물 (골육종)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['X-ray', 'MRI', '골생검'], sources: ['KB'] },
  { id: 'd-c43', kcd_code: 'C43', kcd_name: '피부의 악성흑색종', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['피부생검', '조직검사'], sources: ['KB'], notes: '⚠️ C44(기타피부암)와 구분 — 흑색종(C43)은 일반암, 기타피부암(C44)은 유사암' },
  { id: 'd-c44', kcd_code: 'C44', kcd_name: '기타 피부의 악성신생물 (기타피부암)', category: 'cancer_skin', sub_type: '유사암(기타피부암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['피부생검', '조직검사'], sources: ['KB'], notes: '⚠️ 유사암 분류 — 암진단비의 10~20% 지급이 일반적. 상품별 확인 필요' },
  { id: 'd-c45', kcd_code: 'C45-C49', kcd_name: '중피성 및 연조직의 악성신생물 (악성중피종·연부조직육종)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['CT/MRI', '조직검사'], sources: ['KB'] },
  { id: 'd-c50', kcd_code: 'C50', kcd_name: '유방의 악성신생물 (유방암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['유방초음파', '유방촬영술(맘모그래피)', '조직검사(코어생검/침생검)'], sources: ['KB'] },
  { id: 'd-c51', kcd_code: 'C51', kcd_name: '외음부의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c52', kcd_code: 'C52', kcd_name: '질의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사', '질확대경'], sources: ['KB'] },
  { id: 'd-c53', kcd_code: 'C53', kcd_name: '자궁경부의 악성신생물 (자궁경부암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['자궁경부세포검사(팹스미어)', '질확대경', '조직생검', 'HPV검사'], sources: ['KB'] },
  { id: 'd-c54', kcd_code: 'C54', kcd_name: '자궁체부의 악성신생물 (자궁내막암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['자궁내막생검', '초음파', 'CT/MRI'], sources: ['KB'] },
  { id: 'd-c55', kcd_code: 'C55', kcd_name: '상세불명의 자궁 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c56', kcd_code: 'C56', kcd_name: '난소의 악성신생물 (난소암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', 'CT/MRI', 'CA-125', '수술 후 조직검사'], sources: ['KB'] },
  { id: 'd-c57', kcd_code: 'C57-C58', kcd_name: '기타 여성 생식기관의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c60', kcd_code: 'C60', kcd_name: '음경의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c61', kcd_code: 'C61', kcd_name: '전립선의 악성신생물 (전립선암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['PSA(전립선특이항원)', '직장수지검사', '전립선생검', 'MRI'], sources: ['KB'] },
  { id: 'd-c62', kcd_code: 'C62', kcd_name: '고환의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', '종양표지자(AFP·HCG)', '수술 후 조직검사'], sources: ['KB'] },
  { id: 'd-c63', kcd_code: 'C63', kcd_name: '기타 및 상세불명의 남성 생식기관의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c64', kcd_code: 'C64', kcd_name: '신장의 악성신생물 (신장암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지 또는 영상진단', '진단서'], required_tests: ['복부CT/MRI', '조직검사(필요시)'], sources: ['KB'] },
  { id: 'd-c65', kcd_code: 'C65-C66', kcd_name: '신우·요관의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['요세포검사', 'CT', '요관경', '조직검사'], sources: ['KB'] },
  { id: 'd-c67', kcd_code: 'C67', kcd_name: '방광의 악성신생물 (방광암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['요세포검사', '방광경', '조직생검'], sources: ['KB'] },
  { id: 'd-c68', kcd_code: 'C68', kcd_name: '기타 및 상세불명의 요로의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-c69', kcd_code: 'C69', kcd_name: '눈 및 눈부속기의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['안과검사', '조직검사', 'MRI'], sources: ['KB'] },
  { id: 'd-c70', kcd_code: 'C70', kcd_name: '뇌수막의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['MRI', '조직검사(수술 중)'], sources: ['KB'] },
  { id: 'd-c71', kcd_code: 'C71', kcd_name: '뇌의 악성신생물 (뇌암)', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['뇌MRI', '조직검사(수술 중)'], sources: ['KB'] },
  { id: 'd-c72', kcd_code: 'C72', kcd_name: '척수·뇌신경 및 CNS의 기타부분의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['MRI', '조직검사'], sources: ['KB'] },
  { id: 'd-c73', kcd_code: 'C73', kcd_name: '갑상선의 악성신생물 (갑상선암)', category: 'cancer_thyroid', sub_type: '유사암(갑상선암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['갑상선초음파', '미세침흡인세포검사(FNAC)', '조직검사'], sources: ['KB'], notes: '⚠️ 유사암 분류 — 암진단비의 10~20% 지급이 일반적. 상품별 확인 필요' },
  { id: 'd-c74', kcd_code: 'C74-C75', kcd_name: '부신 및 기타 내분비선의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['CT/MRI', '호르몬검사', '조직검사'], sources: ['KB'] },
  { id: 'd-c76', kcd_code: 'C76-C80', kcd_name: '불명확·이차성·상세불명 부위의 악성신생물 (전이암)', category: 'cancer', sub_type: '일반암(전이암)', required_docs: ['병리조직검사 결과지', '진단서', '원발암 진단 관련 서류'], required_tests: ['PET-CT', '조직검사', 'CT/MRI'], sources: ['KB'], notes: '원발암이 확인되면 원발부위 기준으로 분류. 원발암 진단확정 시점 기준 적용' },
  { id: 'd-c81', kcd_code: 'C81-C96', kcd_name: '림프·조혈 및 관련조직의 악성신생물 (혈액암·백혈병·림프종)', category: 'cancer', sub_type: '일반암', required_docs: ['혈액검사 결과지', '골수검사 결과지', '진단서'], required_tests: ['혈액검사(CBC)', '골수검사(생검·흡인)', '림프절생검', 'CT/PET-CT'], sources: ['KB'], notes: '백혈병·림프종·다발성골수종 등 혈액암 포함' },
  { id: 'd-c97', kcd_code: 'C97', kcd_name: '독립된(원발성) 여러 부위의 악성신생물', category: 'cancer', sub_type: '일반암', required_docs: ['각 암종별 병리조직검사 결과지', '진단서'], required_tests: ['각 암종별 검사'], sources: ['KB'] },

  // 혈액암 추가 (별표22 포함)
  { id: 'd-d45', kcd_code: 'D45', kcd_name: '진성 적혈구 증가증', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['혈액검사 결과지', '골수검사 결과지', '진단서'], required_tests: ['혈액검사', '골수검사', 'JAK2 유전자검사'], sources: ['KB'] },
  { id: 'd-d46', kcd_code: 'D46', kcd_name: '골수 형성이상 증후군 (MDS)', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['골수검사 결과지', '진단서'], required_tests: ['혈액검사', '골수생검·흡인', '염색체검사'], sources: ['KB'] },
  { id: 'd-d471', kcd_code: 'D47.1', kcd_name: '만성 골수증식 질환', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['혈액검사 결과지', '골수검사 결과지', '진단서'], required_tests: ['혈액검사', '골수검사', '유전자검사'], sources: ['KB'] },
  { id: 'd-d473', kcd_code: 'D47.3', kcd_name: '본태성(출혈성) 혈소판혈증', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['혈액검사 결과지', '골수검사 결과지', '진단서'], required_tests: ['혈액검사', '골수검사', 'JAK2 유전자검사'], sources: ['KB'] },
  { id: 'd-d474', kcd_code: 'D47.4', kcd_name: '골수섬유증', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['골수생검 결과지', '진단서'], required_tests: ['골수생검', '혈액검사'], sources: ['KB'] },
  { id: 'd-d475', kcd_code: 'D47.5', kcd_name: '만성 호산구성 백혈병 (과호산구증후군)', category: 'cancer', sub_type: '일반암(혈액암)', required_docs: ['혈액검사 결과지', '골수검사 결과지', '진단서'], required_tests: ['혈액검사', '골수검사'], sources: ['KB'] },

  // ══════════════════════════════════════════════════
  // 2. 제자리 신생물 (유사암) — 별표23
  // ══════════════════════════════════════════════════

  { id: 'd-d00', kcd_code: 'D00', kcd_name: '구강·식도·위의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['내시경', '조직생검'], sources: ['KB'], notes: '⚠️ 유사암 — 암진단비의 10~20% 지급. 상품별 확인 필요' },
  { id: 'd-d01', kcd_code: 'D01', kcd_name: '기타 및 상세불명의 소화기관의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['내시경', '조직생검'], sources: ['KB'] },
  { id: 'd-d02', kcd_code: 'D02', kcd_name: '중이 및 호흡계통의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['기관지내시경', '조직생검'], sources: ['KB'] },
  { id: 'd-d03', kcd_code: 'D03', kcd_name: '제자리 흑색종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['피부생검'], sources: ['KB'] },
  { id: 'd-d04', kcd_code: 'D04', kcd_name: '피부의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['피부생검'], sources: ['KB'] },
  { id: 'd-d05', kcd_code: 'D05', kcd_name: '유방의 제자리암종 (DCIS·LCIS)', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['유방촬영술', '초음파', '조직생검'], sources: ['KB'], notes: 'DCIS(유방관상피내암), LCIS(소엽상피내암)' },
  { id: 'd-d06', kcd_code: 'D06', kcd_name: '자궁경부의 제자리암종 (CIS)', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['자궁경부세포검사', '질확대경', '원추절제술 조직검사'], sources: ['KB'] },
  { id: 'd-d07', kcd_code: 'D07', kcd_name: '기타 및 상세불명의 생식기관의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },
  { id: 'd-d09', kcd_code: 'D09', kcd_name: '기타 및 상세불명 부위의 제자리암종', category: 'cancer_similar', sub_type: '유사암(제자리암)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['조직검사'], sources: ['KB'] },

  // ══════════════════════════════════════════════════
  // 3. 행동양식 불명 또는 미상의 신생물 (경계성종양) — 별표24
  // ══════════════════════════════════════════════════

  { id: 'd-d37', kcd_code: 'D37', kcd_name: '구강 및 소화기관의 행동양식 불명 또는 미상의 신생물 (경계성종양)', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['내시경', '조직생검'], sources: ['KB'] },
  { id: 'd-d38', kcd_code: 'D38', kcd_name: '중이·호흡기관·흉곽내 기관의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['CT', '조직생검'], sources: ['KB'] },
  { id: 'd-d39', kcd_code: 'D39', kcd_name: '여성 생식기관의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', '조직생검'], sources: ['KB'] },
  { id: 'd-d40', kcd_code: 'D40', kcd_name: '남성 생식기관의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', '조직생검'], sources: ['KB'] },
  { id: 'd-d41', kcd_code: 'D41', kcd_name: '비뇨기관의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['요세포검사', '방광경', '조직생검'], sources: ['KB'] },
  { id: 'd-d42', kcd_code: 'D42', kcd_name: '수막의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['MRI', '조직생검'], sources: ['KB'] },
  { id: 'd-d43', kcd_code: 'D43', kcd_name: '뇌 및 중추신경계통의 행동양식 불명 신생물 (양성뇌종양)', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지 또는 영상진단', '진단서'], required_tests: ['뇌MRI', '조직생검(가능시)'], sources: ['KB'], notes: '양성뇌종양 — 일부 상품에서 별도 보장 있음' },
  { id: 'd-d44', kcd_code: 'D44', kcd_name: '내분비선의 행동양식 불명 신생물', category: 'cancer_similar', sub_type: '유사암(경계성종양)', required_docs: ['병리조직검사 결과지', '진단서'], required_tests: ['초음파', '호르몬검사', '조직생검'], sources: ['KB'] },

  // ══════════════════════════════════════════════════
  // 4. 뇌혈관질환 — 별표48
  // ══════════════════════════════════════════════════

  { id: 'd-i60', kcd_code: 'I60', kcd_name: '거미막하출혈 (지주막하출혈)', category: 'brain', sub_type: '뇌출혈', required_docs: ['영상검사 결과지(CT/MRI)', '진단서(KCD코드 명기)'], required_tests: ['뇌CT', '뇌MRI', '뇌혈관조영술(CTA/DSA)'], sources: ['KB'], notes: '뇌졸중 중 예후 가장 나쁜 유형. 뇌동맥류 파열이 주요 원인' },
  { id: 'd-i61', kcd_code: 'I61', kcd_name: '뇌내출혈', category: 'brain', sub_type: '뇌출혈', required_docs: ['영상검사 결과지(CT/MRI)', '진단서'], required_tests: ['뇌CT', '뇌MRI'], sources: ['KB'] },
  { id: 'd-i62', kcd_code: 'I62', kcd_name: '기타 비외상성 두개내 출혈 (경막하·경막외 출혈)', category: 'brain', sub_type: '뇌출혈', required_docs: ['영상검사 결과지(CT/MRI)', '진단서'], required_tests: ['뇌CT', '뇌MRI'], sources: ['KB'] },
  { id: 'd-i63', kcd_code: 'I63', kcd_name: '뇌경색증', category: 'brain', sub_type: '뇌경색', required_docs: ['영상검사 결과지(MRI/DWI)', '진단서'], required_tests: ['뇌MRI(DWI)', '뇌CT', '경동맥초음파', '심전도'], sources: ['KB'] },
  { id: 'd-i64', kcd_code: 'I64', kcd_name: '출혈 또는 경색증으로 명시되지 않은 뇌졸중', category: 'brain', sub_type: '뇌졸중', required_docs: ['영상검사 결과지', '진단서'], required_tests: ['뇌CT', '뇌MRI'], sources: ['KB'] },
  { id: 'd-i65', kcd_code: 'I65', kcd_name: '뇌경색증을 유발하지 않은 뇌전동맥의 폐쇄 및 협착', category: 'brain', sub_type: '뇌혈관질환', required_docs: ['영상검사 결과지', '진단서'], required_tests: ['뇌MRI', '뇌혈관MRA', 'CTA'], sources: ['KB'] },
  { id: 'd-i66', kcd_code: 'I66', kcd_name: '뇌경색증을 유발하지 않은 대뇌동맥의 폐쇄 및 협착', category: 'brain', sub_type: '뇌혈관질환', required_docs: ['영상검사 결과지', '진단서'], required_tests: ['뇌MRI', '뇌혈관MRA', 'CTA'], sources: ['KB'] },

  // ══════════════════════════════════════════════════
  // 5. 허혈성심장질환 — 별표49
  // ══════════════════════════════════════════════════

  { id: 'd-i20', kcd_code: 'I20', kcd_name: '협심증', category: 'heart', sub_type: '허혈성심장질환', required_docs: ['영상검사 결과지', '진단서(KCD코드 명기)'], required_tests: ['심전도', '심장초음파', '관상동맥CT(CCTA)', '관상동맥조영술'], sources: ['KB'], notes: '협심증은 급성심근경색과 다르게 진단비 지급 기준 상품별 차이 있음. 확인 필요' },
  { id: 'd-i21', kcd_code: 'I21', kcd_name: '급성 심근경색증', category: 'heart', sub_type: '급성심근경색', required_docs: ['심전도 결과지', '심장효소(트로포닌·CK-MB) 결과지', '진단서'], required_tests: ['심전도', '심장효소검사(트로포닌I/T·CK-MB)', '심장초음파', '관상동맥조영술'], sources: ['KB'], notes: '3대 질병 해당. 급성심근경색 진단비 별도 존재' },
  { id: 'd-i22', kcd_code: 'I22', kcd_name: '후속 심근경색증', category: 'heart', sub_type: '급성심근경색', required_docs: ['심전도 결과지', '심장효소 결과지', '진단서'], required_tests: ['심전도', '심장효소검사', '심장초음파'], sources: ['KB'] },
  { id: 'd-i23', kcd_code: 'I23', kcd_name: '급성 심근경색증 후 특정 현존 합병증', category: 'heart', sub_type: '급성심근경색', required_docs: ['진단서', '관련 검사결과지'], required_tests: ['심장초음파', '심전도'], sources: ['KB'] },
  { id: 'd-i24', kcd_code: 'I24', kcd_name: '기타 급성 허혈심장질환', category: 'heart', sub_type: '허혈성심장질환', required_docs: ['영상검사 결과지', '진단서'], required_tests: ['심전도', '심장초음파', '관상동맥조영술'], sources: ['KB'] },
  { id: 'd-i25', kcd_code: 'I25', kcd_name: '만성 허혈심장병 (만성관상동맥질환)', category: 'heart', sub_type: '허혈성심장질환', required_docs: ['영상검사 결과지', '진단서'], required_tests: ['관상동맥CT', '핵의학검사', '관상동맥조영술'], sources: ['KB'], notes: 'I25.2(오래된 심근경색증)는 3대질병 해당' },

]

// ─────────────────────────────────────────────────────────
// 카테고리 라벨
// ─────────────────────────────────────────────────────────
export const DIAGNOSIS_CATEGORY_LABELS: Record<string, string> = {
  cancer: '암 (일반암)',
  cancer_similar: '유사암 (갑상선·기타피부·제자리·경계성)',
  cancer_thyroid: '갑상선암 (유사암)',
  cancer_skin: '기타피부암 (유사암)',
  brain: '뇌혈관질환 (뇌졸중·뇌경색·뇌출혈)',
  heart: '허혈성심장질환 (심근경색·협심증)',
  other: '기타 질병',
}

// ─────────────────────────────────────────────────────────
// KCD 코드 범위 → 카테고리 매핑 (빠른 검색용)
// ─────────────────────────────────────────────────────────
export function getKcdCategory(code: string): string {
  const c = code.toUpperCase().trim()

  // 유사암 먼저 체크 (C43보다 C44가 유사암이므로 순서 중요)
  if (c === 'C44') return 'cancer_skin'
  if (c === 'C73') return 'cancer_thyroid'
  if (['D00','D01','D02','D03','D04','D05','D06','D07','D09'].includes(c)) return 'cancer_similar'
  if (['D37','D38','D39','D40','D41','D42','D43','D44'].includes(c)) return 'cancer_similar'

  // 혈액암 (암 범주지만 별도 표기)
  if (['D45','D46','D47.1','D47.3','D47.4','D47.5'].includes(c)) return 'cancer'

  // 일반암
  const cNum = parseFloat(c.replace('C',''))
  if (!isNaN(cNum) && cNum >= 0 && cNum <= 97) return 'cancer'

  // 뇌혈관
  if (['I60','I61','I62','I63','I64','I65','I66'].includes(c)) return 'brain'

  // 심장
  if (['I20','I21','I22','I23','I24','I25'].includes(c)) return 'heart'

  return 'other'
}

// ─────────────────────────────────────────────────────────
// 암 주요 부위명 매핑 (KCD → 한국어)
// ─────────────────────────────────────────────────────────
export const KCD_NAME_MAP: Record<string, string> = {
  C00: '입술암', C01: '혀암', C02: '혀암', C03: '잇몸암', C04: '구강저암',
  C05: '구개암', C06: '구강암', C07: '이하선암', C08: '침샘암',
  C09: '편도암', C10: '구인두암', C11: '비인두암', C12: '하인두암',
  C13: '하인두암', C14: '구강인두암',
  C15: '식도암', C16: '위암', C17: '소장암', C18: '대장암(결장)',
  C19: '직장암', C20: '직장암', C21: '항문암',
  C22: '간암', C23: '담낭암', C24: '담도암', C25: '췌장암',
  C30: '비강암', C31: '부비동암', C32: '후두암', C33: '기관암', C34: '폐암',
  C37: '흉선암', C38: '종격동암', C39: '흉막암',
  C40: '골육종', C41: '골육종',
  C43: '악성흑색종', C44: '기타피부암(유사암)',
  C45: '악성중피종', C46: '카포시육종', C47: '말초신경암', C48: '후복막암', C49: '연부조직육종',
  C50: '유방암', C51: '외음부암', C52: '질암', C53: '자궁경부암',
  C54: '자궁내막암', C55: '자궁암', C56: '난소암', C57: '난관암', C58: '태반암',
  C60: '음경암', C61: '전립선암', C62: '고환암', C63: '기타남성생식기암',
  C64: '신장암', C65: '신우암', C66: '요관암', C67: '방광암', C68: '기타요로암',
  C69: '안구암', C70: '뇌수막암', C71: '뇌암', C72: '척수암',
  C73: '갑상선암(유사암)', C74: '부신암', C75: '기타내분비선암',
  C76: '불명확부위암', C77: '림프절전이암', C78: '호흡소화기전이암',
  C79: '기타전이암', C80: '상세불명암', C81: '호지킨림프종',
  C82: '비호지킨림프종', C83: '비호지킨림프종', C84: '말초T세포림프종',
  C85: '비호지킨림프종', C86: '기타T세포림프종', C88: '악성면역증식질환',
  C90: '다발성골수종', C91: '림프구성백혈병', C92: '골수성백혈병',
  C93: '단핵구성백혈병', C94: '기타백혈병', C95: '상세불명백혈병',
  C96: '림프조혈관련암', C97: '다발성원발암',
  D00: '구강식도위 제자리암(유사암)', D01: '소화기제자리암(유사암)',
  D02: '호흡계제자리암(유사암)', D03: '제자리흑색종(유사암)',
  D04: '피부제자리암(유사암)', D05: '유방제자리암-DCIS(유사암)',
  D06: '자궁경부제자리암-CIS(유사암)', D07: '생식기제자리암(유사암)',
  D09: '기타제자리암(유사암)',
  D37: '소화기경계성종양(유사암)', D38: '호흡기경계성종양(유사암)',
  D39: '여성생식기경계성종양(유사암)', D40: '남성생식기경계성종양(유사암)',
  D41: '비뇨기경계성종양(유사암)', D42: '수막경계성종양(유사암)',
  D43: '뇌경계성종양-양성뇌종양(유사암)', D44: '내분비선경계성종양(유사암)',
  D45: '진성적혈구증가증(혈액암)', D46: '골수형성이상증후군-MDS(혈액암)',
  I60: '지주막하출혈', I61: '뇌내출혈', I62: '경막하출혈',
  I63: '뇌경색증', I64: '뇌졸중(불명)', I65: '뇌전동맥협착',
  I66: '대뇌동맥협착',
  I20: '협심증', I21: '급성심근경색증', I22: '후속심근경색증',
  I23: '심근경색합병증', I24: '급성허혈심장질환', I25: '만성허혈심장병',
}