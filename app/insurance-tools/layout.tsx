// app/insurance-tools/layout.tsx

/**
 * 🎯 [수정 완료] 인증 로직 제거 버전
 * 대시보드(Dashboard) 진입 시 이미 인증이 완료되었으므로, 
 * 하위 도구 레이아웃에서는 중복 검증을 생략하여 세션 튕김 문제를 원천 차단합니다.
 */

export const metadata = {
  title: '보험 전문 도구 | Metarich Signal',
  description: '수술비 · 진단비 · 장해 · 자동차부상 전문 계산기 및 분석 툴',
}

export default function InsuranceToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <main className="relative flex flex-col min-h-screen">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}