'use client'

import Link from 'next/link'

/**
 * 도구 구성 데이터
 * 각 도구의 성격에 맞는 그라데이션과 태그를 유지하며, 
 * UI 일관성을 위해 쉐도우와 호버 효과를 강화했습니다.
 */
const TOOLS = [
  {
    href: '/insurance-tools/surgery',
    icon: '🏥',
    title: '수술비 계산기',
    desc: '1~5종 수술 전체 88항목\nKB·흥국생명·DB손해보험 기준',
    color: 'from-slate-800 to-blue-900',
    badge: '수술 95항목',
    tags: ['1~5종 분류', '부위별 검색', '부지급 안내', '치조골이식'],
  },
  {
    href: '/insurance-tools/diagnosis',
    icon: '🎗',
    title: '진단비 검색기',
    desc: 'KCD 코드·질병명 입력\n암·뇌혈관·심장 보장 즉시 확인',
    color: 'from-rose-700 to-red-800',
    badge: 'KCD 전체',
    tags: ['일반암', '유사암', '뇌졸중', '심근경색'],
  },
  {
    href: '/insurance-tools/disability',
    icon: '🦴',
    title: '후유장해율 계산기',
    desc: '장해분류표 전체 (별표1)\n부위별 장해율 및 지급액 계산',
    color: 'from-indigo-800 to-violet-900',
    badge: '13개 신체부위',
    tags: ['눈·귀·코', '척추·팔·다리', '신경계', '장해율 계산'],
  },
  {
    href: '/insurance-tools/car-accident',
    icon: '🚗',
    title: '자동차부상 등급',
    desc: '자동차사고 부상등급표 (별표9)\n1~14급 상해내용 검색 및 지급액',
    color: 'from-orange-600 to-amber-700',
    badge: '1~14급 전체',
    tags: ['급수별 검색', '상해내용 검색', '지급액 계산', '병급 기준'],
  },
]

export default function InsuranceToolsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 헤더 섹션: 신뢰감을 주는 딥 블루 그라데이션 */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white px-6 py-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Professional Tool</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            📋 심플 약관 검색기
          </h1>
          <p className="text-slate-300 mt-2 text-sm font-medium leading-relaxed">
            수술비 · 진단비 · 후유장해 · 자동차부상 — <br className="sm:hidden" />
            KB 금쪽같은 외 다수 최신 약관(2026) 기반 분석
          </p>
          
          {/* 데이터 기준일 뱃지 */}
          <div className="flex flex-wrap gap-2 mt-5">
            {['KB 금쪽같은(2603)', '흥국생명 오튼튼', 'DB손해보험(2601)', 'KCD 9차 개정(2026.1.1.)'].map(s => (
              <span key={s} className="text-[11px] bg-white/10 border border-white/20 text-blue-100 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-inner">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 pb-12">
        {/* 도구 카드 그리드: 2열 배치 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.href} className="group">
              <div className={`relative overflow-hidden bg-gradient-to-br ${tool.color} text-white rounded-3xl p-6 shadow-xl group-hover:shadow-2xl group-hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full border border-white/10`}>
                {/* 배경 장식용 아이콘 (우측 하단 반투명) */}
                <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  {tool.icon}
                </span>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                      {tool.icon}
                    </div>
                    <span className="text-[11px] bg-black/20 border border-white/30 px-3 py-1 rounded-full font-bold tracking-tight">
                      {tool.badge}
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-black mb-2 tracking-tight">{tool.title}</h2>
                  <p className="text-sm text-white/80 leading-snug whitespace-pre-line mb-5 font-medium">
                    {tool.desc}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {tool.tags.map(t => (
                      <span key={t} className="text-[10px] bg-white/15 border border-white/10 px-2.5 py-1 rounded-md font-semibold">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 안내 사항 섹션 */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2">
              <span className="text-blue-600">💡</span> 효율적인 상담을 위한 가이드
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-md">1</span>
                <div>
                  <p className="font-bold text-slate-800 mb-1">수술비 분석</p>
                  <p className="text-slate-600 text-[13px] leading-relaxed">질병명이나 코드로 1~5종 여부와 가입금액별 보상금을 즉시 비교하세요.</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-md">2</span>
                <div>
                  <p className="font-bold text-slate-800 mb-1">진단비 체크</p>
                  <p className="text-slate-600 text-[13px] leading-relaxed">KCD 9차 개정안이 적용된 최신 코드로 암/심/뇌 진단 범위를 확인하세요.</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-md">3</span>
                <div>
                  <p className="font-bold text-slate-800 mb-1">장해율 시뮬레이션</p>
                  <p className="text-slate-600 text-[13px] leading-relaxed">부위별 장해판정 기준을 검색하고 예상되는 보험금을 미리 산출합니다.</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-md">4</span>
                <div>
                  <p className="font-bold text-slate-800 mb-1">자부상 급수 확인</p>
                  <p className="text-slate-600 text-[13px] leading-relaxed">사고 상황에 따른 상해 급수를 찾고 병급(중복) 판정 기준을 체크하세요.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 주의사항 */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-[12px] text-amber-900 leading-relaxed">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚠️</span>
              <span className="font-bold text-amber-950 underline underline-offset-4 decoration-amber-300">중요 면책 공지</span>
            </div>
            <p className="pl-7">
              본 시스템에서 제공하는 모든 데이터는 <strong>2026년 표준 약관</strong>을 기준으로 한 시뮬레이션 결과입니다. 
              피보험자의 가입 시기, 갱신 여부, 개별 약관 및 특별 약관에 따라 <strong>실제 지급액은 다를 수 있습니다.</strong> 
              정확한 보험금 산정은 반드시 해당 보험사의 정식 심사 결과를 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}