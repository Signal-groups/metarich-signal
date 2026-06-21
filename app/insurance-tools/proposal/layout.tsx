export const metadata = {
  title: '제안서 생성 | Metarich Signal',
  description: '단독 및 비교 제안서를 인포그래픽 형태로 제작합니다.',
}

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif" }}>
      {children}
    </div>
  )
}
