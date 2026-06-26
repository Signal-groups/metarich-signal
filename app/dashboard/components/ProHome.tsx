'use client'

import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronRight, ClipboardCheck, FileSearch, Hospital, Lightbulb,
  Megaphone, PieChart, Scale, Search, ShieldCheck, Star, Stethoscope,
  ScrollText, Users,
} from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { CONSULTING_TOOL_CATEGORIES } from '../../../lib/consultingTools'

/* ── Lucide 아이콘 매핑 ── */
function ToolIcon({ icon, size = 20, className }: { icon: string; size?: number; className?: string }) {
  const props = { size, className }
  switch (icon) {
    case 'cafe':         return <BookOpen {...props} />
    case 'search':       return <Search {...props} />
    case 'hospital':     return <Hospital {...props} />
    case 'crash':        return <Scale {...props} />
    case 'chart':        return <BarChart3 {...props} />
    case 'calculator-car': return <CarFront {...props} />
    case 'code':         return <FileSearch {...props} />
    case 'compare':      return <ArrowLeftRight {...props} />
    case 'surgery':      return <Stethoscope {...props} />
    case 'document':     return <ScrollText {...props} />
    case 'checklist':    return <ClipboardCheck {...props} />
    case 'shield':       return <ShieldCheck {...props} />
    case 'calculator':   return <Calculator {...props} />
    case 'finance':      return <PieChart {...props} />
    case 'exam':         return <BookOpen {...props} />
    case 'dm':           return <ScrollText {...props} />
    default:             return <Search {...props} />
  }
}

interface ProHomeProps {
  user: any
  announcements: any[]
  favorites: string[]
  isFavEditMode: boolean
  visibleTools: ConsultingTool[]
  recentCustomers: any[]
  onFavEditToggle: () => void
  onFavToggle: (id: string) => void
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onUpdateClick: () => void
}

export default function ProHome({
  user,
  announcements,
  favorites,
  isFavEditMode,
  visibleTools,
  recentCustomers,
  onFavEditToggle,
  onFavToggle,
  onNavigate,
  onNoticeClick,
  onUpdateClick,
}: ProHomeProps) {
  const name = user?.name || user?.email?.split('@')[0] || ''
  const noticeCount = announcements.filter((a) => a.category === 'notice').length
  const updateCount = announcements.filter((a) => a.category === 'update').length
  const favoriteTools = visibleTools.filter((t) => favorites.includes(t.id))

  // 대면상담 도구 (face category)
  const faceTools = visibleTools.filter((t) => t.category === 'face')

  // 나머지 카테고리별 분류 (face 제외)
  const nonFaceCategories = CONSULTING_TOOL_CATEGORIES.filter((c) => c.id !== 'face')
  const categorySections = nonFaceCategories.map((cat) => ({
    ...cat,
    tools: visibleTools.filter((t) => t.category === cat.id),
  })).filter((s) => s.tools.length > 0)

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#10203a', lineHeight: 1.3, margin: 0 }}>
            {name}님, 오늘 상담을 시작해볼까요?
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600, color: '#50627a' }}>
            고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <TopBtn icon={<Bell size={13} />} label="공지" count={noticeCount} onClick={onNoticeClick} />
          <TopBtn icon={<Megaphone size={13} />} label="업데이트" count={updateCount} countColor="#0f6e56" onClick={onUpdateClick} />
          <TopBtn icon={<BookOpen size={13} />} label="일반가이드" accent="#1b54ad"
            onClick={() => window.open('/guide.html?tab=basic', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')} />
          <TopBtn
            icon={<Star size={13} style={{ fill: '#f6c342', color: '#f6c342' }} />}
            label="프로가이드"
            onClick={() => window.open('/guide.html?tab=pro', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
          />
          <TopBtn icon={<ShieldCheck size={13} />} label="시그널그룹 홈페이지" filled
            onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')} />
          <TopBtn
            icon={<span style={{ width:15,height:15,background:'#03c75a',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'#fff' }}>N</span>}
            label="보험의 기준 카페"
            onClick={() => { const m=/Android|iPhone|iPad/i.test(navigator.userAgent); window.open(m?'https://m.cafe.naver.com/signal1035':'https://cafe.naver.com/signal1035','_blank') }}
          />
        </div>
      </header>

      {/* ── 즐겨찾기 ── */}
      <section style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Star size={19} style={{ fill:'#172947', color:'#172947' }} />
            <span style={{ fontSize:16, fontWeight:900, color:'#10203a' }}>즐겨찾기</span>
            <Chip>나만의 바로가기</Chip>
          </div>
          <button onClick={onFavEditToggle} style={editBtn}>
            {isFavEditMode ? '완료' : '편집'}
          </button>
        </div>
        {favoriteTools.length === 0 && !isFavEditMode ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'#64748b', fontSize:13, fontWeight:700 }}>
            <Lightbulb size={15} /> 편집을 눌러 자주 쓰는 도구에 ★를 클릭하면 여기에 모입니다.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(88px, 1fr))', gap:9 }}>
            {(isFavEditMode ? visibleTools : favoriteTools).map((tool) => {
              const isFav = favorites.includes(tool.id)
              return (
                <button key={tool.id}
                  onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                  style={{
                    position:'relative', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:7, padding:'12px 8px',
                    background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc',
                    border:`1px solid ${isFavEditMode && isFav ? '#1b54ad' : '#e2e8f0'}`,
                    borderRadius:10, cursor:'pointer', textAlign:'center',
                  }}
                >
                  {isFavEditMode && (
                    <Star size={10} style={{ position:'absolute',top:5,right:5,fill:isFav?'#f59e0b':'none',color:isFav?'#f59e0b':'#cbd5e1' }} />
                  )}
                  <span style={{ color:'#0a3a86' }}><ToolIcon icon={tool.icon} size={18} /></span>
                  <span style={{ fontSize:11, fontWeight:800, color:'#10203a', lineHeight:1.3 }}>{tool.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 최근 고객 ── */}
      {recentCustomers.length > 0 && (
        <section style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Users size={19} color="#10203a" />
              <span style={{ fontSize:16, fontWeight:900, color:'#10203a' }}>최근 상담 고객</span>
              <Chip color="#1b54ad" bg="#eef4fb">CRM 바로가기</Chip>
            </div>
            <button
              onClick={() => window.open(`${window.location.origin}/crm/customers`, '_blank', 'noopener,noreferrer')}
              style={editBtn}
            >전체보기</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:10 }}>
            {recentCustomers.map((c) => (
              <button key={c.id}
                onClick={() => window.open(`${window.location.origin}/crm/customers/${c.id}`, '_blank', 'noopener,noreferrer')}
                style={{ padding:'13px 15px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, textAlign:'left', cursor:'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(16,32,58,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.boxShadow='none' }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:14, fontWeight:900, color:'#10203a' }}>{c.name || '이름 없음'}</span>
                  {c.status && <span style={{ fontSize:10, fontWeight:700, color:c.status==='활동중'?'#0f6e56':'#64748b', background:c.status==='활동중'?'#e1f5ee':'#f1f5f9', borderRadius:12, padding:'2px 7px' }}>{c.status}</span>}
                </div>
                <p style={{ fontSize:12, fontWeight:600, color:'#64748b', margin:0, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {c.consulting_summary || c.memo || c.phone || '상담 내용을 확인하세요.'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 대면상담 ── */}
      {faceTools.length > 0 && (
        <section style={card}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <span style={{ fontSize:16, fontWeight:900, color:'#10203a' }}>대면상담</span>
            <Chip color="#1b54ad" bg="#eef4fb">고객 현장 활용 핵심 도구</Chip>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }}>
            {faceTools.map((tool) => (
              <button key={tool.id}
                onClick={() => onNavigate(tool)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  gap:10, padding:'20px 12px', background:'#f8fafc',
                  border:'1px solid #e2e8f0', borderRadius:12,
                  cursor:'pointer', textAlign:'center', position:'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 4px 16px rgba(16,32,58,0.09)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}
              >
                {tool.isNew && (
                  <span style={{ position:'absolute', top:8, left:10, background:'#e63946', color:'#fff', fontSize:9, fontWeight:900, borderRadius:10, padding:'2px 7px' }}>NEW</span>
                )}
                <span style={{ color:'#0a3a86' }}><ToolIcon icon={tool.icon} size={26} /></span>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:'#10203a' }}>{tool.title}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginTop:3, lineHeight:1.4 }}>{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 카테고리별 도구 (4열 그리드) ── */}
      <section style={{ ...card, padding:0, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {categorySections.map((cat, idx) => (
            <div key={cat.id} style={{
              padding:'18px 20px',
              background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderRight: idx < categorySections.length - 1 ? '1px solid #eef2f8' : 'none',
              boxShadow: idx % 2 !== 0 ? 'inset 0 0 0 1px rgba(16,32,58,0.03)' : 'none',
            }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:900, color:'#10203a' }}>{cat.title}</div>
                <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', marginTop:2 }}>{cat.desc}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {cat.tools.map((tool) => (
                  <button key={tool.id}
                    onClick={() => onNavigate(tool)}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      background:'#fff', border:'1px solid #eef2f8', borderRadius:8,
                      cursor:'pointer', textAlign:'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor='#c7d8f0'; e.currentTarget.style.background='#f7faff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor='#eef2f8'; e.currentTarget.style.background='#fff' }}
                  >
                    <span style={{ width:28,height:28,background:'#f0f5fb',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#0a3a86' }}>
                      <ToolIcon icon={tool.icon} size={14} />
                    </span>
                    <span style={{ flex:1, fontSize:13, fontWeight:800, color:'#10203a' }}>{tool.title}</span>
                    <ChevronRight size={13} color="#94a3b8" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 공지사항 + 업데이트 소식 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
        <section style={card}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Bell size={16} color="#10203a" />
            <span style={{ fontSize:15, fontWeight:900, color:'#10203a' }}>공지사항</span>
            {noticeCount > 0 && <span style={{ fontSize:10, fontWeight:900, color:'#fff', background:'#e63946', borderRadius:99, padding:'1px 7px' }}>{noticeCount}</span>}
          </div>
          {announcements.filter(a => a.category === 'notice').length === 0 ? (
            <p style={{ fontSize:13, color:'#b8ccd8', fontWeight:700 }}>공지사항이 없습니다.</p>
          ) : announcements.filter(a => a.category === 'notice').slice(0,4).map(ann => (
            <button key={ann.id} onClick={onNoticeClick}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 0', borderBottom:'1px solid #f1f5f9', background:'none', border:'none', cursor:'pointer' }}>
              <p style={{ fontSize:13, fontWeight:800, color:'#10203a', margin:0 }}>{ann.title.replace(/^\[.*?\]\s*/, '')}</p>
              <p style={{ fontSize:11, color:'#94a3b8', margin:'3px 0 0' }}>{new Date(ann.created_at).toLocaleDateString('ko-KR')}</p>
            </button>
          ))}
        </section>

        <section style={card}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Megaphone size={16} color="#10203a" />
            <span style={{ fontSize:15, fontWeight:900, color:'#10203a' }}>업데이트 소식</span>
            {updateCount > 0 && <span style={{ fontSize:10, fontWeight:900, color:'#fff', background:'#0f6e56', borderRadius:99, padding:'1px 7px' }}>{updateCount}</span>}
          </div>
          {announcements.filter(a => a.category === 'update').length === 0 ? (
            <p style={{ fontSize:13, color:'#b8ccd8', fontWeight:700 }}>업데이트 소식이 없습니다.</p>
          ) : announcements.filter(a => a.category === 'update').slice(0,4).map(ann => (
            <button key={ann.id} onClick={onUpdateClick}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 0', borderBottom:'1px solid #f1f5f9', background:'none', border:'none', cursor:'pointer' }}>
              <span style={{ background:'#dcfce7', color:'#15803d', fontSize:9, fontWeight:900, borderRadius:12, padding:'2px 7px', marginRight:6 }}>NEW</span>
              <span style={{ fontSize:13, fontWeight:800, color:'#10203a' }}>{ann.title.replace(/^\[.*?\]\s*/, '')}</span>
              <p style={{ fontSize:11, color:'#94a3b8', margin:'3px 0 0' }}>{new Date(ann.created_at).toLocaleDateString('ko-KR')}</p>
            </button>
          ))}
        </section>
      </div>

    </div>
  )
}

const card: React.CSSProperties = {
  background:'#fff', borderRadius:14, border:'1px solid #e8eef5',
  padding:'20px 22px', boxShadow:'0 1px 6px rgba(16,32,58,0.05)',
}
const editBtn: React.CSSProperties = {
  fontSize:12, fontWeight:700, color:'#21324d',
  background:'#f8fafc', border:'1px solid #dce6f1',
  borderRadius:8, padding:'6px 14px', cursor:'pointer',
}

function Chip({ children, color='#4b5d76', bg='#f2f5f9' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, color, background:bg, borderRadius:20, padding:'2px 9px' }}>
      {children}
    </span>
  )
}

function TopBtn({ icon, label, count, countColor, accent, filled, onClick }: {
  icon: React.ReactNode; label: string; count?: number; countColor?: string
  accent?: string; filled?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      position:'relative', display:'inline-flex', alignItems:'center', gap:5,
      height:34, padding:'0 11px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
      border: filled ? 'none' : '1px solid #dce6f1',
      background: filled ? '#0a3268' : '#fff',
      color: filled ? '#fff' : (accent || '#10203a'),
      boxShadow:'0 1px 3px rgba(16,32,58,0.06)',
    }}>
      {icon}{label}
      {count != null && count > 0 && (
        <span style={{ position:'absolute',top:-5,right:-5,width:15,height:15,background:countColor||'#e63946',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'#fff' }}>
          {count}
        </span>
      )}
    </button>
  )
}
