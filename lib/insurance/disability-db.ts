// lib/insurance/data/disability-db.ts
// 출처: KB 금쪽같은(별표1) — 장해분류표
// 13개 신체부위 전체

import type { DisabilityItem } from './types'

export const DISABILITY_DB: DisabilityItem[] = [

  // ══════════════════════════════════════════════════
  // 1. 눈의 장해
  // ══════════════════════════════════════════════════
  { id: 'eye-01', body_part: 'eye', condition: '두 눈이 멀었을 때', rate: 100, judgment_criteria: '양쪽 안구 적출 또는 명암을 가리지 못하는 경우(광각무) 겨우 가릴 수 있는 경우(광각유) 포함' },
  { id: 'eye-02', body_part: 'eye', condition: '한 눈이 멀었을 때', rate: 50, judgment_criteria: '안구 적출 또는 명암을 가리지 못하는 경우' },
  { id: 'eye-03', body_part: 'eye', condition: '한 눈의 교정시력이 0.02 이하로 된 때', rate: 35, judgment_criteria: '안전수동·안전수지 상태 포함. 공인 시력검사표로 최소 3회 이상 측정' },
  { id: 'eye-04', body_part: 'eye', condition: '한 눈의 교정시력이 0.06 이하로 된 때', rate: 25, judgment_criteria: '' },
  { id: 'eye-05', body_part: 'eye', condition: '한 눈의 교정시력이 0.1 이하로 된 때', rate: 15, judgment_criteria: '' },
  { id: 'eye-06', body_part: 'eye', condition: '한 눈의 교정시력이 0.2 이하로 된 때', rate: 5, judgment_criteria: '' },
  { id: 'eye-07', body_part: 'eye', condition: '한 눈의 안구에 뚜렷한 운동장해나 뚜렷한 조절기능 장해를 남긴 때', rate: 10, judgment_criteria: '주시야 운동범위 정상의 1/2 이하로 감소 또는 중심 20도 이내 복시, 조절력 정상의 1/2 이하 감소. 장해판정은 질병·외상 후 1년 이상 뒤에 평가' },
  { id: 'eye-08', body_part: 'eye', condition: '한 눈에 뚜렷한 시야장해를 남긴 때', rate: 5, judgment_criteria: '한 눈의 시야 범위가 정상시야 범위의 60% 이하로 제한된 경우' },
  { id: 'eye-09', body_part: 'eye', condition: '한 눈의 눈꺼풀에 뚜렷한 결손을 남긴 때', rate: 10, judgment_criteria: '눈꺼풀 결손으로 눈을 감았을 때 각막이 완전히 덮이지 않는 경우' },
  { id: 'eye-10', body_part: 'eye', condition: '한 눈의 눈꺼풀에 뚜렷한 운동장해를 남긴 때', rate: 5, judgment_criteria: '눈을 떴을 때 동공을 1/2 이상 덮거나, 눈을 감았을 때 각막을 완전히 덮을 수 없는 경우' },

  // ══════════════════════════════════════════════════
  // 2. 귀의 장해
  // ══════════════════════════════════════════════════
  { id: 'ear-01', body_part: 'ear', condition: '두 귀의 청력을 완전히 잃었을 때', rate: 80, judgment_criteria: '순음청력검사 결과 평균순음역치 90dB 이상. 3회 이상 청력검사' },
  { id: 'ear-02', body_part: 'ear', condition: '한 귀의 청력을 완전히 잃고, 다른 귀의 청력에 심한 장해를 남긴 때', rate: 45, judgment_criteria: '한쪽 90dB 이상 + 다른쪽 80dB 이상' },
  { id: 'ear-03', body_part: 'ear', condition: '한 귀의 청력을 완전히 잃었을 때', rate: 25, judgment_criteria: '순음청력검사 평균순음역치 90dB 이상' },
  { id: 'ear-04', body_part: 'ear', condition: '한 귀의 청력에 심한 장해를 남긴 때', rate: 15, judgment_criteria: '평균순음역치 80dB 이상. 귀에다 대고 말해야 큰 소리를 알아듣는 경우' },
  { id: 'ear-05', body_part: 'ear', condition: '한 귀의 청력에 약간의 장해를 남긴 때', rate: 5, judgment_criteria: '평균순음역치 70dB 이상. 50cm 이상 거리에서 보통 말소리를 알아듣지 못하는 경우' },
  { id: 'ear-06', body_part: 'ear', condition: '한 귀의 귓바퀴의 대부분이 결손된 때', rate: 10, judgment_criteria: '귓바퀴의 연골부가 1/2 이상 결손된 경우' },
  { id: 'ear-07', body_part: 'ear', condition: '평형기능에 장해를 남긴 때', rate: 10, judgment_criteria: '전정기관 이상으로 보행 등 일상생활이 어려운 상태로 평형장해 평가항목별 합산점수 30점 이상. 장해판정 직전 1년 이상 지속 치료 후 평가' },

  // ══════════════════════════════════════════════════
  // 3. 코의 장해
  // ══════════════════════════════════════════════════
  { id: 'nose-01', body_part: 'nose', condition: '코의 호흡기능을 완전히 잃었을 때', rate: 15, judgment_criteria: '구강호흡 보조 없이 코로만 정상 호흡 불가. 비강통기도검사 등 의학적 확인' },
  { id: 'nose-02', body_part: 'nose', condition: '코의 후각기능을 완전히 잃었을 때', rate: 5, judgment_criteria: '후각신경 손상으로 양쪽 코의 후각기능을 완전히 잃은 경우. 6개월 이상 고정된 후각 완전손실 확인' },

  // ══════════════════════════════════════════════════
  // 4. 씹어먹거나 말하는 기능의 장해
  // ══════════════════════════════════════════════════
  { id: 'jaw-01', body_part: 'jaw', condition: '씹어먹는 기능과 말하는 기능 모두에 심한 장해를 남긴 때', rate: 100, judgment_criteria: '물이나 이에 준하는 음료 이외 섭취 불가 + 언어평가 자음정확도 30% 미만 또는 전실어증' },
  { id: 'jaw-02', body_part: 'jaw', condition: '씹어먹는 기능에 심한 장해를 남긴 때', rate: 80, judgment_criteria: '물이나 음료 외 섭취 불가, 또는 개구운동 1cm 이하, 또는 부정교합 1.5cm 이상' },
  { id: 'jaw-03', body_part: 'jaw', condition: '말하는 기능에 심한 장해를 남긴 때', rate: 60, judgment_criteria: '자음정확도 30% 미만 또는 전실어증·운동성실어증으로 의사소통 불가' },
  { id: 'jaw-04', body_part: 'jaw', condition: '씹어먹는 기능과 말하는 기능 모두에 뚜렷한 장해를 남긴 때', rate: 40, judgment_criteria: '미음 외 섭취 불가 + 자음정확도 50% 미만 등' },
  { id: 'jaw-05', body_part: 'jaw', condition: '씹어먹는 기능 또는 말하는 기능에 뚜렷한 장해를 남긴 때', rate: 20, judgment_criteria: '미음 외 섭취 불가(씹기) 또는 자음정확도 50% 미만(말하기) 중 하나' },
  { id: 'jaw-06', body_part: 'jaw', condition: '씹어먹는 기능과 말하는 기능 모두에 약간의 장해를 남긴 때', rate: 10, judgment_criteria: '부드러운 고형식만 가능(씹기) + 자음정확도 75% 미만(말하기) 등' },
  { id: 'jaw-07', body_part: 'jaw', condition: '씹어먹는 기능 또는 말하는 기능에 약간의 장해를 남긴 때', rate: 5, judgment_criteria: '부드러운 고형식만 가능(씹기) 또는 자음정확도 75% 미만(말하기) 중 하나' },
  { id: 'jaw-08', body_part: 'jaw', condition: '치아에 14개 이상의 결손이 생긴 때', rate: 20, judgment_criteria: '치아의 상실 또는 발치. 금관치료 시 1/2개 결손으로 적용. 보철 목적 발치·노화 발치·임플란트 결손은 제외' },
  { id: 'jaw-09', body_part: 'jaw', condition: '치아에 7개 이상의 결손이 생긴 때', rate: 10, judgment_criteria: '' },
  { id: 'jaw-10', body_part: 'jaw', condition: '치아에 5개 이상의 결손이 생긴 때', rate: 5, judgment_criteria: '' },

  // ══════════════════════════════════════════════════
  // 5. 외모의 추상(추한 모습) 장해
  // ══════════════════════════════════════════════════
  { id: 'app-01', body_part: 'appearance', condition: '외모에 뚜렷한 추상(추한 모습)을 남긴 때', rate: 15, judgment_criteria: '얼굴: 손바닥 크기 1/2 이상 추상, 길이 10cm 이상 반흔, 지름 5cm 이상 조직함몰, 코의 1/2 이상 결손. 머리: 손바닥 크기 이상 반흔 및 모발결손 또는 두개골 결손. 목: 손바닥 크기 이상 추상' },
  { id: 'app-02', body_part: 'appearance', condition: '외모에 약간의 추상(추한 모습)을 남긴 때', rate: 5, judgment_criteria: '얼굴: 손바닥 크기 1/4 이상 추상, 길이 5cm 이상 반흔, 지름 2cm 이상 조직함몰, 코의 1/4 이상 결손. 머리: 손바닥 크기 1/2 이상. 목: 손바닥 크기 1/2 이상' },

  // ══════════════════════════════════════════════════
  // 6. 척추(등뼈)의 장해
  // ══════════════════════════════════════════════════
  { id: 'spine-01', body_part: 'spine', condition: '척추(등뼈)에 심한 운동장해를 남긴 때', rate: 40, judgment_criteria: '4개 이상 척추체 유합·고정, 또는 두개골-제1경추-제2경추 모두 유합·고정' },
  { id: 'spine-02', body_part: 'spine', condition: '척추(등뼈)에 뚜렷한 운동장해를 남긴 때', rate: 30, judgment_criteria: '3개 척추체 유합·고정, 또는 두개골-제1경추 또는 제1-제2경추 유합·고정, 또는 BDI·ADI에 뚜렷한 이상전위' },
  { id: 'spine-03', body_part: 'spine', condition: '척추(등뼈)에 약간의 운동장해를 남긴 때', rate: 10, judgment_criteria: '2개 척추체 유합·고정 (두개골·상위경추 제외)' },
  { id: 'spine-04', body_part: 'spine', condition: '척추(등뼈)에 심한 기형을 남긴 때', rate: 50, judgment_criteria: '35° 이상 척추전만증·후만증, 또는 20° 이상 측만증. 또는 척추체 1개 압박률 60% 이상, 또는 한 운동단위 내 압박률 합 90% 이상' },
  { id: 'spine-05', body_part: 'spine', condition: '척추(등뼈)에 뚜렷한 기형을 남긴 때', rate: 30, judgment_criteria: '15° 이상 전만·후만, 또는 10° 이상 측만. 또는 척추체 1개 압박률 40% 이상, 또는 합 60% 이상' },
  { id: 'spine-06', body_part: 'spine', condition: '척추(등뼈)에 약간의 기형을 남긴 때', rate: 15, judgment_criteria: '경도의 전만·후만 또는 측만. 또는 척추체 1개 압박률 20% 이상, 또는 합 40% 이상' },
  { id: 'spine-07', body_part: 'spine', condition: '추간판탈출증으로 인한 심한 신경 장해', rate: 20, judgment_criteria: '추간판을 2마디 이상(또는 1마디 2회 이상) 수술 후에도 마미신경증후군 발생, 하지 현저한 마비 또는 대소변 장해. 수술 또는 시술 후 6개월 이상 뒤 평가' },
  { id: 'spine-08', body_part: 'spine', condition: '추간판탈출증으로 인한 뚜렷한 신경 장해', rate: 15, judgment_criteria: '추간판 1마디 수술 후에도 신경생리검사에서 명확한 신경근병증 소견 지속, 척추신경근 불완전 마비 인정' },
  { id: 'spine-09', body_part: 'spine', condition: '추간판탈출증으로 인한 약간의 신경 장해', rate: 10, judgment_criteria: '추간판탈출증 확인 + 신경생리검사에서 명확한 신경근병증 소견 지속. ⚠️ 추간판탈출증 자체만으로는 운동·기형 장해 미평가' },

  // ══════════════════════════════════════════════════
  // 7. 체간골의 장해
  // ══════════════════════════════════════════════════
  { id: 'trunk-01', body_part: 'trunk', condition: '어깨뼈(견갑골)나 골반뼈에 뚜렷한 기형을 남긴 때', rate: 15, judgment_criteria: '천장관절·치골문합부 분리 또는 좌골 2.5cm 이상 분리, 또는 각(角) 변형 20° 이상, 또는 미골 70° 이상 변형' },
  { id: 'trunk-02', body_part: 'trunk', condition: '빗장뼈(쇄골)·가슴뼈(흉골)·갈비뼈(늑골)에 뚜렷한 기형을 남긴 때', rate: 10, judgment_criteria: '방사선 검사로 측정한 각(角) 변형 20° 이상. 다발성늑골 기형은 가장 높은 각 변형 기준으로 평가' },

  // ══════════════════════════════════════════════════
  // 8. 팔의 장해
  // ══════════════════════════════════════════════════
  { id: 'arm-01', body_part: 'arm', condition: '두 팔의 손목관절 이상을 잃었을 때', rate: 100, judgment_criteria: '양쪽 팔의 손목 이상 절단' },
  { id: 'arm-02', body_part: 'arm', condition: '한 팔의 손목관절 이상을 잃었을 때', rate: 60, judgment_criteria: '한쪽 팔의 손목 이상 절단' },
  { id: 'arm-03', body_part: 'arm', condition: '한 팔의 3대 관절 중 관절 하나의 기능을 완전히 잃었을 때', rate: 30, judgment_criteria: '어깨관절·팔꿈치관절·손목관절 중 하나의 완전 기능상실 (관절 강직 등)' },
  { id: 'arm-04', body_part: 'arm', condition: '한 팔의 3대 관절 중 관절 하나의 기능에 심한 장해를 남긴 때', rate: 20, judgment_criteria: '해당 관절 운동범위 합계가 정상 운동범위의 1/4 이하' },
  { id: 'arm-05', body_part: 'arm', condition: '한 팔의 3대 관절 중 관절 하나의 기능에 뚜렷한 장해를 남긴 때', rate: 10, judgment_criteria: '해당 관절 운동범위 합계가 정상 운동범위의 1/2 이하' },
  { id: 'arm-06', body_part: 'arm', condition: '한 팔의 3대 관절 중 관절 하나의 기능에 약간의 장해를 남긴 때', rate: 5, judgment_criteria: '해당 관절 운동범위 합계가 정상 운동범위의 3/4 이하' },
  { id: 'arm-07', body_part: 'arm', condition: '한 팔에 가관절이 남아 뚜렷한 장해를 남긴 때', rate: 20, judgment_criteria: '골절 부위가 완전히 유합되지 않아 움직이는 가관절 상태' },
  { id: 'arm-08', body_part: 'arm', condition: '한 팔에 가관절이 남아 약간의 장해를 남긴 때', rate: 10, judgment_criteria: '' },
  { id: 'arm-09', body_part: 'arm', condition: '한 팔의 뼈에 기형을 남긴 때', rate: 5, judgment_criteria: '해당 뼈에 변형 등 기형이 남아있는 경우' },

  // ══════════════════════════════════════════════════
  // 9. 다리의 장해
  // ══════════════════════════════════════════════════
  { id: 'leg-01', body_part: 'leg', condition: '두 다리의 발목관절 이상을 잃었을 때', rate: 100, judgment_criteria: '양쪽 발목 이상 절단' },
  { id: 'leg-02', body_part: 'leg', condition: '한 다리의 발목관절 이상을 잃었을 때', rate: 60, judgment_criteria: '한쪽 발목 이상 절단' },
  { id: 'leg-03', body_part: 'leg', condition: '한 다리의 3대 관절 중 관절 하나의 기능을 완전히 잃었을 때', rate: 30, judgment_criteria: '엉덩관절·무릎관절·발목관절 중 하나의 완전 기능상실' },
  { id: 'leg-04', body_part: 'leg', condition: '한 다리의 3대 관절 중 관절 하나의 기능에 심한 장해를 남긴 때', rate: 20, judgment_criteria: '운동범위 합계가 정상의 1/4 이하' },
  { id: 'leg-05', body_part: 'leg', condition: '한 다리의 3대 관절 중 관절 하나의 기능에 뚜렷한 장해를 남긴 때', rate: 10, judgment_criteria: '운동범위 합계가 정상의 1/2 이하' },
  { id: 'leg-06', body_part: 'leg', condition: '한 다리의 3대 관절 중 관절 하나의 기능에 약간의 장해를 남긴 때', rate: 5, judgment_criteria: '운동범위 합계가 정상의 3/4 이하' },
  { id: 'leg-07', body_part: 'leg', condition: '한 다리에 가관절이 남아 뚜렷한 장해를 남긴 때', rate: 20, judgment_criteria: '' },
  { id: 'leg-08', body_part: 'leg', condition: '한 다리에 가관절이 남아 약간의 장해를 남긴 때', rate: 10, judgment_criteria: '' },
  { id: 'leg-09', body_part: 'leg', condition: '한 다리의 뼈에 기형을 남긴 때', rate: 5, judgment_criteria: '' },
  { id: 'leg-10', body_part: 'leg', condition: '한 다리가 5cm 이상 짧아진 때', rate: 30, judgment_criteria: '하지 단축. 건측과 환측의 길이 차이 측정' },
  { id: 'leg-11', body_part: 'leg', condition: '한 다리가 4cm 이상 짧아진 때', rate: 20, judgment_criteria: '' },
  { id: 'leg-12', body_part: 'leg', condition: '한 다리가 3cm 이상 짧아진 때', rate: 10, judgment_criteria: '' },
  { id: 'leg-13', body_part: 'leg', condition: '한 다리가 2cm 이상 짧아진 때', rate: 5, judgment_criteria: '' },

  // ══════════════════════════════════════════════════
  // 10. 손가락의 장해
  // ══════════════════════════════════════════════════
  { id: 'finger-01', body_part: 'finger', condition: '두 손의 손가락 모두를 잃었을 때', rate: 100, judgment_criteria: '양손 모든 손가락 절단 또는 기능상실' },
  { id: 'finger-02', body_part: 'finger', condition: '한 손의 손가락 모두를 잃었을 때', rate: 55, judgment_criteria: '한 손 모든 손가락 절단' },
  { id: 'finger-03', body_part: 'finger', condition: '한 손의 엄지손가락을 잃었을 때', rate: 20, judgment_criteria: '엄지손가락 중수지관절 이상 절단 또는 완전 기능상실' },
  { id: 'finger-04', body_part: 'finger', condition: '한 손의 엄지손가락의 기능에 장해를 남긴 때', rate: 10, judgment_criteria: '엄지손가락 운동범위 합계가 정상의 1/2 이하' },
  { id: 'finger-05', body_part: 'finger', condition: '한 손의 엄지손가락 이외의 손가락 하나를 잃었을 때', rate: 8, judgment_criteria: '검지·중지·약지·소지 중 하나 절단' },
  { id: 'finger-06', body_part: 'finger', condition: '한 손의 엄지손가락 이외의 손가락 하나의 기능에 장해를 남긴 때', rate: 4, judgment_criteria: '해당 손가락 운동범위 합계가 정상의 1/2 이하' },

  // ══════════════════════════════════════════════════
  // 11. 발가락의 장해
  // ══════════════════════════════════════════════════
  { id: 'toe-01', body_part: 'toe', condition: '두 발의 발가락 모두를 잃었을 때', rate: 100, judgment_criteria: '양발 모든 발가락 절단' },
  { id: 'toe-02', body_part: 'toe', condition: '한 발의 발가락 모두를 잃었을 때', rate: 40, judgment_criteria: '한 발 모든 발가락 절단' },
  { id: 'toe-03', body_part: 'toe', condition: '한 발의 엄지발가락을 잃었을 때', rate: 15, judgment_criteria: '엄지발가락 중족지관절 이상 절단' },
  { id: 'toe-04', body_part: 'toe', condition: '한 발의 엄지발가락의 기능에 장해를 남긴 때', rate: 8, judgment_criteria: '엄지발가락 운동범위 정상의 1/2 이하' },
  { id: 'toe-05', body_part: 'toe', condition: '한 발의 엄지발가락 이외의 발가락 하나를 잃었을 때', rate: 5, judgment_criteria: '' },
  { id: 'toe-06', body_part: 'toe', condition: '한 발의 엄지발가락 이외의 발가락 하나의 기능에 장해를 남긴 때', rate: 3, judgment_criteria: '' },

  // ══════════════════════════════════════════════════
  // 12. 흉·복부장기 및 비뇨생식기의 장해
  // ══════════════════════════════════════════════════
  { id: 'organ-01', body_part: 'organ', condition: '흉·복부장기 또는 비뇨생식기 기능에 극심한 장해를 남긴 때', rate: 75, judgment_criteria: '생명유지에 직결되는 장기의 기능을 영구적으로 완전히 잃은 경우' },
  { id: 'organ-02', body_part: 'organ', condition: '흉·복부장기 또는 비뇨생식기 기능에 심한 장해를 남긴 때', rate: 50, judgment_criteria: '일상생활이 불가능할 정도의 심한 기능장해가 영구적으로 남은 경우' },
  { id: 'organ-03', body_part: 'organ', condition: '흉·복부장기 또는 비뇨생식기 기능에 뚜렷한 장해를 남긴 때', rate: 30, judgment_criteria: '일상생활에 현저한 제한을 받는 기능장해가 영구적으로 남은 경우' },
  { id: 'organ-04', body_part: 'organ', condition: '흉·복부장기 또는 비뇨생식기 기능에 약간의 장해를 남긴 때', rate: 15, judgment_criteria: '일상생활에 제한은 있으나 다소 가능한 정도의 기능장해' },

  // ══════════════════════════════════════════════════
  // 13. 신경계·정신행동의 장해
  // ══════════════════════════════════════════════════
  { id: 'neuro-01', body_part: 'neuro', condition: '신경계의 장해로 일상생활 기본동작에 제한을 남긴 때 — 완전 의존', rate: 100, judgment_criteria: '일상생활 기본동작(식사·이동·의복착탈·배변·세면) 모두 전적으로 타인 도움 필요. 뇌·척수손상, 사지마비 등' },
  { id: 'neuro-02', body_part: 'neuro', condition: '신경계의 장해로 일상생활 기본동작에 제한을 남긴 때 — 일부 도움', rate: 75, judgment_criteria: '일상생활 기본동작의 일부에서 타인의 도움이 필요한 경우' },
  { id: 'neuro-03', body_part: 'neuro', condition: '신경계의 장해로 일상생활 기본동작에 제한을 남긴 때 — 보조 필요', rate: 50, judgment_criteria: '혼자서 일상생활 기본동작은 가능하나 사회생활에 상당한 제한이 있는 경우' },
  { id: 'neuro-04', body_part: 'neuro', condition: '신경계의 장해로 일상생활에 제한을 남긴 때', rate: 10, judgment_criteria: '사회생활이 가능하나 일상적인 일부 활동에 제한이 있는 경우. 뇌·척수손상으로 인한 경도 장해' },
  { id: 'neuro-05', body_part: 'neuro', condition: '정신행동에 극심한 장해를 남긴 때', rate: 100, judgment_criteria: '정신 기능의 완전한 상실로 자해·타해 위험성이 높아 24시간 감시가 필요한 상태' },
  { id: 'neuro-06', body_part: 'neuro', condition: '정신행동에 심한 장해를 남긴 때', rate: 75, judgment_criteria: '가족 등의 지속적인 보호 없이 일상생활이 불가능한 상태' },
  { id: 'neuro-07', body_part: 'neuro', condition: '정신행동에 뚜렷한 장해를 남긴 때', rate: 50, judgment_criteria: '혼자서는 사회생활이 불가능하고 타인의 도움이 필요한 상태' },
  { id: 'neuro-08', body_part: 'neuro', condition: '정신행동에 약간의 장해를 남긴 때', rate: 25, judgment_criteria: '사회생활이 가능하나 지속적인 통원치료 등이 필요한 상태' },
]

// 신체부위 한국어 라벨
export const BODY_PART_LABELS: Record<string, string> = {
  eye: '눈',
  ear: '귀',
  nose: '코',
  jaw: '씹기·말하기',
  appearance: '외모 추상',
  spine: '척추(등뼈)',
  trunk: '체간골',
  arm: '팔',
  leg: '다리',
  finger: '손가락',
  toe: '발가락',
  organ: '흉복부장기·비뇨생식기',
  neuro: '신경계·정신행동',
}

// 주요 동의어 검색 매핑
export const DISABILITY_SYNONYMS: Record<string, string[]> = {
  eye: ['눈', '시력', '안구', '망막', '녹내장', '백내장', '안검', '눈꺼풀', '시야'],
  ear: ['귀', '청력', '청각', '고막', '중이', '귓바퀴', '평형'],
  nose: ['코', '후각', '호흡', '비강'],
  jaw: ['씹기', '말하기', '저작', '언어', '치아', '발치', '턱', '개구'],
  appearance: ['외모', '흉터', '반흔', '추상', '화상', '모발'],
  spine: ['척추', '등뼈', '디스크', '추간판', '허리', '경추', '요추', '흉추', '측만증'],
  trunk: ['쇄골', '견갑골', '골반', '늑골', '갈비뼈', '흉골'],
  arm: ['팔', '어깨', '팔꿈치', '손목', '상지', '가관절'],
  leg: ['다리', '무릎', '발목', '고관절', '엉덩이', '하지', '단축'],
  finger: ['손가락', '엄지', '검지', '중지', '약지', '소지'],
  toe: ['발가락', '엄지발가락'],
  organ: ['심장', '폐', '간', '신장', '방광', '자궁', '위', '대장', '직장', '췌장'],
  neuro: ['뇌', '신경', '척수', '마비', '정신', '인지', '치매', '편마비', '사지마비'],
}