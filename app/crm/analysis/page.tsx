import { redirect } from 'next/navigation'

// 보장분석 기능은 보장분석 PRO로 통합되었습니다.
// /crm/analysis 접근 시 자동으로 /coverage-pro 로 이동합니다.
export default function AnalysisRedirect({
  searchParams,
}: {
  searchParams: { customerId?: string; customerName?: string }
}) {
  const params = new URLSearchParams()
  if (searchParams.customerId) params.set('customerId', searchParams.customerId)
  if (searchParams.customerName) params.set('customerName', searchParams.customerName)
  const query = params.toString()
  redirect(`/coverage-pro${query ? `?${query}` : ''}`)
}
