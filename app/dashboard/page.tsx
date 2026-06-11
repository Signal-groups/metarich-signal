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
  ChevronDown,
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

function ToolIcon({ icon, className = "h-7 w-7" }: { icon: string; className?: string }) {
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
        className={`min-h-[168px] w-full min-w-0 bg-white rounded-2xl flex flex-col p-5 shadow-sm border text-left transition-all group sm:p-6 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all] ${menu.cardColor} ${checked ? "hover:border-[#2563eb] hover:shadow-lg hover:-translate-y-1" : "opacity-35 grayscale"}`}
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
  const [openConsultCategories, setOpenConsultCategories] = useState<Record<string, boolean>>({
    customer: true,
  });

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

  const toggleConsultCategory = (id: string) => {
    setOpenConsultCategories((prev) => ({ ...prev, [id]: !prev[id] }));
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
      // 미승인·게스트: guestVisible 도구만 표시
      !isApproved
        ? m.guestVisible === true
        : (
            m.access === "public" ||
            (m.access === "approved" && (menuStatus[m.id] || isConsultEditMode))
          )
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
    <div className="min-h-screen bg-[#eef3f8] flex flex-col lg:flex-row overflow-x-hidden [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
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

      <main className="flex-1 min-w-0 p-4 pb-28 transition-all duration-300 sm:p-5 lg:ml-[300px] lg:p-8 xl:p-10">
        <div className="mx-auto max-w-[1680px] min-w-0">
          {(
            activeTab === 'branding' ? <BrandingAIPage user={user} /> :
      viewMode === 'office' ? renderOfficeView() : (
        <div className="mx-auto max-w-7xl min-w-0 pb-6">

          {/* 미승인/게스트 배너 */}
          {!isApproved && (
            <div style={{ marginBottom: 12, borderRadius: 10, border: "0.5px solid #fde68a", background: "#fffbeb", padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, fontSize: 22 }}>{isGuest ? '🪪' : '⏳'}</div>
              <div>
                <p style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>
                  {isGuest ? '타사 게스트 계정입니다' : '관리자 승인 대기 중입니다'}
                </p>
                <p style={{ marginTop: 4, fontSize: 12, color: "#b45309", lineHeight: 1.5 }}>
                  {isGuest
                    ? '기본 공개 도구(아래)만 이용 가능합니다. 추가 기능은 시그널그룹 소속 가입 후 승인을 받아야 합니다.'
                    : '승인 후 사무실 업무·전체 상담 도구를 이용할 수 있습니다. 관리자에게 승인을 요청하세요.'}
                </p>
              </div>
            </div>
          )}

          {/* 인사 / 날짜 / 가이드 */}
          <div style={{ background: "white", borderRadius: 10, border: "0.5px solid #e4edf5", padding: "13px 16px", marginBottom: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: "#1a2d42" }}>
                {(user.name || user.email?.split('@')[0] || '')}님, 오늘도 좋은 하루 되세요!
              </h2>
              <p style={{ fontSize: 12, color: "#7a9ab2", marginTop: 2 }}>고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ background: "#f0f4f8", border: "0.5px solid #d4e0eb", borderRadius: 7, padding: "4px 9px", fontSize: 11, color: "#7a9ab2" }}>
                📅 {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
              </span>
              <button
                onClick={() => window.open('/guide.html?tab=basic', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
                style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 500, background: "#eef4fb", color: "#185fa5", border: "0.5px solid #b5d4f4", cursor: "pointer", fontFamily: "inherit" }}
              >📘 일반 가이드</button>
              <button
                onClick={() => window.open('/guide.html?tab=pro', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
                style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 500, background: "#1a2540", color: "#e8f1f8", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >⭐ 프로 가이드</button>
              {isMaster && (
                <button
                  onClick={() => setIsConsultEditMode(!isConsultEditMode)}
                  style={{ borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 500, background: isConsultEditMode ? "#e24b4a" : "#1a2d42", color: "#e8f1f8", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {isConsultEditMode ? "편집 완료" : "노출 편집"}
                </button>
              )}
            </div>
          </div>

          {/* 자주 사용하는 기능 */}
          {highlightTools.length > 0 && (
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, padding: "13px 15px", marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42", marginBottom: 10 }}>⭐ 자주 사용하는 기능</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }} className="sm:[grid-template-columns:repeat(6,1fr)]">
                {highlightTools.slice(0, 6).map((menu) => (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => !isConsultEditMode && handleNavigation(menu)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      padding: "9px 4px", borderRadius: 7,
                      border: `0.5px solid ${menuStatus[menu.id] === false ? "#e4edf5" : "#c5d8ec"}`,
                      cursor: "pointer", background: menuStatus[menu.id] === false ? "transparent" : "#f6fafd",
                      fontFamily: "inherit", opacity: menuStatus[menu.id] === false ? 0.45 : 1, transition: "all 0.1s"
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "#eef4fb", color: "#185fa5" }}>
                      <ToolIcon icon={menu.icon} className="h-4 w-4" />
                    </div>
                    <p style={{ fontSize: 10, color: "#2a3f55", textAlign: "center", lineHeight: 1.3 }}>{menu.title}</p>
                    {isConsultEditMode && menu.editable && (
                      <input
                        type="checkbox"
                        checked={menuStatus[menu.id] !== false}
                        onChange={() => toggleMenu(menu.id)}
                        style={{ width: 12, height: 12, accentColor: "#1a2d42" }}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 전체 메뉴 - 4컬럼 아코디언 (PC: 항상 열림, 모바일: 토글) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-2.5">
            {CONSULTING_TOOL_CATEGORIES.map((category) => {
              const tools = visibleConsultingTools.filter((tool) => !tool.highlight && tool.category === category.id);
              if (tools.length === 0) return null;
              const isOpen = openConsultCategories[category.id] !== false;
              const catStyle: Record<string, { bg: string; color: string }> = {
                customer: { bg: "#eef4fb", color: "#185fa5" },
                analysis: { bg: "#e1f5ee", color: "#0f6e56" },
                claim:    { bg: "#faece7", color: "#993c1d" },
                support:  { bg: "#eeedfe", color: "#534ab7" },
              };
              const catEmoji: Record<string, string> = {
                customer: "👥", analysis: "🛡", claim: "📋", support: "📁",
              };
              const cs = catStyle[category.id] || { bg: "#f0f4f8", color: "#5a7a92" };
              return (
                <div key={category.id} style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => toggleConsultCategory(category.id)}
                    className="w-full xl:pointer-events-none"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "12px 13px",
                      cursor: "pointer", background: "transparent", border: "none",
                      fontFamily: "inherit", width: "100%", textAlign: "left",
                      borderBottom: isOpen ? "0.5px solid #e4edf5" : "none"
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: cs.bg, color: cs.color, flexShrink: 0 }}>
                      <span style={{ fontSize: 13 }}>{catEmoji[category.id] || "•"}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42" }}>{category.title}</p>
                      <p style={{ fontSize: 10, color: "#9ab4c8", marginTop: 1 }}>{category.desc}</p>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-[#b0c4d4] transition-transform xl:hidden ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`xl:block ${isOpen ? "" : "hidden"}`}>
                    <div style={{ padding: "6px 8px 8px" }}>
                      {tools.map((tool) => (
                        <div
                          key={tool.id}
                          onClick={() => !isConsultEditMode && handleNavigation(tool)}
                          className="flex items-center gap-1.5 rounded cursor-pointer hover:bg-[#f0f6fb]"
                          style={{ padding: "6px 6px", transition: "background 0.1s", opacity: (isConsultEditMode && menuStatus[tool.id] === false) ? 0.4 : 1 }}
                        >
                          <span style={{ fontSize: 12, color: "#8aabcc", width: 16, textAlign: "center", flexShrink: 0 }}>·</span>
                          <p style={{ fontSize: 11, color: "#2a3f55", flex: 1 }}>{tool.title}</p>
                          {isConsultEditMode && tool.editable
                            ? <input type="checkbox" checked={menuStatus[tool.id] !== false} onChange={() => toggleMenu(tool.id)} style={{ width: 12, height: 12, accentColor: "#1a2d42", flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                            : <span style={{ fontSize: 10, color: "#c0d4e4" }}>›</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단: 공지사항 + 업데이트 + 외부 링크 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42", marginBottom: 8 }}>공지사항</p>
              <div style={{ paddingBottom: 7, borderBottom: "0.5px solid #e4edf5", marginBottom: 7 }}>
                <p style={{ fontSize: 11, color: "#2a3f55", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>[안내] 시스템 이용 안내</p>
                <p style={{ fontSize: 10, color: "#9ab4c8" }}>관리자 공지</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#2a3f55", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>[업데이트] 보장분석 PRO 개선</p>
                <p style={{ fontSize: 10, color: "#9ab4c8" }}>최근 업데이트</p>
              </div>
            </div>
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42", marginBottom: 8 }}>업데이트 소식</p>
              <div style={{ paddingBottom: 7, borderBottom: "0.5px solid #e4edf5", marginBottom: 7 }}>
                <p style={{ fontSize: 11, color: "#2a3f55", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: "#e1f5ee", color: "#0f6e56", fontWeight: 500, marginRight: 3 }}>NEW</span>
                  보장분석 PRO 기능 추가
                </p>
                <p style={{ fontSize: 10, color: "#9ab4c8" }}>최근 업데이트</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#2a3f55", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: "#eef4fb", color: "#185fa5", fontWeight: 500, marginRight: 3 }}>UPDATE</span>
                  질병코드 데이터 업데이트
                </p>
                <p style={{ fontSize: 10, color: "#9ab4c8" }}>시스템 업데이트</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => window.open("https://cafe.naver.com/insuranceguide", "_blank")}
                style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, background: "#16a34a", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "white", flexShrink: 0 }}>N</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>커뮤니티</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "white" }}>보험의 기준 카페</p>
                </div>
              </button>
              <button
                onClick={() => window.open("https://open.kakao.com/o/insuranceguide", "_blank")}
                style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, background: "#b45309", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "white", flexShrink: 0 }}>O</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>실시간 소통</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "white" }}>보험의 기준 오픈채팅</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      )
          )}
        </div>
      </main>
    </div>
  )
}
