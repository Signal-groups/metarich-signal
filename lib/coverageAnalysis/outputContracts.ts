import type { ProContract } from './types'

const MANUAL_CONTRACT_ID = '__manual__'

export function contractsForOutput(contracts: ProContract[]): ProContract[] {
  const manual = contracts.find((contract) => contract.id === MANUAL_CONTRACT_ID)
  if (!manual) return contracts

  const manualRows = new Map(
    manual.coverages
      .filter((coverage) => coverage.rowKey && coverage.rowKey !== 'unknown')
      .map((coverage) => [coverage.rowKey, coverage])
  )
  if (manualRows.size === 0) return contracts.filter((contract) => contract.id !== MANUAL_CONTRACT_ID)

  const sourceContracts = contracts.filter((contract) => contract.id !== MANUAL_CONTRACT_ID)
  const manualPositiveCoverages = Array.from(manualRows.values())
    .filter((coverage) => Number(coverage.amount || 0) > 0)
    .map((coverage) => {
      const sources = sourceContracts.flatMap((contract) =>
        contract.coverages
          .filter((source) => source.rowKey === coverage.rowKey)
          .map((source) => ({ contract, source }))
      )
      const expiries = [...new Set(sources.map(({ source }) => source.expiryDate).filter(Boolean))]
      return {
        ...coverage,
        isRenewal: coverage.isRenewal ?? sources.some(({ contract, source }) => Boolean(source.isRenewal || contract.isRenewal)),
        expiryDate: coverage.expiryDate || (expiries.length === 1 ? expiries[0] : undefined),
      }
    })
  const withoutOverriddenRows = contracts
    .filter((contract) => contract.id !== MANUAL_CONTRACT_ID)
    .map((contract) => ({
      ...contract,
      coverages: contract.coverages.filter((coverage) => !manualRows.has(coverage.rowKey)),
    }))

  if (manualPositiveCoverages.length === 0) return withoutOverriddenRows

  return [
    ...withoutOverriddenRows,
    {
      ...manual,
      company: '수동 조정',
      productName: '보장확인 반영값',
      coverages: manualPositiveCoverages,
    },
  ]
}
