"use client"
import { useMemo, useState } from "react"
import { TrendingDown, Zap, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"

// ══════════════════════════════════════════════════════════
// 타입
// ══════════════════════════════════════════════════════════
type MainTab = "health" | "death" | "saving" | "dollar"
type ViewTab = "company" | "coverage" | "cross"
type CompanyType = "생명" | "손해"
type CompanyFilter = "전체" | CompanyType
type PlanLevel = "min" | "standard" | "full"
type Disclosure = "standard" | "325" | "335" | "355" | "3105"
type AgeBandKey = "20s"|"30s"|"40s"|"50s"|"60s"|"70s"|"80s"
type JobGrade = "1"|"2"|"3"
type DrivingStatus = "운전자"|"비운전자"
type PayPeriod = 10|20|30
type ScopeType = "wide"|"narrow"|""

// ══════════════════════════════════════════════════════════
// 상수
// ══════════════════════════════════════════════════════════
const AGE_MAP: Record<AgeBandKey,number> = { "20s":25,"30s":35,"40s":45,"50s":55,"60s":65,"70s":75,"80s":80 }
const AGE_LABEL: Record<AgeBandKey,string> = { "20s":"20대","30s":"30대","40s":"40대","50s":"50대","60s":"60대","70s":"70대","80s":"80대" }
const PLAN_LABEL: Record<PlanLevel,string> = { min:"⚡ 최소", standard:"✅ 표준", full:"🌟 여유" }
const PLAN_DESC: Record<PlanLevel,string> = { min:"핵심 진단비만 (암·뇌·심장)", standard:"진단비 전체 + 수술비", full:"진단비+수술비+간병·입원 풀커버" }
const DISC_LABEL: Record<Disclosure,string> = { standard:"표준체(일반고지)","325":"간편 3·2·5","335":"간편 3·3·5","355":"간편 3·5·5","3105":"간편 3·10·5" }
const PAY_FACTOR: Record<number,number> = { 10:1.28, 20:1.00, 30:0.82 }
const JOB_FACTOR: Record<JobGrade,number> = { "1":1.00,"2":1.10,"3":1.25 }
const f = (v:number) => `${Math.round(v).toLocaleString()}원`
const fm = (v:number) => `${v.toLocaleString()}만원`

// ══════════════════════════════════════════════════════════
// 보험사
// ══════════════════════════════════════════════════════════
type Company = { id:string; name:string; type:CompanyType; savingRate:number; refund5:number; refund7:number; refund10:number; uwNote:string }
const COMPANIES: Company[] = [
  { id:"meritz",   name:"메리츠화재",  type:"손해", savingRate:2.80, refund5:88, refund7:94,  refund10:101, uwNote:"간편고지 가장 유연 · 암담보 최저" },
  { id:"kb",       name:"KB손보",      type:"손해", savingRate:2.88, refund5:89, refund7:95,  refund10:102, uwNote:"암·유사암 경쟁력 · 간편고지 적극" },
  { id:"hyundai",  name:"현대해상",    type:"손해", savingRate:2.90, refund5:89, refund7:95,  refund10:102, uwNote:"암·뇌혈관 경쟁력 · 간편고지 유리" },
  { id:"db",       name:"DB손보",      type:"손해", savingRate:2.82, refund5:88, refund7:94,  refund10:101, uwNote:"뇌심장 업계 최저 수준" },
  { id:"sf",       name:"삼성화재",    type:"손해", savingRate:2.85, refund5:88, refund7:94,  refund10:101, uwNote:"수술비 계열 강세 · 표준 심사" },
  { id:"hanwhaF",  name:"한화손보",    type:"손해", savingRate:2.86, refund5:89, refund7:95,  refund10:102, uwNote:"전담보 중간 · 간편고지 중간" },
  { id:"heungkuk", name:"흥국생명",    type:"생명", savingRate:3.08, refund5:90, refund7:97,  refund10:104, uwNote:"뇌·심장 진단비 생보 최저 수준 · 간편고지 적극" },
  { id:"nonghyup", name:"농협손해보험", type:"손해", savingRate:2.87, refund5:88, refund7:95,  refund10:102, uwNote:"30대 건강담보 경쟁력 · 지역 네트워크 강세" },
  { id:"sl",       name:"삼성생명",    type:"생명", savingRate:3.05, refund5:91, refund7:97,  refund10:104, uwNote:"종신보험 최강 · 심사 엄격" },
  { id:"hl",       name:"한화생명",    type:"생명", savingRate:3.15, refund5:92, refund7:98,  refund10:105, uwNote:"질병사망 경쟁력 · 생보 표준심사" },
  { id:"kyobo",    name:"교보생명",    type:"생명", savingRate:3.00, refund5:90, refund7:97,  refund10:104, uwNote:"간병 강세 · 심사 엄격" },
  { id:"shinhan",  name:"신한라이프",  type:"생명", savingRate:3.18, refund5:91, refund7:99,  refund10:106, uwNote:"암진단비 경쟁력 · 간편고지 손보 수준" },
  { id:"kbLife",   name:"KB라이프",    type:"생명", savingRate:3.10, refund5:90, refund7:98,  refund10:105, uwNote:"뇌·심장·암 진단비 저렴 · 간편고지 적극" },
  { id:"mirae",    name:"미래에셋생명", type:"생명", savingRate:3.12, refund5:90, refund7:98,  refund10:105, uwNote:"암진단비 최저 수준 · 간편고지 유연" },
]

// ══════════════════════════════════════════════════════════
// 담보
// ══════════════════════════════════════════════════════════
type Coverage = {
  id:string; title:string; scope:ScopeType
  category:"암"|"뇌심장"|"수술"|"간병"|"사망"
  amount:Record<PlanLevel,number>; unit:string; baseRate:number
  checkPoint:string; rankNote:string
  sensitivityTags:("나이"|"성별"|"유병력")[]
  active:Record<PlanLevel,boolean>
}

const HEALTH_COV: Coverage[] = [
  { id:"cancer",      title:"암 진단비",           scope:"",       category:"암",     unit:"만원", baseRate:7.84,  active:{min:true,  standard:true,  full:true},  amount:{min:2000,standard:3000,full:5000},  sensitivityTags:["나이","유병력"], checkPoint:"면책90일·감액기간·유사암한도", rankNote:"40대: 미래에셋·신한·KB라이프 최저 / 50대↑: 생보가 손보 역전 / 유병력 시 격차 더 확대" },
  { id:"similar",     title:"유사암·소액암 진단비", scope:"",       category:"암",     unit:"만원", baseRate:3.61,  active:{min:false, standard:true,  full:true},  amount:{min:0,   standard:1000, full:2000}, sensitivityTags:["성별"],          checkPoint:"일반암 대비 지급금액 차이",   rankNote:"여성 60%↑·성별 따라 회사 순위 달라짐" },
  { id:"brain_wide",  title:"뇌혈관질환 진단비",    scope:"wide",   category:"뇌심장", unit:"만원", baseRate:9.76,  active:{min:true,  standard:true,  full:true},  amount:{min:1000,standard:1000,full:2000}, sensitivityTags:["나이","성별"],    checkPoint:"뇌출혈/뇌졸중/뇌혈관질환 구분", rankNote:"KB라이프·흥국생명 전 연령 최저 / 50대↑: DB손보 대비 격차 더 벌어짐 / 남성 50%↑" },
  { id:"brain_narrow",title:"뇌출혈 진단비",         scope:"narrow", category:"뇌심장", unit:"만원", baseRate:6.24,  active:{min:false, standard:true,  full:true},  amount:{min:0,   standard:1000, full:1000}, sensitivityTags:["나이","성별"],    checkPoint:"뇌혈관질환보다 좁은 범위",   rankNote:"광의(뇌혈관질환) 대비 30~40% 저렴" },
  { id:"heart_wide",  title:"허혈성심장질환 진단비", scope:"wide",   category:"뇌심장", unit:"만원", baseRate:8.64,  active:{min:true,  standard:true,  full:true},  amount:{min:1000,standard:1000,full:2000}, sensitivityTags:["나이","성별"],    checkPoint:"급성심근경색/허혈성심장질환 구분", rankNote:"KB라이프·흥국생명 전 연령 최저 / 50대↑: 손보와 격차 확대 / 남성 30%↑ 성별 차이 최대" },
  { id:"heart_narrow",title:"급성심근경색 진단비",   scope:"narrow", category:"뇌심장", unit:"만원", baseRate:5.25,  active:{min:false, standard:true,  full:true},  amount:{min:0,   standard:1000, full:1000}, sensitivityTags:["나이","성별"],    checkPoint:"허혈성심장질환보다 좁은 범위", rankNote:"광의(허혈성) 대비 35~45% 저렴" },
  { id:"surgery",     title:"질병수술비",            scope:"",       category:"수술",   unit:"만원", baseRate:150.96,active:{min:false, standard:true,  full:true},  amount:{min:0,   standard:30,   full:50},   sensitivityTags:["나이"],           checkPoint:"동일질병 반복지급·약관상 수술정의", rankNote:"나이 민감 낮음·현대해상·KB손보 강세" },
  { id:"nSurgery",    title:"N대수술비",             scope:"",       category:"수술",   unit:"만원", baseRate:4.59,  active:{min:false, standard:true,  full:true},  amount:{min:0,   standard:1000, full:2000}, sensitivityTags:["나이","성별"],    checkPoint:"포함/제외 수술 목록 확인",   rankNote:"삼성화재 손보 최저·나이 오를수록 생보·손보 격차" },
  { id:"cancerTreat", title:"암주요치료비",           scope:"",       category:"암",     unit:"만원", baseRate:7.93,  active:{min:false, standard:false, full:true},  amount:{min:0,   standard:0,    full:2000}, sensitivityTags:["나이","유병력"],  checkPoint:"치료인정범위·연간한도·지급횟수", rankNote:"메리츠 암 담보 전반 강세" },
  { id:"care",        title:"간병/재가 급여",         scope:"",       category:"간병",   unit:"만원", baseRate:81.42, active:{min:false, standard:false, full:true},  amount:{min:0,   standard:0,    full:100},  sensitivityTags:["나이","성별"],    checkPoint:"장기요양등급·갱신·지급기간",  rankNote:"나이 민감도 최고·60대 40대 대비 4배·생보 강세" },
]
const DEATH_COV: Coverage[] = [
  { id:"whole",       title:"종신보험",              scope:"",       category:"사망",   unit:"만원", baseRate:1.65, active:{min:false,standard:false,full:false},  amount:{min:5000,standard:10000,full:20000}, sensitivityTags:["나이","성별"], checkPoint:"해약환급금·저해약구조·수익자", rankNote:"대형생보(삼성·교보·한화) 유리·손보 가입 시 20%↑" },
  { id:"term",        title:"정기특약/정기보험",      scope:"",       category:"사망",   unit:"만원", baseRate:0.42, active:{min:false,standard:false,full:false},  amount:{min:5000,standard:10000,full:20000}, sensitivityTags:["나이","성별"], checkPoint:"만기 이후 보장 종료·갱신여부", rankNote:"신한라이프·KB라이프 정기 담보 강세" },
  { id:"diseaseDeath",title:"질병사망",              scope:"",       category:"사망",   unit:"만원", baseRate:0.72, active:{min:false,standard:false,full:false},  amount:{min:0,   standard:5000, full:10000}, sensitivityTags:["나이","성별","유병력"], checkPoint:"재해사망 제외여부·보험기간", rankNote:"생보 강세·유병력 시 손보가 오히려 유리한 역전 현상" },
]

// ══════════════════════════════════════════════════════════
// 계수 테이블
// ══════════════════════════════════════════════════════════
// 담보별 회사 경쟁력 계수 (나이 관계없이 담보 특성으로 결정)
// 각 담보별로 어느 회사가 강한지 반영 - CO_AGE와 곱해져 나이별 최저회사 결정
const COV_CO: Record<string,Record<string,number>> = {
  // 암진단비: 미래에셋/신한/KB라이프 저렴 → 손보 중간 → 교보/삼성생명 고가
  cancer:       {mirae:0.78,shinhan:0.80,kbLife:0.82,meritz:0.88,db:0.92,hyundai:0.94,kb:0.94,nonghyup:0.96,hanwhaF:0.99,sf:1.01,heungkuk:1.06,hl:1.08,sl:1.12,kyobo:1.18},
  similar:      {mirae:0.82,meritz:0.84,db:0.86,kb:0.88,hyundai:0.90,nonghyup:0.92,sf:0.94,hanwhaF:0.96,heungkuk:0.98,kbLife:1.00,shinhan:1.04,hl:1.08,sl:1.10,kyobo:1.16},
  // 뇌혈관: KB라이프/흥국생명 저렴 → DB손보 중간 → 교보/삼성 고가
  brain_wide:   {kbLife:0.78,heungkuk:0.80,db:0.87,nonghyup:0.90,hyundai:0.92,kb:0.93,meritz:0.96,sf:0.98,hanwhaF:1.01,mirae:1.04,shinhan:1.08,hl:1.10,sl:1.12,kyobo:1.20},
  brain_narrow: {kbLife:0.78,heungkuk:0.80,db:0.85,nonghyup:0.88,hyundai:0.90,kb:0.92,meritz:0.94,sf:0.96,hanwhaF:0.99,mirae:1.04,shinhan:1.08,hl:1.10,sl:1.12,kyobo:1.20},
  // 허혈성심장: KB라이프/흥국생명 저렴
  heart_wide:   {kbLife:0.78,heungkuk:0.80,db:0.86,nonghyup:0.88,meritz:0.91,kb:0.93,hyundai:0.95,sf:0.97,hanwhaF:1.01,mirae:1.02,shinhan:1.08,hl:1.10,sl:1.12,kyobo:1.20},
  heart_narrow: {kbLife:0.78,heungkuk:0.80,db:0.84,nonghyup:0.87,meritz:0.89,kb:0.91,hyundai:0.93,sf:0.95,hanwhaF:0.99,mirae:1.02,shinhan:1.08,hl:1.10,sl:1.12,kyobo:1.20},
  // 수술비: 손보 저렴 → 생보 고가
  surgery:      {hyundai:0.78,kb:0.80,sf:0.82,db:0.84,meritz:0.87,nonghyup:0.89,hanwhaF:0.91,heungkuk:0.93,kbLife:1.08,mirae:1.10,shinhan:1.10,sl:1.14,hl:1.14,kyobo:1.18},
  nSurgery:     {sf:0.80,db:0.83,kb:0.85,hyundai:0.87,meritz:0.90,nonghyup:0.92,hanwhaF:0.94,heungkuk:0.96,kbLife:1.04,shinhan:1.06,mirae:1.08,sl:1.10,hl:1.12,kyobo:1.14},
  // 암치료비: 메리츠/신한/KB라이프 강세
  cancerTreat:  {meritz:0.80,kbLife:0.83,shinhan:0.85,mirae:0.87,db:0.90,hyundai:0.92,kb:0.93,nonghyup:0.96,sf:0.98,hanwhaF:1.00,heungkuk:1.02,sl:1.06,hl:1.08,kyobo:1.12},
  // 간병: 생보 강세(교보/한화생명)
  care:         {kyobo:0.82,hl:0.84,sl:0.86,kbLife:0.88,shinhan:0.90,mirae:0.92,heungkuk:0.95,nonghyup:0.97,hanwhaF:1.04,sf:1.06,db:1.08,kb:1.10,hyundai:1.12,meritz:1.14},
  whole:        {sl:0.84,hl:0.86,kyobo:0.88,shinhan:0.90,kbLife:0.91,mirae:0.92,heungkuk:0.96,nonghyup:1.04,sf:1.10,hanwhaF:1.12,hyundai:1.14,db:1.16,kb:1.13,meritz:1.18},
  term:         {shinhan:0.82,kbLife:0.84,sl:0.86,hl:0.88,kyobo:0.90,mirae:0.92,heungkuk:0.96,nonghyup:1.02,sf:1.08,hanwhaF:1.12,hyundai:1.14,db:1.15,kb:1.13,meritz:1.16},
  diseaseDeath: {sl:0.84,hl:0.86,kyobo:0.88,shinhan:0.89,kbLife:0.90,mirae:0.91,heungkuk:0.96,nonghyup:1.00,sf:1.08,hanwhaF:1.12,hyundai:1.12,db:1.14,kb:1.12,meritz:1.15},
}
const AGE_F: Record<string,Record<AgeBandKey,number>> = {
  cancer:       {"20s":0.60,"30s":0.80,"40s":1.00,"50s":1.48,"60s":2.30,"70s":3.40,"80s":4.20},
  similar:      {"20s":0.65,"30s":0.85,"40s":1.00,"50s":1.30,"60s":1.78,"70s":2.30,"80s":2.80},
  brain_wide:   {"20s":0.45,"30s":0.68,"40s":1.00,"50s":1.68,"60s":2.92,"70s":4.50,"80s":5.80},
  brain_narrow: {"20s":0.42,"30s":0.65,"40s":1.00,"50s":1.58,"60s":2.70,"70s":4.10,"80s":5.30},
  heart_wide:   {"20s":0.40,"30s":0.65,"40s":1.00,"50s":1.76,"60s":3.18,"70s":5.10,"80s":6.80},
  heart_narrow: {"20s":0.38,"30s":0.62,"40s":1.00,"50s":1.65,"60s":2.95,"70s":4.70,"80s":6.20},
  surgery:      {"20s":0.75,"30s":0.88,"40s":1.00,"50s":1.24,"60s":1.58,"70s":2.00,"80s":2.50},
  nSurgery:     {"20s":0.55,"30s":0.77,"40s":1.00,"50s":1.43,"60s":2.12,"70s":3.20,"80s":4.20},
  cancerTreat:  {"20s":0.60,"30s":0.80,"40s":1.00,"50s":1.48,"60s":2.24,"70s":3.30,"80s":4.10},
  care:         {"20s":0.35,"30s":0.55,"40s":1.00,"50s":1.90,"60s":3.85,"70s":6.50,"80s":9.00},
  whole:        {"20s":0.55,"30s":0.72,"40s":1.00,"50s":1.54,"60s":2.62,"70s":4.00,"80s":5.50},
  term:         {"20s":0.48,"30s":0.65,"40s":1.00,"50s":1.50,"60s":2.45,"70s":3.80,"80s":5.20},
  diseaseDeath: {"20s":0.50,"30s":0.68,"40s":1.00,"50s":1.58,"60s":2.58,"70s":4.00,"80s":5.40},
}
const GENDER_F: Record<string,Record<string,number>> = {
  cancer:{남성:1.06,여성:0.96}, similar:{남성:0.80,여성:1.28},
  brain_wide:{남성:1.24,여성:0.82}, brain_narrow:{남성:1.22,여성:0.83},
  heart_wide:{남성:1.30,여성:0.77}, heart_narrow:{남성:1.28,여성:0.79},
  surgery:{남성:1.05,여성:0.97}, nSurgery:{남성:1.09,여성:0.93},
  cancerTreat:{남성:1.06,여성:0.96}, care:{남성:0.93,여성:1.10},
  whole:{남성:1.20,여성:0.85}, term:{남성:1.22,여성:0.83}, diseaseDeath:{남성:1.18,여성:0.87},
}
// 3·2·5 가장 비쌈(간편고지 가장 느슨) → 표준체 가장 저렴
// 순서: 3·2·5 > 3·3·5 > 3·5·5 > 3·10·5 > 표준체
const DISC_F: Record<string,Record<Disclosure,number>> = {
  meritz:  {standard:1.00,"325":1.38,"335":1.28,"355":1.20,"3105":1.12},
  kb:      {standard:1.00,"325":1.40,"335":1.30,"355":1.22,"3105":1.14},
  hyundai: {standard:1.00,"325":1.42,"335":1.32,"355":1.24,"3105":1.16},
  db:      {standard:1.00,"325":1.42,"335":1.32,"355":1.24,"3105":1.16},
  sf:      {standard:1.00,"325":1.44,"335":1.34,"355":1.26,"3105":1.18},
  hanwhaF: {standard:1.00,"325":1.44,"335":1.34,"355":1.26,"3105":1.18},
  heungkuk:{standard:1.00,"325":1.46,"335":1.36,"355":1.28,"3105":1.20},
  nonghyup:{standard:1.00,"325":1.40,"335":1.30,"355":1.22,"3105":1.14},
  sl:      {standard:1.00,"325":1.50,"335":1.40,"355":1.30,"3105":1.20},
  hl:      {standard:1.00,"325":1.48,"335":1.38,"355":1.28,"3105":1.18},
  kyobo:   {standard:1.00,"325":1.52,"335":1.42,"355":1.32,"3105":1.22},
  shinhan: {standard:1.00,"325":1.46,"335":1.36,"355":1.26,"3105":1.16},
  kbLife:  {standard:1.00,"325":1.48,"335":1.38,"355":1.28,"3105":1.18},
  mirae:   {standard:1.00,"325":1.46,"335":1.36,"355":1.28,"3105":1.18},
}

// ══════════════════════════════════════════════════════════
// 나이대별 회사 경쟁력 조정 (나이에 따라 회사 순위가 달라지는 핵심)
// 1.0=유지, 0.9=10%저렴, 1.1=10%비쌈 — COV_CO에 곱해짐
// ══════════════════════════════════════════════════════════
const CO_AGE_ADJ: Partial<Record<string,Partial<Record<string,Partial<Record<AgeBandKey,number>>>>>> = {
  // 뇌심장: KB라이프·흥국생명 → 고령일수록 큰 강점 / DB손보 → 고령일수록 불리
  brain_wide: {
    kbLife:   {"20s":1.18,"30s":1.10,"40s":1.00,"50s":0.88,"60s":0.80,"70s":0.76,"80s":0.74},
    heungkuk: {"20s":1.14,"30s":1.08,"40s":1.00,"50s":0.90,"60s":0.82,"70s":0.78,"80s":0.76},
    db:       {"20s":0.92,"30s":0.95,"40s":1.00,"50s":1.06,"60s":1.12,"70s":1.16,"80s":1.20},
    sf:       {"20s":0.94,"30s":0.97,"40s":1.00,"50s":1.05,"60s":1.10,"70s":1.13,"80s":1.16},
    hyundai:  {"20s":0.93,"30s":0.96,"40s":1.00,"50s":1.05,"60s":1.11,"70s":1.15,"80s":1.18},
  },
  brain_narrow: {
    kbLife:   {"20s":1.16,"30s":1.08,"40s":1.00,"50s":0.89,"60s":0.82,"70s":0.78,"80s":0.76},
    heungkuk: {"20s":1.12,"30s":1.06,"40s":1.00,"50s":0.91,"60s":0.83,"70s":0.80,"80s":0.78},
    db:       {"20s":0.93,"30s":0.96,"40s":1.00,"50s":1.05,"60s":1.10,"70s":1.14,"80s":1.18},
  },
  heart_wide: {
    kbLife:   {"20s":1.18,"30s":1.10,"40s":1.00,"50s":0.88,"60s":0.80,"70s":0.76,"80s":0.74},
    heungkuk: {"20s":1.14,"30s":1.08,"40s":1.00,"50s":0.90,"60s":0.82,"70s":0.78,"80s":0.76},
    db:       {"20s":0.92,"30s":0.95,"40s":1.00,"50s":1.06,"60s":1.12,"70s":1.16,"80s":1.20},
  },
  heart_narrow: {
    kbLife:   {"20s":1.16,"30s":1.08,"40s":1.00,"50s":0.89,"60s":0.82,"70s":0.78,"80s":0.76},
    heungkuk: {"20s":1.12,"30s":1.06,"40s":1.00,"50s":0.91,"60s":0.83,"70s":0.80,"80s":0.78},
  },
  // 암진단비: 신한·미래에셋·KB라이프 → 50대↑ 큰 강점 / 손보 → 고령 불리
  cancer: {
    shinhan:  {"20s":1.18,"30s":1.10,"40s":1.00,"50s":0.89,"60s":0.82,"70s":0.79,"80s":0.78},
    mirae:    {"20s":1.16,"30s":1.08,"40s":1.00,"50s":0.90,"60s":0.83,"70s":0.80,"80s":0.79},
    kbLife:   {"20s":1.14,"30s":1.06,"40s":1.00,"50s":0.91,"60s":0.84,"70s":0.81,"80s":0.80},
    meritz:   {"20s":0.93,"30s":0.96,"40s":1.00,"50s":1.06,"60s":1.12,"70s":1.16,"80s":1.20},
    hyundai:  {"20s":0.92,"30s":0.95,"40s":1.00,"50s":1.07,"60s":1.14,"70s":1.18,"80s":1.22},
    db:       {"20s":0.93,"30s":0.96,"40s":1.00,"50s":1.06,"60s":1.11,"70s":1.15,"80s":1.19},
  },
  // 수술비: 손보 전 연령 강세, 고령에서 현대해상·KB손보 더 유리
  surgery: {
    hyundai:  {"20s":1.00,"30s":0.98,"40s":1.00,"50s":0.96,"60s":0.92,"70s":0.90,"80s":0.89},
    kb:       {"20s":0.99,"30s":0.98,"40s":1.00,"50s":0.97,"60s":0.93,"70s":0.91,"80s":0.90},
    kyobo:    {"20s":0.96,"30s":0.98,"40s":1.00,"50s":1.03,"60s":1.06,"70s":1.08,"80s":1.10},
  },
}

// ══════════════════════════════════════════════════════════
// 보험료 계산
// ══════════════════════════════════════════════════════════
function calcPrem(co:Company, cov:Coverage, ab:AgeBandKey, gender:string, disc:Disclosure, job:JobGrade, pay:PayPeriod, amt?:number):number {
  const amount = amt ?? cov.amount["standard"]
  if (amount <= 0) return 0
  const af = AGE_F[cov.id]?.[ab] ?? 1.0
  const gf = GENDER_F[cov.id]?.[gender] ?? 1.0
  const df = DISC_F[co.id]?.[disc] ?? 1.0
  const cf = COV_CO[cov.id]?.[co.id] ?? 1.0
  const acf = CO_AGE_ADJ[cov.id]?.[co.id]?.[ab] ?? 1.0
  const jf = JOB_FACTOR[job]
  const pf = PAY_FACTOR[pay] ?? 1.0
  return Math.round(amount * cov.baseRate * af * gf * df * cf * acf * jf * pf)
}
function coTotal(co:Company, covs:Coverage[], pl:PlanLevel, overrides:Record<string,number>, ab:AgeBandKey, gender:string, disc:Disclosure, job:JobGrade, pay:PayPeriod):number {
  return covs.filter(c=>c.active[pl]).reduce((s,c)=>s+calcPrem(co,c,ab,gender,disc,job,pay,overrides[c.id]??c.amount[pl]),0)
}
function crossTotal2(c1:Company, c2:Company, covs:Coverage[], pl:PlanLevel, overrides:Record<string,number>, ab:AgeBandKey, gender:string, disc:Disclosure, job:JobGrade, pay:PayPeriod):number {
  return covs.filter(c=>c.active[pl]).reduce((s,c)=>{
    const amt = overrides[c.id]??c.amount[pl]; if(amt<=0) return s
    return s+Math.min(calcPrem(c1,c,ab,gender,disc,job,pay,amt), calcPrem(c2,c,ab,gender,disc,job,pay,amt))
  },0)
}
function refundRate(co:Company, yr:number, payYrs:number):number {
  if(yr<=1) return Math.max(0, 18+co.refund5*0.06)
  if(yr<=5) return Math.max(0, co.refund5*(yr/5))
  if(yr<=7) return co.refund5+((co.refund7-co.refund5)*(yr-5))/2
  if(yr<=10) return co.refund7+((co.refund10-co.refund7)*(yr-7))/3
  return co.refund10+Math.min(65,(yr-10)*(co.savingRate*0.72))+(payYrs<=10?8:payYrs<=20?4:2)
}

// ══════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════
export default function PremiumComparePage() {
  const [mainTab, setMainTab]     = useState<MainTab>("health")
  const [viewTab, setViewTab]     = useState<ViewTab>("company")
  const [ageBand, setAgeBand]     = useState<AgeBandKey>("40s")
  const [gender,  setGender]      = useState("남성")
  const [driving, setDriving]     = useState<DrivingStatus>("운전자")
  const [jobGrade,setJobGrade]    = useState<JobGrade>("1")
  const [disc,    setDisc]        = useState<Disclosure>("standard")
  const [planLv,  setPlanLv]      = useState<PlanLevel>("standard")
  const [coFilter,setCoFilter]    = useState<CompanyFilter>("전체")
  const [payPeriod,setPayPeriod]  = useState<PayPeriod>(20)
  const [maturity,setMaturity]    = useState(90)
  const [monthlySav,setMonthlySav]= useState(300000)
  const [overrides,setOverrides]  = useState<Record<string,number>>({})
  const [amtOpen, setAmtOpen]     = useState(false)

  const coverages = mainTab==="death" ? DEATH_COV : HEALTH_COV
  const visibleCos = useMemo(()=>COMPANIES.filter(c=>coFilter==="전체"||c.type===coFilter),[coFilter])
  const amt = (cov:Coverage)=>overrides[cov.id]??cov.amount[planLv]

  const handlePlan = (lv:PlanLevel)=>{ setPlanLv(lv); setOverrides({}) }

  // 담보 행 계산
  const rows = useMemo(()=>coverages.map(cov=>{
    const active = cov.active[planLv]
    const a = amt(cov)
    const prems = visibleCos.map(co=>({ co, prem: active&&a>0 ? calcPrem(co,cov,ageBand,gender,disc,jobGrade,payPeriod,a) : 0 }))
    const valid = prems.filter(p=>p.prem>0).sort((a,b)=>a.prem-b.prem)
    return { cov, active, amount:a, prems, best:valid[0], worst:valid[valid.length-1], sorted:valid }
  }),[coverages,planLv,overrides,visibleCos,ageBand,gender,disc,jobGrade,payPeriod])

  // 회사별 합계
  const coTotals = useMemo(()=>visibleCos.map(co=>({
    co, total:coTotal(co,coverages,planLv,overrides,ageBand,gender,disc,jobGrade,payPeriod)
  })).sort((a,b)=>a.total-b.total),[visibleCos,coverages,planLv,overrides,ageBand,gender,disc,jobGrade,payPeriod])

  // 교차설계 (전사 최저)
  const crossBest = rows.reduce((s,r)=>s+(r.best?.prem??0),0)
  const bestSingle = coTotals[0]

  // 경우의 수
  const cases = useMemo(()=>{
    const arr:{ label:string; sublabel:string; total:number; color:string }[]=[]
    // 단독
    coTotals.forEach((ct,i)=>{
      if(ct.total>0) arr.push({ label:`${ct.co.name} 단독`, sublabel:ct.co.type, total:ct.total,
        color:["#1d4ed8","#15803d","#c2410c","#6d28d9","#0e7490","#92400e","#1f2937"][i]||"#374151" })
    })
    // 2사 교차
    for(let i=0;i<Math.min(visibleCos.length,3);i++){
      for(let j=i+1;j<Math.min(visibleCos.length,3);j++){
        const t = crossTotal2(visibleCos[i],visibleCos[j],coverages,planLv,overrides,ageBand,gender,disc,jobGrade,payPeriod)
        if(t>0) arr.push({ label:`${visibleCos[i].name} + ${visibleCos[j].name}`, sublabel:"2사 교차", total:t, color:"#7c3aed" })
      }
    }
    // 전사 교차
    if(crossBest>0) arr.push({ label:"전사 최적 교차설계", sublabel:`${visibleCos.length}개사 담보별 최저 조합`, total:crossBest, color:"#047857" })
    return arr.sort((a,b)=>a.total-b.total)
  },[coTotals,visibleCos,coverages,planLv,overrides,ageBand,gender,disc,jobGrade,payPeriod,crossBest])

  const maxCase = cases.length ? Math.max(...cases.map(c=>c.total)) : 1
  const saving = bestSingle ? Math.max(bestSingle.total-crossBest,0) : 0

  // 납입기간 비교
  const payRows = useMemo(()=>([10,20,30] as PayPeriod[]).map(pp=>({
    period:pp,
    total:visibleCos.reduce((mn,co)=>{
      const t=coTotal(co,coverages,planLv,overrides,ageBand,gender,disc,jobGrade,pp)
      return t>0?Math.min(mn,t):mn
    },Infinity)
  })).filter(r=>r.total!==Infinity),[visibleCos,coverages,planLv,overrides,ageBand,gender,disc,jobGrade])

  // 저축
  const savResults = useMemo(()=>COMPANIES.filter(c=>c.type==="생명").map(co=>{
    const r=co.savingRate/100/12, m=payPeriod*12
    const fv=monthlySav*((Math.pow(1+r,m)-1)/r)
    return {co, fv, pension:fv/240}
  }).sort((a,b)=>b.fv-a.fv),[monthlySav,payPeriod])

  return (
    <div className="min-h-screen bg-[#eef3fb]">
      {/* ── RP 가이드 배너 (상단 sticky) ── */}
      <div className="sticky top-0 z-50 bg-[#0d1f3c] shadow-lg">
        <div className="mx-auto flex max-w-[1500px] items-stretch">
          {/* 로고 */}
          <div className="flex items-center gap-3 border-r border-white/10 px-5 py-2.5">
            <div>
              <p className="text-[14px] font-black text-white">🛡 보험료 비교</p>
              <p className="text-[10px] text-blue-300">교차설계 시스템</p>
            </div>
          </div>
          {/* 보장수준 탭 */}
          {(mainTab==="health"||mainTab==="death") && (
            <div className="flex flex-1 items-stretch">
              {(["min","standard","full"] as PlanLevel[]).map(lv=>(
                <button key={lv} onClick={()=>handlePlan(lv)}
                  className={`flex flex-1 flex-col items-center justify-center border-r border-white/10 py-2 text-center transition-all ${
                    planLv===lv?"border-b-2 border-b-amber-400 bg-white/12 text-white":"text-white/50 hover:bg-white/8 hover:text-white/80"
                  }`}>
                  <p className="text-[13px] font-black">{PLAN_LABEL[lv]}</p>
                  <p className="text-[9px] opacity-75">{PLAN_DESC[lv]}</p>
                </button>
              ))}
              <button onClick={()=>{setPlanLv("standard")}}
                className="flex flex-col items-center justify-center border-r border-white/10 px-4 py-2 text-center text-white/40 hover:text-white/70">
                <p className="text-[12px] font-black">✏️ 수동</p>
                <p className="text-[9px]">직접 조정</p>
              </button>
            </div>
          )}
          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 px-4">
            <button onClick={()=>window.open("/dashboard","_self")} className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-black text-white hover:bg-white/20">대시보드</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6">
        {/* ── 메인 탭 ── */}
        <div className="mb-4 flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {([{id:"health",l:"🏥 건강보험"},{id:"death",l:"🛡 종신·사망"},{id:"saving",l:"💰 단기납·저축"},{id:"dollar",l:"💵 달러종신·연금"}] as {id:MainTab;l:string}[]).map(t=>(
            <button key={t.id} onClick={()=>setMainTab(t.id)}
              className={`flex-1 py-3 text-[13px] font-black transition-all ${mainTab===t.id?"bg-[#1f5597] text-white":"text-slate-500 hover:bg-slate-50"}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── 고객 조건 입력 ── */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-black tracking-wider text-slate-400">고객 조건</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {/* 나이대 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">나이대</p>
              <select value={ageBand} onChange={e=>setAgeBand(e.target.value as AgeBandKey)}
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-[12px] font-bold outline-none focus:border-blue-500">
                {(Object.keys(AGE_LABEL) as AgeBandKey[]).map(k=>(
                  <option key={k} value={k}>{AGE_LABEL[k]}({AGE_MAP[k]}세)</option>
                ))}
              </select>
            </div>
            {/* 성별 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">성별</p>
              <div className="flex h-9 gap-1">
                {["남성","여성"].map(g=>(
                  <button key={g} onClick={()=>setGender(g)}
                    className={`flex-1 rounded-xl border-2 text-[12px] font-black transition-all ${gender===g?"border-blue-600 bg-blue-600 text-white":"border-slate-200 text-slate-600"}`}>{g}</button>
                ))}
              </div>
            </div>
            {/* 운전여부 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">운전여부</p>
              <div className="flex h-9 gap-1">
                {(["운전자","비운전자"] as DrivingStatus[]).map(d=>(
                  <button key={d} onClick={()=>setDriving(d)}
                    className={`flex-1 rounded-xl border-2 text-[11px] font-black transition-all ${driving===d?"border-slate-700 bg-slate-700 text-white":"border-slate-200 text-slate-600"}`}>{d}</button>
                ))}
              </div>
            </div>
            {/* 직업급수 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">직업급수</p>
              <div className="flex h-9 gap-1">
                {(["1","2","3"] as JobGrade[]).map(g=>(
                  <button key={g} onClick={()=>setJobGrade(g)}
                    className={`flex-1 rounded-xl border-2 text-[12px] font-black transition-all ${jobGrade===g?"border-indigo-600 bg-indigo-600 text-white":"border-slate-200 text-slate-600"}`}>{g}급</button>
                ))}
              </div>
            </div>
            {/* 고지유형 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">고지유형</p>
              <select value={disc} onChange={e=>setDisc(e.target.value as Disclosure)}
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-[11px] font-bold outline-none focus:border-blue-500">
                {(Object.keys(DISC_LABEL) as Disclosure[]).map(d=>(
                  <option key={d} value={d}>{DISC_LABEL[d]}</option>
                ))}
              </select>
            </div>
            {/* 보험사 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">보험사 기준</p>
              <div className="flex h-9 gap-1">
                {(["전체","손해","생명"] as CompanyFilter[]).map(f=>(
                  <button key={f} onClick={()=>setCoFilter(f)}
                    className={`flex-1 rounded-xl border-2 text-[11px] font-black transition-all ${coFilter===f?"border-orange-600 bg-orange-600 text-white":"border-slate-200 text-slate-600"}`}>{f}</button>
                ))}
              </div>
            </div>
            {/* 납입기간 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">납입기간</p>
              <div className="flex h-9 gap-1">
                {([10,20,30] as PayPeriod[]).map(p=>(
                  <button key={p} onClick={()=>setPayPeriod(p)}
                    className={`flex-1 rounded-xl border-2 text-[11px] font-black transition-all ${payPeriod===p?"border-purple-600 bg-purple-600 text-white":"border-slate-200 text-slate-600"}`}>{p}년</button>
                ))}
              </div>
            </div>
            {/* 만기나이 */}
            <div>
              <p className="mb-1 text-[10px] font-black text-slate-500">만기나이</p>
              <select value={maturity} onChange={e=>setMaturity(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-[12px] font-bold outline-none focus:border-blue-500">
                {[80,90,100,110].map(a=><option key={a} value={a}>{a}세</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── 건강/사망 탭 ── */}
        {(mainTab==="health"||mainTab==="death") && (<>

          {/* 담보금액 조정 */}
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button onClick={()=>setAmtOpen(!amtOpen)}
              className="flex w-full items-center justify-between px-5 py-3 text-[12px] font-black text-slate-700">
              <span>💊 담보금액 개별 조정 <span className="text-[10px] font-bold text-slate-400">({PLAN_LABEL[planLv]} 기준 자동적용)</span></span>
              {amtOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </button>
            {amtOpen && (
              <div className="border-t px-5 pb-4">
                <div className="flex justify-end py-2">
                  <button onClick={()=>setOverrides({})} className="rounded-lg border px-3 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-50">기본값 초기화</button>
                </div>
                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {coverages.filter(c=>c.active[planLv]).map(cov=>{
                    const cur=overrides[cov.id]??cov.amount[planLv]
                    const changed=cur!==cov.amount[planLv]
                    return (
                      <label key={cov.id} className={`rounded-xl border p-3 ${changed?"border-blue-300 bg-blue-50/50":"border-slate-100 bg-slate-50"}`}>
                        <p className="mb-1.5 text-[12px] font-black">{cov.title}</p>
                        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <input type="number" min={0} step={100} value={cur}
                            onChange={e=>{const v=Number(e.target.value)||0; setOverrides(p=>{const next={...p}; if(v===cov.amount[planLv]) delete next[cov.id]; else next[cov.id]=v; return next})}}
                            className="min-w-0 flex-1 px-2 py-2 text-[13px] font-black outline-none"/>
                          <span className="border-l px-2 py-2 text-[10px] font-black text-slate-500">{cov.unit}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 납입기간 비교 */}
          {payRows.length>0 && (
            <section className="mb-4 rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
              <p className="mb-2.5 text-[11px] font-black text-purple-700">⏱ 납입기간별 월 보험료 비교 (최저 회사 기준)</p>
              <div className="grid grid-cols-3 gap-3">
                {payRows.map(r=>{
                  const pct=Math.round(r.total/Math.max(...payRows.map(x=>x.total))*100)
                  const isCur=r.period===payPeriod
                  return (
                    <button key={r.period} onClick={()=>setPayPeriod(r.period)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${isCur?"border-purple-600 bg-purple-50":"border-slate-200 hover:border-purple-300"}`}>
                      <p className={`mb-1 text-[12px] font-black ${isCur?"text-purple-700":"text-slate-700"}`}>{r.period}년납</p>
                      <div className="mb-1.5 h-1.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-purple-400" style={{width:`${pct}%`}}/>
                      </div>
                      <p className={`text-[14px] font-black ${isCur?"text-purple-700":"text-slate-900"}`}>{f(r.total)}<span className="text-[10px] font-bold opacity-50">/월</span></p>
                      <p className="text-[10px] text-slate-400">총 납입 {f(r.total*r.period*12)}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* 교차설계 절감 배너 */}
          {bestSingle && saving>0 && (
            <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2f5c] to-[#1f5597] text-white shadow-lg">
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-300"/>
                <p className="text-[11px] font-black text-blue-200">
                  {AGE_LABEL[ageBand]} · {gender} · {DISC_LABEL[disc]} · {payPeriod}년납
                </p>
              </div>
              <div className="grid grid-cols-3 gap-0 px-3 pb-4">
                <div className="rounded-2xl bg-white/10 p-4 mx-1.5">
                  <p className="text-[10px] font-black text-blue-200 mb-1">단일회사 최저</p>
                  <p className="text-xl font-black">{f(bestSingle.total)}<span className="text-[10px] opacity-60">/월</span></p>
                  <p className="mt-0.5 text-[11px] text-blue-200">{bestSingle.co.name}</p>
                  <p className="mt-1 text-[9px] text-white/50">총 납입 {f(bestSingle.total*payPeriod*12)}</p>
                </div>
                <div className="rounded-2xl bg-yellow-400/20 border border-yellow-300/30 p-4 mx-1.5 flex flex-col items-center justify-center text-center">
                  <TrendingDown size={16} className="text-yellow-300 mb-1"/>
                  <p className="text-[10px] font-black text-yellow-200 mb-0.5">교차설계 절감</p>
                  <p className="text-2xl font-black text-yellow-300">{f(saving)}<span className="text-[11px] opacity-70">/월</span></p>
                  <p className="mt-1 text-[10px] text-yellow-200">{payPeriod*12}개월 총 {f(saving*payPeriod*12)}</p>
                  <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-red-500/20 px-2 py-0.5">
                    <AlertCircle size={9}/>
                    <p className="text-[9px] font-black text-red-200">사람이 직접 계산 불가능</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-400/15 border border-emerald-300/30 p-4 mx-1.5">
                  <p className="text-[10px] font-black text-emerald-300 mb-1">담보별 교차설계</p>
                  <p className="text-xl font-black">{f(crossBest)}<span className="text-[10px] opacity-60">/월</span></p>
                  <p className="mt-0.5 text-[11px] text-emerald-300">담보별 최저회사 자동 조합</p>
                  <p className="mt-1 text-[9px] text-white/50">총 납입 {f(crossBest*payPeriod*12)}</p>
                </div>
              </div>
            </section>
          )}

          {/* 보기 전환 탭 */}
          <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            {([["company","📊 회사별 비교"],["coverage","📋 담보별 범위"],["cross","🔀 경우의 수"]] as [ViewTab,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setViewTab(v)}
                className={`rounded-xl py-2.5 text-[13px] font-black transition-all ${viewTab===v?"bg-[#1f5597] text-white":"text-slate-500 hover:bg-slate-50"}`}>
                {l}
              </button>
            ))}
          </div>

          {viewTab==="company" && <CompanyView totals={coTotals} rows={rows} months={payPeriod*12} crossBest={crossBest}/>}
          {viewTab==="coverage" && <CoverageView rows={rows}/>}
          {viewTab==="cross" && <CasesView cases={cases} maxVal={maxCase} crossBest={crossBest} bestSingle={bestSingle?.total??0} rows={rows} payPeriod={payPeriod}/>}
        </>)}

        {/* ── 저축 탭 ── */}
        {mainTab==="saving" && <SavingView results={savResults} monthly={monthlySav} payYrs={payPeriod}/>}

        {/* ── 달러 탭 ── */}
        {mainTab==="dollar" && <DollarView ageBand={ageBand} gender={gender} payPeriod={payPeriod}/>}

        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-900">
          ※ 위 보험료 비교는 나이·성별·인수기준 기반의 <strong>방향성 예시</strong>입니다. 개인의 직업·성별·병력에 따라 실제 설계 결과와 다를 수 있습니다.
          실제 보험료는 산출일·심사결과·약관개정에 따라 달라지며, 이 도구는 담보별 최적 회사 조합을 시각화하는 <strong>상담 보조 도구</strong>입니다.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// 회사별 비교
// ══════════════════════════════════════════════════════════
function CompanyView({ totals, rows, months, crossBest }: {
  totals:{co:Company;total:number}[]
  rows:{cov:Coverage;best?:{co:Company;prem:number};worst?:{co:Company;prem:number}}[]
  months:number; crossBest:number
}) {
  const low = totals[0]?.total??0
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-3 text-white">
        <h2 className="text-[14px] font-black">회사별 총 보험료 순위</h2>
        <p className="text-[10px] text-blue-200">현재 조건 기준 · 선택 담보 합산</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[800px] w-full border-collapse text-[12px]">
          <thead className="bg-slate-100 text-[10px]">
            <tr>
              <th className="p-3 w-10">순위</th><th className="p-3 text-left">보험사</th>
              <th className="p-3">구분</th><th className="p-3">월 보험료</th>
              <th className="p-3">총 납입</th><th className="p-3">교차 대비</th>
              <th className="p-3 text-left">인수 특성</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((item,i)=>{
              const strong=rows.filter(r=>r.best?.co.id===item.co.id).map(r=>r.cov.title)
              return (
                <tr key={item.co.id} className={`border-b border-slate-100 ${item.total===low?"bg-blue-50/30":""}`}>
                  <td className="p-3 text-center">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${i===0?"bg-yellow-100 text-yellow-700":i===1?"bg-slate-100 text-slate-500":i===2?"bg-amber-100 text-amber-600":"bg-slate-50 text-slate-400"}`}>{i+1}</span>
                  </td>
                  <td className="p-3 font-black">{item.co.name}</td>
                  <td className="p-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${item.co.type==="생명"?"bg-blue-100 text-blue-700":"bg-orange-100 text-orange-700"}`}>{item.co.type}</span></td>
                  <td className={`p-3 text-center text-[14px] font-black ${item.total===low?"text-blue-600":""}`}>{f(item.total)}</td>
                  <td className="p-3 text-center font-black">{f(item.total*months)}</td>
                  <td className="p-3 text-center font-bold">{item.total>crossBest?<span className="text-orange-600">+{f(item.total-crossBest)}</span>:<span className="text-emerald-600">교차동일</span>}</td>
                  <td className="p-3 text-[10px] text-slate-500 max-w-[200px]">{strong.slice(0,2).join(" · ")||item.co.uwNote}</td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-purple-200 bg-purple-50/40">
              <td className="p-3 text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-[12px] text-purple-700">★</span></td>
              <td className="p-3 font-black text-purple-700">🔀 교차설계</td>
              <td className="p-3 text-center"><span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700">최적</span></td>
              <td className="p-3 text-center text-[14px] font-black text-purple-700">{f(crossBest)}</td>
              <td className="p-3 text-center font-black text-purple-700">{f(crossBest*months)}</td>
              <td className="p-3 text-center font-black text-emerald-600">기준</td>
              <td className="p-3 text-[10px] font-bold text-purple-600" colSpan={1}>담보별 최저회사 자동 조합 — 사람이 직접 불가능</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════
// 담보별 범위
// ══════════════════════════════════════════════════════════
function CoverageView({ rows }: {
  rows:{cov:Coverage;active:boolean;amount:number;best?:{co:Company;prem:number};worst?:{co:Company;prem:number};sorted:{co:Company;prem:number}[]}[]
}) {
  const [exp,setExp]=useState<string|null>(null)
  const catColor:Record<string,string>={ 암:"bg-blue-100 text-blue-800", 뇌심장:"bg-purple-100 text-purple-800", 수술:"bg-green-100 text-green-800", 간병:"bg-amber-100 text-amber-800", 사망:"bg-red-100 text-red-800" }
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-3 text-white">
        <h2 className="text-[14px] font-black">담보별 최저·최고 범위 · 광의/협의 비교</h2>
        <p className="text-[10px] text-blue-200">담보명 클릭 시 전사 순위 · 광의(넓은 보장)는 더 비쌈</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-[11px]">
          <thead className="bg-slate-100 text-[10px]">
            <tr>
              <th className="p-2.5 text-left">담보명</th><th className="p-2.5">가입금액</th>
              <th className="p-2.5">최저</th><th className="p-2.5">최고</th>
              <th className="p-2.5">범위차이</th><th className="p-2.5 min-w-[120px]">범위 바</th>
              <th className="p-2.5 text-left">순위 특성</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row=>{
              if(!row.active) return null
              const diff=(row.worst?.prem??0)-(row.best?.prem??0)
              const pctLow=row.best&&row.worst&&row.worst.prem>0?Math.round(row.best.prem/row.worst.prem*100):50
              const isExp=exp===row.cov.id
              return (<>
                <tr key={row.cov.id} onClick={()=>setExp(isExp?null:row.cov.id)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-[12px]">{row.cov.title}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${catColor[row.cov.category]||""}`}>{row.cov.category}</span>
                      <span className="text-slate-300 text-[10px]">{isExp?"▲":"▼"}</span>
                    </div>
                    <div className="flex gap-1 mt-0.5">
                      {row.cov.sensitivityTags.map(t=><span key={t} className={`text-[8px] px-1 py-0.5 rounded font-black ${t==="나이"?"bg-orange-100 text-orange-700":t==="성별"?"bg-pink-100 text-pink-700":"bg-purple-100 text-purple-700"}`}>{t}민감</span>)}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-black text-blue-600">{fm(row.amount)}</td>
                  <td className="p-2.5 text-center font-black text-emerald-600">{f(row.best?.prem??0)}</td>
                  <td className="p-2.5 text-center font-black text-red-500">{f(row.worst?.prem??0)}</td>
                  <td className="p-2.5 text-center font-black text-orange-600">+{f(diff)}</td>
                  <td className="p-2.5">
                    <div className="relative h-3 rounded-full bg-slate-100">
                      <div className="absolute left-0 top-0 h-full rounded-l-full bg-emerald-400" style={{width:`${pctLow}%`}}/>
                      <div className="absolute top-0 h-full rounded-r-full bg-red-400" style={{left:`${pctLow}%`,right:0}}/>
                    </div>
                    <p className="mt-0.5 text-center text-[8px] text-slate-400">최저↔최고</p>
                  </td>
                  <td className="p-2.5 text-[10px] text-slate-500 max-w-[200px] leading-4">{row.cov.rankNote}</td>
                </tr>
                {isExp && (
                  <tr key={`${row.cov.id}-exp`} className="border-b border-slate-200 bg-slate-50">
                    <td colSpan={7} className="px-4 py-3">
                      <p className="mb-2 text-[9px] font-black text-slate-400 tracking-wider">전 회사 순위</p>
                      <div className="flex flex-wrap gap-1.5">
                        {row.sorted.map((item,i)=>(
                          <div key={item.co.id} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${i===0?"bg-blue-50 border-blue-200":i===row.sorted.length-1?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                            <span className={`text-[10px] font-black ${i===0?"text-blue-600":i===row.sorted.length-1?"text-red-500":"text-slate-400"}`}>{i+1}위</span>
                            <span className="font-black text-slate-700">{item.co.name}</span>
                            <span className={i===0?"text-blue-600":i===row.sorted.length-1?"text-red-500":"text-slate-600"}>{f(item.prem)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>)
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════
// 경우의 수 + 교차설계 상세
// ══════════════════════════════════════════════════════════
function CasesView({ cases, maxVal, crossBest, bestSingle, rows, payPeriod }: {
  cases:{label:string;sublabel:string;total:number;color:string}[]
  maxVal:number; crossBest:number; bestSingle:number; payPeriod:number
  rows:{cov:Coverage;active:boolean;best?:{co:Company;prem:number}}[]
}) {
  const minVal = cases.length?cases[0].total:0
  const crossRows = rows.filter(r=>r.active&&(r.best?.prem??0)>0)
  return (
    <div className="mb-4 space-y-4">
      {/* 경우의 수 카드 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[12px] font-black text-slate-700">🔀 경우의 수 비교 — 낮은 보험료 순</p>
        <div className={`grid gap-3 ${cases.length<=3?"grid-cols-3":cases.length<=4?"grid-cols-4":"grid-cols-3 md:grid-cols-4"}`}>
          {cases.map((c,i)=>{
            const pct=maxVal>0?Math.round(c.total/maxVal*100):0
            const isBest=i===0
            const saveAmt=c.total-minVal
            return (
              <div key={c.label} className="overflow-hidden rounded-2xl shadow-sm border border-slate-100">
                <div className="p-3" style={{background:c.color}}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black text-white/80">{c.sublabel}{isBest&&" 🏆"}</p>
                      <p className="text-[11px] font-black text-white mt-0.5 leading-4">{c.label}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[18px] font-black text-white">{f(c.total)}</p>
                  <p className="text-[9px] text-white/60">/월 · 총 {f(c.total*payPeriod*12)}</p>
                </div>
                <div className="bg-white p-2.5">
                  <div className="mb-1.5 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:c.color}}/>
                  </div>
                  {isBest
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">✔ 최저 보험료</span>
                    : saveAmt>0
                      ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">최저보다 +{f(saveAmt)}</span>
                      : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 교차설계 담보별 상세 */}
      {crossRows.length>0 && (
        <section className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
          <div className="bg-[#4c1d95] px-5 py-3 text-white">
            <h2 className="text-[14px] font-black">🔀 교차설계 담보별 상세 — 전사 최적 조합</h2>
            <p className="text-[10px] text-purple-200">각 담보마다 가장 저렴한 회사를 자동 선택한 결과</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-collapse text-[11px]">
              <thead className="bg-purple-50 text-[10px]">
                <tr>
                  <th className="p-3 text-left">담보명</th>
                  <th className="p-3">가입금액</th>
                  <th className="p-3 text-purple-700">선택 회사</th>
                  <th className="p-3 text-purple-700">보험료</th>
                </tr>
              </thead>
              <tbody>
                {crossRows.map(row=>(
                  <tr key={row.cov.id} className="border-b border-slate-100">
                    <td className="p-3 font-black">{row.cov.title}</td>
                    <td className="p-3 text-center font-bold text-blue-600">{fm(row.cov.amount["standard"])}</td>
                    <td className="p-3 text-center font-black text-purple-700">{row.best?.co.name}</td>
                    <td className="p-3 text-center font-black text-emerald-600">{f(row.best?.prem??0)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-purple-300 bg-purple-50">
                  <td colSpan={3} className="p-3 text-right font-black text-purple-700">교차설계 합계</td>
                  <td className="p-3 text-center text-[15px] font-black text-purple-700">{f(crossBest)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// 저축성
// ══════════════════════════════════════════════════════════
function SavingView({ results, monthly, payYrs }: {results:{co:Company;fv:number;pension:number}[];monthly:number;payYrs:number}) {
  const months=payYrs*12
  const yrs=[1,2,3,5,7,10,15,20,25,30]
  const matrix=yrs.map(yr=>{
    const cells=results.map(r=>({co:r.co,amount:monthly*Math.min(yr,payYrs)*12*(refundRate(r.co,yr,payYrs)/100),rate:refundRate(r.co,yr,payYrs)}))
    const valid=cells.filter(c=>c.amount>0)
    return {yr,cells,min:Math.min(...valid.map(c=>c.amount)),max:Math.max(...valid.map(c=>c.amount))}
  })
  return (
    <div className="space-y-4 mb-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-3 text-white"><h2 className="text-[14px] font-black">단기납 종신·저축성 환급률 비교</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse text-[11px]">
            <thead className="bg-slate-100 text-[10px]">
              <tr><th className="p-3 text-left">보험사</th><th className="p-3">예시이율</th><th className="p-3">5년</th><th className="p-3">7년</th><th className="p-3">10년</th><th className="p-3">총납입</th><th className="p-3">적립액</th><th className="p-3">월연금</th></tr>
            </thead>
            <tbody>
              {results.map((r,i)=>(
                <tr key={r.co.id} className="border-b border-slate-100">
                  <td className="p-3 font-black">{r.co.name}</td>
                  <td className="p-3 text-center font-black text-blue-600">{r.co.savingRate}%</td>
                  <td className="p-3 text-center">{r.co.refund5}%</td>
                  <td className="p-3 text-center">{r.co.refund7}%</td>
                  <td className="p-3 text-center">{r.co.refund10}%</td>
                  <td className="p-3 text-center font-bold">{f(monthly*months)}</td>
                  <td className={`p-3 text-center font-black ${i===0?"text-blue-600":""}`}>{f(r.fv)}</td>
                  <td className="p-3 text-center font-black text-emerald-600">{f(r.pension)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-3 text-white"><h2 className="text-[14px] font-black">연차별 해약환급금 비교</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-[10px]">
                <th className="sticky left-0 z-10 bg-slate-100 p-3 text-left">연차</th>
                {results.map(r=><th key={r.co.id} className="p-3 min-w-[120px]"><p className="font-black">{r.co.name}</p><p className="text-[9px] text-slate-400">{r.co.refund10}%</p></th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map(row=>(
                <tr key={row.yr} className={`border-b border-slate-100 ${[5,10,20].includes(row.yr)?"bg-slate-50":""}`}>
                  <td className="sticky left-0 z-10 bg-inherit p-3 font-black">{row.yr}년</td>
                  {row.cells.map(cell=>(
                    <td key={cell.co.id} className={`p-3 text-center font-black ${cell.amount===row.max?"text-blue-600":cell.amount===row.min?"text-red-500":""}`}>
                      <p>{f(cell.amount)}</p>
                      <p className="text-[9px]">({cell.rate.toFixed(1)}%)</p>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// 달러 상품
// ══════════════════════════════════════════════════════════
type DollarProd={id:string;name:string;company:string;type:string;base:Record<AgeBandKey,Record<"남성"|"여성",number>>;r10:number;r20:number;r30:number;pension:number;note:string}
const DOLLAR_PRODS:DollarProd[]=[
  {id:"sl_w",name:"삼성 달러종신",company:"삼성생명",type:"달러종신",base:{"20s":{"남성":48000,"여성":41000},"30s":{"남성":62000,"여성":53000},"40s":{"남성":88000,"여성":74000},"50s":{"남성":138000,"여성":114000},"60s":{"남성":220000,"여성":178000},"70s":{"남성":0,"여성":0},"80s":{"남성":0,"여성":0}},r10:82,r20:104,r30:138,pension:380,note:"삼성생명 공시이율 달러종신"},
  {id:"hl_w",name:"한화 달러종신",company:"한화생명",type:"달러종신",base:{"20s":{"남성":46000,"여성":39000},"30s":{"남성":60000,"여성":51000},"40s":{"남성":85000,"여성":72000},"50s":{"남성":134000,"여성":110000},"60s":{"남성":214000,"여성":172000},"70s":{"남성":0,"여성":0},"80s":{"남성":0,"여성":0}},r10:83,r20:106,r30:142,pension:390,note:"환급률 경쟁력"},
  {id:"kyobo_w",name:"교보 달러종신",company:"교보생명",type:"달러종신",base:{"20s":{"남성":47000,"여성":40000},"30s":{"남성":61000,"여성":52000},"40s":{"남성":86000,"여성":73000},"50s":{"남성":136000,"여성":112000},"60s":{"남성":216000,"여성":174000},"70s":{"남성":0,"여성":0},"80s":{"남성":0,"여성":0}},r10:81,r20:103,r30:136,pension:375,note:"교보생명 브랜드"},
  {id:"sl_a",name:"삼성 달러연금",company:"삼성생명",type:"달러연금",base:{"20s":{"남성":45000,"여성":44000},"30s":{"남성":58000,"여성":57000},"40s":{"남성":82000,"여성":80000},"50s":{"남성":128000,"여성":125000},"60s":{"남성":0,"여성":0},"70s":{"남성":0,"여성":0},"80s":{"남성":0,"여성":0}},r10:88,r20:112,r30:155,pension:420,note:"장수리스크 대비 연금전환"},
  {id:"hl_a",name:"한화 달러연금",company:"한화생명",type:"달러연금",base:{"20s":{"남성":44000,"여성":43000},"30s":{"남성":57000,"여성":56000},"40s":{"남성":80000,"여성":78000},"50s":{"남성":125000,"여성":122000},"60s":{"남성":0,"여성":0},"70s":{"남성":0,"여성":0},"80s":{"남성":0,"여성":0}},r10:89,r20:114,r30:158,pension:430,note:"환급률 최상위"},
]
function DollarView({ageBand,gender,payPeriod}:{ageBand:AgeBandKey;gender:string;payPeriod:PayPeriod}) {
  const pf=PAY_FACTOR[payPeriod]??1
  const eligible=DOLLAR_PRODS.filter(p=>p.base[ageBand][(gender as "남성"|"여성")]>0)
  return (
    <div className="mb-4 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-3 text-white">
          <h2 className="text-[14px] font-black">💵 달러종신 · 달러연금 비교</h2>
          <p className="text-[10px] text-blue-200">기준: 1만달러 · {AGE_LABEL[ageBand]} · {gender} · {payPeriod}년납 · 환율 1,350원</p>
        </div>
        {eligible.length===0
          ? <p className="p-8 text-center text-[13px] font-bold text-slate-400">선택한 나이대({AGE_LABEL[ageBand]})는 가입 불가. 다른 나이대를 선택하세요.</p>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full border-collapse text-[11px]">
                <thead className="bg-slate-100 text-[10px]">
                  <tr><th className="p-3 text-left">상품</th><th className="p-3">보험사</th><th className="p-3">유형</th><th className="p-3">월보험료(원)</th><th className="p-3">10년환급</th><th className="p-3">20년환급</th><th className="p-3">30년환급</th><th className="p-3">월연금($)</th><th className="p-3 text-left">특성</th></tr>
                </thead>
                <tbody>
                  {eligible.map((p,i)=>{
                    const base=p.base[ageBand][(gender as "남성"|"여성")]
                    const monthly=Math.round(base*pf)
                    return (
                      <tr key={p.id} className={`border-b border-slate-100 ${i===0?"bg-blue-50/20":""}`}>
                        <td className="p-3 font-black">{p.name}</td>
                        <td className="p-3 text-center font-bold">{p.company}</td>
                        <td className="p-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${p.type==="달러종신"?"bg-blue-100 text-blue-700":"bg-emerald-100 text-emerald-700"}`}>{p.type}</span></td>
                        <td className="p-3 text-center text-[14px] font-black text-blue-700">{f(monthly)}</td>
                        <td className="p-3 text-center">{p.r10}%</td>
                        <td className="p-3 text-center font-bold text-blue-600">{p.r20}%</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{p.r30}%</td>
                        <td className="p-3 text-center font-black text-purple-700">${p.pension}/월</td>
                        <td className="p-3 text-[10px] text-slate-500">{p.note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-900">
        💡 달러 상품은 환율 변동에 따라 원화 환산액이 달라집니다. 장기 자산 분산·달러 헤지 목적. 실제 산출액은 보험사 시스템을 통해 확인하세요.
      </p>
    </div>
  )
}

// ─── 공통 소형 컴포넌트 ───────────────────────────────────
function Input({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]" />
    </label>
  )
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]">
        {options.map((opt) => <option key={opt} value={opt}>{labels?.[opt] || opt}</option>)}
      </select>
    </label>
  )
}
