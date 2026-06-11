/**
 * lib/coverageAnalysis/types.ts
 * 보장분석 PRO 공통 데이터 타입
 * 코워크 관리 — 변경 시 양측 합의 필요
 */

// ── 고객 ──────────────────────────────────────────────────────────────────
export interface ProCustomer {
  id: string
  name: string
  birth?: string          // YYYY-MM-DD
  gender?: 'M' | 'F'
  phone?: string
  advisorId: string
}

// ── 보험계약 ──────────────────────────────────────────────────────────────
export interface ProContract {
  id: string
  customerId?: string
  company: string         // 보험사명
  productName: string     // 상품명
  policyHolder?: string   // 계약자
  insured?: string        // 피보험자
  contractDate?: string   // 계약일 (YYYY-MM-DD or "24.03.01" 등 자유형)
  paymentPeriod?: string  // 납입기간 & 보장기간 (예: "20년납/80세만기")
  monthlyPremium: number  // 월 보험료 (원)
  isRenewal?: boolean
  status?: 'active' | 'lapsed' | 'expired'
  coverages: ProCoverage[]
}

// ── 담보 ──────────────────────────────────────────────────────────────────
export interface ProCoverage {
  id: string
  contractId: string
  /** 아래 COVERAGE_ROW_MAP의 key와 일치해야 함 */
  rowKey: string
  name: string            // 담보명 (표시용)
  amount: number          // 가입금액 (만원 단위)
  expiryDate?: string
  isRenewal?: boolean
}

// ── 분석 세션 ──────────────────────────────────────────────────────────────
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type StepStatus = 'pending' | 'done' | 'warning'

export interface ProSession {
  id: string
  advisorId: string
  customerId?: string
  customerSnapshot?: ProCustomer
  contracts: ProContract[]
  currentStep: StepNumber
  stepStatus: Partial<Record<StepNumber, StepStatus>>
  remodelProposal?: RemodelProposal
  outputConfig?: OutputConfig
  version: number
  createdAt: string
  updatedAt: string
}

export interface RemodelProposal {
  addContracts: ProContract[]
  removeContractIds: string[]
  memo: string
}

export interface OutputConfig {
  outputType: 'full_pdf' | 'key_pdf' | 'excel'
  includeRemodel: boolean
  includeGraph: boolean
}

// ── 엑셀 출력용 데이터 (API 요청 body) ────────────────────────────────────
export interface ExcelExportInput {
  customerName: string
  sheetIndex?: 1 | 2     // 시트1 or 시트2 (default: 1)
  contracts: ExcelContractInput[]
}

export interface ExcelContractInput {
  /** C=0, E=1, G=2 ... O=6 (최대 7개 슬롯) */
  slot: number
  company: string
  productName: string
  policyHolder?: string   // 계약자/피보험자
  contractDate?: string
  paymentPeriod?: string
  monthlyPremium: number
  /** key: COVERAGE_ROW_MAP의 rowKey, value: 원 단위 금액 */
  coverages: Record<string, number>
}
