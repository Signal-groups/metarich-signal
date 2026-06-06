"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry) - Sidebar Sync & Route Fix
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calculator,
  CarFront,
  ClipboardCheck,
  FileSearch,
  Hospital,
  PieChart,
  Pill,
  Scale,
  Search,
  ShieldCheck,
  Stethoscope,
  ScrollText,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import MasterView from "./components/MasterView" 
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import BrandingAIPage from "./components/BrandingAIPage"
import { CONSULTING_TOOLS, CONSULTING_TOOL_CATEGORIES, ConsultingTool, DEFAULT_MENU_STATUS } from "../../lib/consultingTools"
import { normalizeRole, isApprovedUser, canAccessBranding } from "../../lib/roles"
import { ensureUserProfile } from "../../lib/userProfile"

function ToolIcon({ icon }: { icon: string }) {
  const className = "h-7 w-7"
  switch (icon) {
    case "cafe":
      return <BookOpen className={className} />
    case "search":
      return <Search className={className} />
    case "hospital":
      return <Hospital className={className} />
    case "pill":
      return <Pill className={className} />
    case "crash":
      return <Scale className={className} />
    case "chart":
      return <BarChart3 className={className} />
    case "calculator-car":
      return <CarFront className={className} />
    case "code":
      return <FileSearch className={className} />
    case "compare":
      return <ArrowLeftRight className={className} />
    case "surgery":
      return <Stethoscope className={className} />
    case "document":
      return <ScrollText className={className} />
    case "checklist":
      return <ClipboardCheck className={className} />
    case "shield":
      return <ShieldCheck className={className} />
    case "calculator":
      return <Calculator className={className} />
    case "finance":
      return <PieChart className={className} />
    default:
      return <Search className={className} />
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. [Box Component] Consulting 도구 카드 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConsultingBox({ 
  menu, onClick, isEditMode, checked, onToggle 
}: { 
  menu: ConsultingTool, 
  onClick: (item: ConsultingTool) => void,
  isEditMode: boolean,
  checked: boolean,
  onToggle: (id: string) => void,
}) {
  return (
    <div className="relative min-w-0 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <button 
        onClick={() => !isEditMode && onClick(menu)} 
        className={`h-40 w-full min-w-0 bg-white rounded-2xl flex flex-col p-5 shadow-sm border text-left transition-all group [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all] ${menu.cardColor} ${checked ? "hover:border-[#2563eb] hover:shadow-lg hover:-translate-y-1" : "opacity-35 grayscale"}`}
      >
        <div className="mb-3 transition-transform group-hover:scale-110">
          <ToolIcon icon={menu.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 min-w-0 text-[15px] font-bold text-[#1e293b] leading-snug [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">{menu.title}</h3>
          <p className="min-w-0 text-[12px] text-[#94a3b8] leading-tight [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">{menu.desc}</p>
        </div>
        <div className="mt-4 text-[12px] font-bold text-[#2563eb] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          시작하기
        </div>
      </button>
      {isEditMode && menu.editable && (
        <label className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-md">
          <input type="checkbox" checked={checked} onChange={() => onToggle(menu.id)} className="h-4 w-4 accent-[#1a3a6e]" />
          노출
        </label>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Main Dashboard Page Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'office' | 'consulting'>('consulting');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [menuStatus, setMenuStatus] = useState<any>({});
  const [isConsultEditMode, setIsConsultEditMode] = useState(false);

  const init = useCallback(async () => {
    try {
      // 1. 세션 확인 — null이면 refresh 1회 시도 후 재확인
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }
      if (!session) return router.replace("/login");

      // 2. 서버 측 사용자 검증 — 네트워크 오류 시 session 정보로 폴백
      let userId: string | null = null;
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser.user) {
        // 토큰 갱신 타이밍 오류: session은 있으나 getUser 실패 → session.user로 폴백
        if (session.user?.id) {
          userId = session.user.id;
        } else {
          await supabase.auth.signOut().catch(() => {});
          return router.replace("/login");
        }
      } else {
        userId = authUser.user.id;
      }

      // 3. DB 사용자 정보 조회
      let { data: userInfo } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
      if (!userInfo) {
        try {
          const fallbackUser = authUser?.user ?? session.user;
          userInfo = await ensureUserProfile(supabase, fallbackUser);
        } catch {
          userInfo = null;
        }
      }
      if (!userInfo) return router.replace("/login");

      const { data: settings } = await supabase.from("team_settings").select("key, value");
      const statusMap = settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value === "true" }), { ...DEFAULT_MENU_STATUS }) || { ...DEFAULT_MENU_STATUS };

      const effectiveRole = normalizeRole(userInfo);
      const hydratedUser = { ...userInfo, effectiveRole };
      setMenuStatus(statusMap);
      setUser(hydratedUser);

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      if (urlParams.get("tab") === "branding" && canAccessBranding(hydratedUser)) {
        setActiveTab("branding");
        setViewMode("consulting");
      }

      if (effectiveRole !== 'guest' && isApprovedUser(userInfo) && urlParams.get('mode') === 'office') {
        setViewMode('office');
      }

      setLoading(false);
    } catch {
      // 네트워크 오류 등 예외 상황 — 로딩만 해제, 로그인 redirect 안 함
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    init();

    // 토큰 갱신 이벤트 감지 — 세션 복원 시 자동 재초기화
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        init();
      }
      if (event === "SIGNED_OUT") {
        // ⚠️ 팝업창(DM, 브랜딩 등)의 토큰 갱신 시 부모창에도 SIGNED_OUT 이벤트가
        // 잠깐 발화될 수 있음. 실제 세션 여부를 확인한 뒤 로그인으로 이동.
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) router.replace("/login");
        }, 800);
      }
    });

    return () => subscription.unsubscribe();
  }, [init, router]);

  // ✅ [네비게이션 통합 핸들러] 모든 도구는 새 창으로 열리도록 일치화
  const toggleMenu = async (key: string) => {
    if (!isMaster) return;
    const nextStatus = { ...menuStatus, [key]: !menuStatus[key] };
    setMenuStatus(nextStatus);
    await supabase.from("team_settings").upsert({ key, value: String(nextStatus[key]) }, { onConflict: "key" });
  };

  const handleNavigation = (item: ConsultingTool) => {
    const { url } = item;
    if (!url) return;

    // 1. 탭 전환 (계산기 등 내부 탭)
    if (url.startsWith('tab:')) {
      const targetTab = url.split(':')[1];
      setActiveTab(targetTab);
      return;
    }

    // ✅ 2. 모든 링크(내부/외부/HTML)를 새 창으로 열기 (사이드바 로직과 동기화)
    const finalUrl = url.startsWith('/') 
      ? `${window.location.origin}${url}` 
      : (url.startsWith('http') ? url : `https://${url}`);

    if (item.chromeRecommended) {
      navigator.clipboard?.writeText(finalUrl).catch(() => {});
      alert("숨은 보험금 찾기 링크를 복사했습니다.\n크롬을 열고 주소창에 붙여넣어 접속해주세요.\n\n" + finalUrl);
      return;
    }

    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse">Syncing System...</div>;

  const userRole = normalizeRole(user);
  const isMaster = userRole === 'master';
  const isHeadquarters = userRole === 'headquarters';
  const isLeader = userRole === 'leader';
  const isManager = userRole === 'manager';
  const isGuest = userRole === 'guest';
  
  const isApproved = isApprovedUser(user);
  const visibleConsultingTools = CONSULTING_TOOLS.filter(m =>
    m.placement !== "office" &&
    (
      m.access === "public" ||
      (m.access === "approved" && isApproved && (menuStatus[m.id] || isConsultEditMode))
    )
  );
  const highlightTools = visibleConsultingTools.filter((tool) => tool.highlight);

  const renderOfficeView = () => {
    if (isGuest || !isApproved) return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <div className="text-5xl">{isGuest ? '🪪' : '⏳'}</div>
        <p className="text-xl font-black text-slate-700">
          {isGuest ? '타사 게스트 계정은 사무실 업무를 이용할 수 없습니다' : '관리자 승인 후 이용 가능합니다'}
        </p>
        <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed">
          {isGuest
            ? '사무실 업무는 메타리치 시그널그룹 소속 직원 전용입니다.'
            : '담당 관리자에게 계정 승인을 요청해 주세요.'}
        </p>
      </div>
    );
    const props = { user, selectedDate, onTabChange: setActiveTab, currentUserRole: userRole };
    
    if (isMaster || isHeadquarters) return <MasterView {...props} />;
    if (isLeader) return <LeaderView {...props} />;
    if (isManager) return <ManagerView {...props} />;
    return <AgentView {...props} />;
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col lg:flex-row overflow-x-hidden [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <Sidebar 
        user={user} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        mode={viewMode} 
        onBack={undefined} 
        externalMenuStatus={menuStatus} 
        onMenuStatusChange={setMenuStatus}
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        onOpenOffice={() => { setViewMode('office'); setActiveTab(null); }}
        onOpenConsulting={() => { setViewMode('consulting'); setActiveTab(null); }}
        onTabChange={(val: string) => setActiveTab(val.startsWith('tab:') ? val.split(':')[1] : val)} 
        activeTab={activeTab} 
      />

      <main className="flex-1 min-w-0 p-4 pb-28 transition-all duration-300 lg:ml-[300px] lg:p-10">
        <div className="mx-auto max-w-[1400px] min-w-0">
          {(
            activeTab === 'branding' ? <BrandingAIPage user={user} /> :
      viewMode === 'office' ? renderOfficeView() : (
              <div className="mx-auto max-w-5xl min-w-0 py-6 md:py-8">

                {/* ── 미승인 / 게스트 안내 배너 ───────────────────────────── */}
                {!isApproved && (
                  <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 px-7 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 text-3xl">{isGuest ? '🪪' : '⏳'}</div>
                      <div>
                        <p className="font-black text-amber-800 text-base">
                          {isGuest ? '타사 게스트 계정입니다' : '관리자 승인 대기 중입니다'}
                        </p>
                        <p className="mt-1 text-sm font-bold text-amber-700 leading-relaxed">
                          {isGuest
                            ? '기본 공개 도구(아래)만 이용 가능합니다. 추가 기능은 시그널그룹 소속 가입 후 승인을 받아야 합니다.'
                            : '승인 후 사무실 업무·전체 상담 도구를 이용할 수 있습니다. 관리자에게 승인을 요청하세요.'}
                        </p>
                        <p className="mt-2 text-xs font-bold text-amber-500">
                          현재 이용 가능 : 숨은보험금 찾기 · 진료기록 확인 · 약학정보원 (공개 도구 3종)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border-l-[6px] border-[#2563eb] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-[#1a3a6e] tracking-tight">고객 상담 도구</h1>
                    <p className="text-[#94a3b8] font-bold text-sm mt-1 tracking-widest">
                      {isApproved ? '승인된 상담 도구를 사용할 수 있습니다' : '공개 도구만 이용 가능합니다'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isMaster && (
                      <button onClick={() => setIsConsultEditMode(!isConsultEditMode)} className={`rounded-xl px-4 py-3 text-xs font-black ${isConsultEditMode ? "bg-[#1a3a6e] text-white" : "bg-black text-[#d4af37]"}`}>
                        {isConsultEditMode ? "편집 완료" : "노출 편집"}
                      </button>
                    )}
                  </div>
                </div>
                
                {highlightTools.length > 0 && (
                  <section className="mb-8 space-y-4">
                    <div className="flex items-end justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-xl font-black text-[#1a3a6e]">정보확인</h2>
                        <p className="mt-1 text-[12px] font-bold text-slate-400">고객의 정보를 확인합니다.</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">{highlightTools.length}개</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {highlightTools.map((menu) => (
                        <ConsultingBox
                          key={menu.id}
                          menu={menu}
                          onClick={handleNavigation}
                          isEditMode={false}
                          checked
                          onToggle={toggleMenu}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div className="space-y-8">
                  {CONSULTING_TOOL_CATEGORIES.map((category) => {
                    const tools = visibleConsultingTools.filter((tool) => !tool.highlight && tool.category === category.id);
                    if (tools.length === 0) return null;
                    return (
                      <section key={category.id} className="space-y-4">
                        <div className="flex items-end justify-between border-b border-slate-200 pb-3">
                          <div>
                            <h2 className="text-xl font-black text-[#1a3a6e]">{category.title}</h2>
                            <p className="mt-1 text-[12px] font-bold text-slate-400">{category.desc}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${category.countTone}`}>{tools.length}개</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tools.map((menu) => (
                            <ConsultingBox
                              key={menu.id}
                              menu={menu}
                              onClick={handleNavigation}
                              isEditMode={isConsultEditMode}
              checked={menuStatus[menu.id] !== false}
                              onToggle={toggleMenu}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
