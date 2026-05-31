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
    <div className="relative">
      <button 
        onClick={() => !isEditMode && onClick(menu)} 
        className={`h-40 w-full bg-white rounded-2xl flex flex-col p-5 shadow-sm border text-left transition-all group ${menu.cardColor} ${checked ? "hover:border-[#2563eb] hover:shadow-lg hover:-translate-y-1" : "opacity-35 grayscale"}`}
      >
        <div className="mb-3 transition-transform group-hover:scale-110">
          <ToolIcon icon={menu.icon} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-bold text-[#1e293b] mb-1">{menu.title}</h3>
          <p className="text-[12px] text-[#94a3b8] leading-tight break-keep">{menu.desc}</p>
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.replace("/login");

    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser.user) {
      await supabase.auth.signOut().catch(() => {});
      return router.replace("/login");
    }

    let { data: userInfo } = await supabase.from("users").select("*").eq("id", authUser.user.id).maybeSingle();
    if (!userInfo) {
      try {
        userInfo = await ensureUserProfile(supabase, authUser.user);
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
  }, [router]);

  useEffect(() => {
    init();
  }, [init]);

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
    if (isGuest || !isApproved) return <div className="text-center py-20 font-black">접근 권한이 없습니다.</div>;
    const props = { user, selectedDate, onTabChange: setActiveTab, currentUserRole: userRole };
    
    if (isMaster || isHeadquarters) return <MasterView {...props} />;
    if (isLeader) return <LeaderView {...props} />;
    if (isManager) return <ManagerView {...props} />;
    return <AgentView {...props} />;
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col lg:flex-row overflow-x-hidden">
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

      <main className="flex-1 p-4 pb-28 transition-all duration-300 lg:ml-[300px] lg:p-10">
        <div className="max-w-[1400px] mx-auto">
          {(
            activeTab === 'branding' ? <BrandingAIPage user={user} /> :
      viewMode === 'office' ? renderOfficeView() : (
              <div className="max-w-5xl mx-auto py-6 md:py-8">
                <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border-l-[6px] border-[#2563eb] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-[#1a3a6e] tracking-tight">고객 상담 도구</h1>
                    <p className="text-[#94a3b8] font-bold text-sm mt-1 tracking-widest">{isApproved ? "승인된 상담 도구를 사용할 수 있습니다" : "게스트 모드로 이용 중입니다"}</p>
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
                              checked={menu.fixed || menuStatus[menu.id] !== false}
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
  );
}

function HeaderBar({ title, icon, onBack }: any) {
  return (
    <div className="mb-8 flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-white">
      <div className="flex items-center gap-4 ml-2">
        <div className="w-12 h-12 bg-[#eff6ff] rounded-2xl flex items-center justify-center text-2xl shadow-inner">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black text-[#1a3a6e] tracking-tight leading-none uppercase">{title}</h2>
          <p className="text-[11px] text-[#94a3b8] font-bold mt-1 tracking-widest">상담 지원 도구</p>
        </div>
      </div>
      <button 
        onClick={onBack} 
        className="w-10 h-10 flex items-center justify-center bg-[#f1f5f9] text-[#475569] rounded-full hover:bg-[#e2e8f0] active:scale-95 transition-all text-xl font-bold"
      >
        ×
      </button>
    </div>
  );
}
