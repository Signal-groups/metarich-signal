/**
 * lib/coverageAnalysis/crmBridge.ts
 * CRM 기존 데이터 → ProSession/ProContract 변환
 * 기존 CRM 코드 변경 없이 읽기만 하고 PRO 포맷으로 변환
 */

import { inferRowKey } from './excelTemplate'
import type {
  ProCustomer,
  ProContract,
  ProCoverage,
  ExcelExportInput,
  ExcelContractInput,
} from './types'

// ── CRM 기존 타입 (읽기 전용 참조) ──────────────────────────────────────
interface CrmCustomer {
  id: string
  name?: string
  birth_date?: string
  gender?: string
  phone?: string
  advisor_id?: string
}

interface CrmAnalysisItem {
  id: string
  customer_id?: string
  structuredAnalysis?: {
    contracts?: Array<{
      company?: string
      productName?: string
      contractDate?: string
      paymentPeriod?: string
      monthlyPremium?: number
      coverages?: Array<{
        name?: string
        amount?: number
        isRenewal?: boolean
      }>
    }>
  }
}

// ── CRM 고객 → ProCustomer ────────────────────────────────────────────────
export function crmCustomerToProCustomer(crmCustomer: CrmCustomer): ProCustomer {
  return {
    id: crmCustomer.id,
    name: crmCustomer.name ?? '고객명 없음',
    birth: crmCustomer.birth_date,
    gender: crmCustomer.gender === 'M' || crmCustomer.gender === 'F'
      ? crmCustomer.gender
      : undefined,
    phone: crmCustomer.phone,
    advisorId: crmCustomer.advisor_id ?? '',
  }
}

// ── CRM 분석 데이터 → ProContract[] ──────────────────────────────────────
export function crmAnalysisToProContracts(
  analysisItems: CrmAnalysisItem[],
  customerId?: string
): ProContract[] {
  const contracts: ProContract[] = []

  for (const item of analysisItems) {
    const structured = item.structuredAnalysis
    if (!structured?.contracts?.length) continue

    for (const c of structured.contracts) {
      const coverages: ProCoverage[] = []

      for (const cov of c.coverages ?? []) {
        if (!cov.name) continue
        const rowKey = inferRowKey(cov.name)
        coverages.push({
          id: `${item.id}_${cov.name}`,
          contractId: item.id,
          rowKey: rowKey ?? 'unknown',
          name: cov.name,
          amount: cov.amount ?? 0,
          isRenewal: cov.isRenewal,
        })
      }

      contracts.push({
        id: `${item.id}_${contracts.length}`,
        customerId,
        company: c.company ?? '',
        productName: c.productName ?? '',
        contractDate: c.contractDate,
        paymentPeriod: c.paymentPeriod,
        monthlyPremium: c.monthlyPremium ?? 0,
        status: 'active',
        coverages,
      })
    }
  }

  return contracts
}

// ── ProContract[] → ExcelExportInput ─────────────────────────────────────
export function proContractsToExcelInput(
  customerName: string,
  contracts: ProContract[],
  sheetIndex: 1 | 2 = 1
): ExcelExportInput {
  // 최대 11개 슬롯 (열 F~P)
  const slotted = contracts.slice(0, 11)

  const excelContracts: ExcelContractInput[] = slotted.map((contract, idx) => {
    const coverageRecord: Record<string, number> = {}
    for (const cov of contract.coverages) {
      if (cov.rowKey && cov.rowKey !== 'unknown') {
        coverageRecord[cov.rowKey] = (coverageRecord[cov.rowKey] || 0) + cov.amount
      }
    }

    return {
      slot: idx,
      company: contract.company,
      productName: contract.productName,
      contractDate: contract.contractDate,
      paymentPeriod: contract.paymentPeriod,
      monthlyPremium: contract.monthlyPremium,
      coverages: coverageRecord,
    }
  })

  return {
    customerName,
    sheetIndex,
    contracts: excelContracts,
  }
}
 