'use client'

import { useRouter } from 'next/navigation'

type HubCard = {
  href: string
  icon: string
  iconBg: string
  format: string
  formatBg: string
  formatColor: string
  title: string
  desc: string
  badge: string
}

const HUB_CARDS: HubCard[] = [
  {
    href: '/dm/message',
    icon: '💬',
    iconBg: '#e0f2fe',
    format: '복사',
    formatBg: '#f0fdf4',
    formatColor: '#15803d',
    title: 'DM 메시지',
    desc: '고객별 맞춤 메시지 템플릿을 선택해 바로 복사합니다.',
    badge: '템플릿 선택',
  },
  {
    href: '/dm/content-studio',
    icon: '🖼️',
    iconBg: '#ede9fe',
    format: 'PNG',
    formatBg: '#f5f3ff',
    formatColor: '#6d28d9',
    title: 'DM 정보 작성',
    desc: '관리자 이미지 2장을 선택해 상단·하단 문구와 디자인을 바꿔 저장합니다.',
    badge: '이미지 업로드',
  },
  {
    href: '/dm/cards?tab=fortune',
    icon: '✨',
    iconBg: '#fef9c3',
    format: 'PNG',
    formatBg: '#eff6ff',
    formatColor: '#1d4ed8',
    title: '운세 & 별자리',
    desc: '오늘의 띠 운세와 별자리 운세 카드를 자동 생성합니다.',
    badge: 'AI 생성',
  },
  {
    href: '/dm/cards?tab=anniversary',
    icon: '🎁',
    iconBg: '#fce7f3',
    format: 'PNG',
    formatBg: '#eff6ff',
    formatColor: '#1d4ed8',
    title: '고객 기념일',
    desc: '생일, 명절, 계약기념일 등 축하 카드를 생성합니다.',
    badge: '6종 템플릿',
  },
  {
    href: '/dm/cards?tab=quote',
    icon: '💡',
    iconBg: '#fef3c7',
    format: 'PNG',
    formatBg: '#eff6ff',
    formatColor: '#1d4ed8',
    title: '오늘의 명언',
    desc: '매일 새로운 동기부여 명언 카드를 생성합니다.',
    badge: '매일 교체',
  },
  {
    href: '/dm/cards?tab=health',
    icon: '🏥',
    iconBg: '#dcfce7',
    format: 'PNG',
    formatBg: '#eff6ff',
    formatColor: '#1d4ed8',
    title: '오늘의 건강',
    desc: '매일 다른 건강 정보와 팁을 이미지 카드로 전달합니다.',
    badge: 'AI 생성',
  },
]

export default function DmHubPage() {
  const router = useRouter()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">고객 DM 발송</div>
          <div className="page-subtitle">고객에게 바로 전송할 수 있는 다양한 맞춤형 DM 콘텐츠</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
      }}>
        {HUB_CARDS.map((card) => (
          <HubCardItem key={card.href} card={card} onClick={() => router.push(card.href)} />
        ))}
      </div>
    </>
  )
}

function HubCardItem({ card, onClick }: { card: HubCard; onClick: () => void }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 1px 6px rgba(15,23,42,0.06)',
        transition: 'box-shadow 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(15,23,42,0.12)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(15,23,42,0.06)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
      onClick={onClick}
    >
      {/* 아이콘 + 포맷 배지 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: card.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {card.icon}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: card.formatBg,
          color: card.formatColor,
          borderRadius: 8, padding: '3px 10px',
          letterSpacing: '0.02em',
        }}>
          {card.format}
        </span>
      </div>

      {/* 제목 + 설명 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
          {card.title}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          {card.desc}
        </div>
      </div>

      {/* 하단: 배지 + 바로가기 버튼 */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{card.badge}</span>
        <button
          style={{
            width: '100%',
            background: '#1a2744',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2d4a8a' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1a2744' }}
        >
          바로가기
        </button>
      </div>
    </div>
  )
}
