"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry) - Sidebar Sync & Route Fix
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState, useCallback, useRef } from "react"
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
  Star,
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
// ── 공지사항 팝업 모달 ────────────────────────────────────────────────────
function AnnouncementModal({ item, onClose, onSave, onDelete, isMaster }: {
  item: any; onClose: () => void; onSave?: (id: string, title: string, content: string) => void; onDelete?: (id: string) => void; isMaster: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,20,40,0.45)" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 14, maxWidth: 520, width: "calc(100% - 32px)", padding: "28px 28px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", position: "relative", maxHeight: "80vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ab4c8" }}>×</button>
        {editing ? (
          <>
            <input value={title} onChange={e => setTitle(e.target.value)}
              style={{ width: "100%", fontSize: 16, fontWeight: 700, color: "#1a2d42", border: "1px solid #c5d8ec", borderRadius: 8, padding: "8px 10px", marginBottom: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              style={{ width: "100%", fontSize: 13, color: "#2a3f55", border: "1px solid #c5d8ec", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(false)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #d4e0eb", background: "white", color: "#5a7a92", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>취소</button>
              <button onClick={() => { onSave?.(item.id, title, content); setEditing(false) }}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1a2744", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>저장</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 11, color: item.category === 'update' ? "#0f6e56" : "#185fa5", fontWeight: 600, marginBottom: 8, background: item.category === 'update' ? "#e1f5ee" : "#eef4fb", display: "inline-block", padding: "2px 8px", borderRadius: 12 }}>
              {item.category === 'update' ? '업데이트' : '공지사항'}
            </p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a2d42", marginBottom: 14 }}>{title}</h3>
            <p style={{ fontSize: 13, color: "#2a3f55", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{content}</p>
            <p style={{ fontSize: 11, color: "#9ab4c8", marginTop: 16 }}>{item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : ''}</p>
            {isMaster && (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditing(true)}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #c5d8ec", background: "#f4f8fd", color: "#185fa5", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                  ✏️ 수정
                </button>
                <button onClick={() => {
                    if (!confirm("정말 삭제하시겠습니까?")) return;
                    onDelete?.(item.id);
                    onClose();
                  }}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #fcc", background: "#fff5f5", color: "#c0392b", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                  🗑️ 삭제
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

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
  // 공지사항
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  // 즐겨찾기
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isFavEditMode, setIsFavEditMode] = useState(false);

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

      const [{ data: settings }, { data: annData }] = await Promise.all([
        supabase.from("team_settings").select("key, value"),
        supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      if (annData) setAnnouncements(annData);
      const statusMap = settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value === "true" }), { ...DEFAULT_MENU_STATUS }) || { ...DEFAULT_MENU_STATUS };

      const effectiveRole = normalizeRole(userInfo);
      const hydratedUser = { ...userInfo, effectiveRole };
      setMenuStatus(statusMap);
      setUser(hydratedUser);

      // 즐겨찾기 로드 (사용자별 localStorage)
      try {
        const savedFavs = localStorage.getItem(`mr-favorites-${userId}`);
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
      } catch { /* ignore */ }

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
  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => {
      const next = prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId];
      if (user?.id) localStorage.setItem(`mr-favorites-${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleMenu = async (key: string) => {
    if (!isMaster) return;
    const nextStatus = { ...menuStatus, [key]: !menuStatus[key] };
    setMenuStatus(nextStatus);
    await supabase.from("team_settings").upsert({ key, value: String(nextStatus[key]) }, { onConflict: "key" });
  };

  const saveAnnouncement = async (id: string, title: string, content: string) => {
    await supabase.from("announcements").update({ title, content, updated_at: new Date().toISOString() }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, title, content } : a));
    setSelectedAnnouncement((prev: any) => prev?.id === id ? { ...prev, title, content } : prev);
  };

  const deleteAnnouncement = async (id: string) => {
    if (id.startsWith('new-')) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      return;
    }
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } else {
      // delete 권한 없을 때 is_active=false 폴백
      await supabase.from("announcements").update({ is_active: false }).eq("id", id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  const addAnnouncement = async (category: 'notice' | 'update') => {
    const defaultTitle = category === 'notice' ? '새 공지사항' : '새 업데이트 소식';
    const { data } = await supabase.from("announcements").insert({ title: defaultTitle, content: '내용을 입력하세요.', category, created_by: user?.id, is_active: true }).select().single();
    if (data) {
      setAnnouncements(prev => [data, ...prev]);
      setSelectedAnnouncement(data);
    }
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

    if (item.id === "show_first_coverage_check") {
      window.open(finalUrl, "first-coverage-check", "width=1280,height=920,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes");
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
            // 편집모드: 비활성 항목도 표시(노출 토글 가능하도록), 일반모드: 활성만 표시
            (m.access === "approved" && (isConsultEditMode || menuStatus[m.id] !== false))
          )
    )
  );
  const favoriteTools = CONSULTING_TOOLS.filter(t => favorites.includes(t.id) && visibleConsultingTools.some(v => v.id === t.id));
  const faceTools = visibleConsultingTools.filter(t => t.category === "face");

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
          <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, boxShadow: "0 1px 4px rgba(26,45,66,0.04)" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2d42" }}>
                {(user.name || user.email?.split('@')[0] || '')}님, 오늘도 좋은 하루 되세요!
              </h2>
              <p style={{ fontSize: 13, color: "#7a9ab2", marginTop: 4 }}>고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.</p>
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

          {/* 즐겨찾기 */}
          <div style={{ background: "white", border: "2px solid #fde68a", borderRadius: 14, padding: "15px 16px", marginBottom: 12, boxShadow: "0 2px 8px rgba(245,158,11,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#0f1f36" }}>즐겨찾기</p>
                <span style={{ fontSize: 11, color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>나만의 바로가기</span>
              </div>
              <button
                onClick={() => setIsFavEditMode(!isFavEditMode)}
                style={{ fontSize: 11, fontWeight: 700, color: isFavEditMode ? "#dc2626" : "#b45309", background: isFavEditMode ? "#fee2e2" : "#fef3c7", border: isFavEditMode ? "1px solid #fca5a5" : "1px solid #fde68a", borderRadius: 7, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {isFavEditMode ? "✓ 완료" : "★ 편집"}
              </button>
            </div>
            {favoriteTools.length === 0 && !isFavEditMode && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#fffbeb", borderRadius: 9, border: "1px dashed #fcd34d" }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <p style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                  <strong>편집</strong>을 눌러 자주 쓰는 도구에 ★을 클릭하면 여기에 모입니다.
                </p>
              </div>
            )}
            {isFavEditMode && (
              <p style={{ fontSize: 11, color: "#a16207", background: "#fefce8", padding: "5px 10px", borderRadius: 7, marginBottom: 10, fontWeight: 600 }}>★ 아이콘 클릭으로 즐겨찾기를 추가·제거하세요.</p>
            )}
            {(favoriteTools.length > 0 || isFavEditMode) && (
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2" style={{ marginTop: favoriteTools.length > 0 || isFavEditMode ? 8 : 0 }}>
                {(isFavEditMode ? visibleConsultingTools : favoriteTools).map((menu) => {
                  const isFav = favorites.includes(menu.id);
                  return (
                    <div key={menu.id} style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => !isFavEditMode && handleNavigation(menu)}
                        className="group hover:-translate-y-[2px] hover:shadow-md"
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          padding: "11px 5px", borderRadius: 11, width: "100%",
                          border: `1.5px solid ${isFav ? "#fcd34d" : "#e2e8f0"}`,
                          cursor: isFavEditMode ? "default" : "pointer",
                          background: isFav ? "#fffbeb" : "#f8fafc",
                          fontFamily: "inherit", transition: "all 0.18s ease"
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: isFav ? "#fef3c7" : "#eef4fb", color: isFav ? "#b45309" : "#185fa5", transition: "transform 0.18s" }} className="group-hover:scale-110">
                          <ToolIcon icon={menu.icon} className="h-4 w-4" />
                        </div>
                        <p style={{ fontSize: 11, color: "#1e293b", textAlign: "center", lineHeight: 1.3, fontWeight: 700, wordBreak: "keep-all" }}>{menu.title}</p>
                      </button>
                      {isFavEditMode && (
                        <button
                          onClick={() => toggleFavorite(menu.id)}
                          style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                        >
                          <Star className="h-3.5 w-3.5" style={{ color: isFav ? "#f59e0b" : "#cbd5e1", fill: isFav ? "#f59e0b" : "none" }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 대면상담 카테고리 - PC 5칸 / 모바일 2~3칸 */}
          {faceTools.length > 0 && (
            <div style={{ background: "white", border: "2px solid #d0e8f8", borderRadius: 14, padding: "16px 16px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(24,95,165,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
                <span style={{ fontSize: 16 }}>🤝</span>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#0f2d55" }}>대면상담</p>
                <span style={{ fontSize: 11, color: "#185fa5", background: "#e8f2fd", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>고객 현장 활용 핵심 도구</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {faceTools.map((menu) => (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => !isConsultEditMode && handleNavigation(menu)}
                    className="group hover:-translate-y-[3px] hover:shadow-lg"
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                      padding: "14px 8px 12px", borderRadius: 12,
                      border: menu.isNew ? "2px solid #f59e0b" : "1.5px solid #c2def5",
                      cursor: "pointer", background: "linear-gradient(145deg,#f0f7fd,#e8f2fb)",
                      fontFamily: "inherit", transition: "all 0.2s ease", position: "relative"
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(145deg,#dbeeff,#cfe4f8)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = menu.isNew ? "#d97706" : "#185fa5";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(145deg,#f0f7fd,#e8f2fb)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = menu.isNew ? "#f59e0b" : "#c2def5";
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#185fa5", color: "white", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 2px 8px rgba(24,95,165,0.25)" }} className="group-hover:scale-110 group-hover:shadow-[0_4px_14px_rgba(24,95,165,0.4)]">
                      <ToolIcon icon={menu.icon} className="h-5 w-5" />
                    </div>
                    <p style={{ fontSize: 13, color: "#0f2d55", textAlign: "center", lineHeight: 1.35, fontWeight: 800, wordBreak: "keep-all" }}>{menu.title}</p>
                    <span style={{ fontSize: 10, color: "#5a7a92", lineHeight: 1.4, textAlign: "center", wordBreak: "keep-all" }}>{menu.desc}</span>
                    {favorites.includes(menu.id) && !isFavEditMode && (
                      <Star className="h-3 w-3" style={{ position: "absolute", top: 6, right: 6, color: "#f59e0b", fill: "#f59e0b" }} />
                    )}
                    {menu.isNew && (
                      <span className="new-pulse-badge" style={{ position: "absolute", top: 7, left: 7, borderRadius: 999, padding: "2px 7px", fontSize: 9, fontWeight: 900, color: "white", letterSpacing: "0.04em" }}>
                        NEW
                      </span>
                    )}
                    {isFavEditMode && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(menu.id); }}
                        style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                      >
                        <Star className="h-3.5 w-3.5" style={{ color: favorites.includes(menu.id) ? "#f59e0b" : "#c0d4e4", fill: favorites.includes(menu.id) ? "#f59e0b" : "none" }} />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 전체 메뉴 - 아코디언 (face 제외, PC: 항상 열림, 모바일: 토글) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
            {CONSULTING_TOOL_CATEGORIES.filter(c => c.id !== "face").map((category) => {
              const tools = visibleConsultingTools.filter((tool) => tool.category === category.id);
              if (tools.length === 0) return null;
              const isOpen = openConsultCategories[category.id] !== false;

              // ✅ 실제 category.id 기준으로 색상 매핑
              const catStyle: Record<string, { bg: string; color: string; border: string; headerBg: string; iconBg: string }> = {
                customer: { bg: "#dbeeff", color: "#1053b5", border: "#93c5fd", headerBg: "#eff6ff", iconBg: "#bfdbfe" },
                coverage: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", headerBg: "#ecfdf5", iconBg: "#a7f3d0" },
                financial:{ bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc", headerBg: "#eef2ff", iconBg: "#c7d2fe" },
                planning: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd", headerBg: "#f5f3ff", iconBg: "#ddd6fe" },
                claims:   { bg: "#ffe4e6", color: "#9f1239", border: "#fca5a5", headerBg: "#fff1f2", iconBg: "#fecdd3" },
              };
              const catEmoji: Record<string, string> = {
                customer: "👥", coverage: "🛡️", financial: "💰", planning: "📋", claims: "🏥",
              };
              const cs = catStyle[category.id] || { bg: "#f0f4f8", color: "#374151", border: "#d1d5db", headerBg: "#f9fafb", iconBg: "#e5e7eb" };

              return (
                <div key={category.id} style={{ background: "white", border: `2px solid ${cs.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  {/* 카테고리 헤더 */}
                  <button
                    type="button"
                    onClick={() => toggleConsultCategory(category.id)}
                    className="w-full xl:pointer-events-none"
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
                      cursor: "pointer", background: cs.headerBg, border: "none",
                      fontFamily: "inherit", width: "100%", textAlign: "left",
                      borderBottom: isOpen ? `1px solid ${cs.border}` : "none"
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: cs.iconBg, color: cs.color, flexShrink: 0, fontSize: 19 }}>
                      {catEmoji[category.id] || "•"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "#0f1f36" }}>{category.title}</p>
                      <p style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 500 }}>{category.desc}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform xl:hidden ${isOpen ? "rotate-180" : ""}`} style={{ color: cs.color, opacity: 0.6 }} />
                  </button>
                  {/* 툴 목록 */}
                  <div className={`xl:block ${isOpen ? "" : "hidden"}`}>
                    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 5 }}>
                      {tools.map((tool) => (
                        <div
                          key={tool.id}
                          onClick={() => !isConsultEditMode && handleNavigation(tool)}
                          className="group flex items-center gap-3 rounded-xl cursor-pointer"
                          style={{
                            padding: "10px 12px",
                            border: `1.5px solid ${cs.bg}`,
                            background: "white",
                            transition: "all 0.18s ease",
                            opacity: (isConsultEditMode && menuStatus[tool.id] === false) ? 0.4 : 1,
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = cs.border;
                            (e.currentTarget as HTMLDivElement).style.background = cs.headerBg;
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 10px rgba(0,0,0,0.07)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = cs.bg;
                            (e.currentTarget as HTMLDivElement).style.background = "white";
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: cs.iconBg, color: cs.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.18s" }} className="group-hover:scale-110">
                            <ToolIcon icon={tool.icon} className="h-4 w-4" />
                          </div>
                          <p style={{ fontSize: 13, color: "#1e293b", flex: 1, fontWeight: 700, wordBreak: "keep-all" }}>{tool.title}</p>
                          {isConsultEditMode && tool.editable
                            ? <input type="checkbox" checked={menuStatus[tool.id] !== false} onChange={() => toggleMenu(tool.id)} style={{ width: 14, height: 14, accentColor: "#1a2d42", flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                            : <span style={{ fontSize: 18, fontWeight: 300, color: cs.color, opacity: 0.5, transition: "all 0.18s", flexShrink: 0 }} className="group-hover:opacity-100 group-hover:translate-x-0.5">›</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단: 공지사항 + 외부 링크 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 공지사항 */}
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(26,45,66,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2d42", marginBottom: 10 }}>📢 공지사항</p>
              {announcements.filter(a => a.category === 'notice').slice(0, 3).map((ann, i, arr) => (
                <div key={ann.id}
                  onClick={() => setSelectedAnnouncement(ann)}
                  style={{ paddingBottom: i < arr.length - 1 ? 8 : 0, borderBottom: i < arr.length - 1 ? "0.5px solid #e4edf5" : "none", marginBottom: i < arr.length - 1 ? 8 : 0, cursor: "pointer" }}
                  className="hover:opacity-70 transition-opacity"
                >
                  <p style={{ fontSize: 12, color: "#2a3f55", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{ann.title}</p>
                  <p style={{ fontSize: 11, color: "#9ab4c8" }}>{new Date(ann.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
              {announcements.filter(a => a.category === 'notice').length === 0 && (
                <p style={{ fontSize: 12, color: "#b0c4d4" }}>공지사항이 없습니다.</p>
              )}
              {isMaster && (
                <button
                  onClick={() => addAnnouncement('notice')}
                  style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 7, border: "1px dashed #c5d8ec", background: "none", color: "#185fa5", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                >
                  + 공지 추가
                </button>
              )}
            </div>
            {/* 업데이트 소식 */}
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(26,45,66,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2d42", marginBottom: 10 }}>🔔 업데이트 소식</p>
              {announcements.filter(a => a.category === 'update').slice(0, 3).map((ann, i, arr) => (
                <div key={ann.id}
                  onClick={() => setSelectedAnnouncement(ann)}
                  style={{ paddingBottom: i < arr.length - 1 ? 8 : 0, borderBottom: i < arr.length - 1 ? "0.5px solid #e4edf5" : "none", marginBottom: i < arr.length - 1 ? 8 : 0, cursor: "pointer" }}
                  className="hover:opacity-70 transition-opacity"
                >
                  <p style={{ fontSize: 12, color: "#2a3f55", marginBottom: 2, fontWeight: 500 }}>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#e1f5ee", color: "#0f6e56", fontWeight: 600, marginRight: 4 }}>NEW</span>
                    {ann.title.replace(/^\[.*?\]\s*/, '')}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ab4c8" }}>{new Date(ann.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
              {announcements.filter(a => a.category === 'update').length === 0 && (
                <p style={{ fontSize: 12, color: "#b0c4d4" }}>업데이트 소식이 없습니다.</p>
              )}
              {isMaster && (
                <button
                  onClick={() => addAnnouncement('update')}
                  style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 7, border: "1px dashed #b8e6d5", background: "none", color: "#0f6e56", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                >
                  + 소식 추가
                </button>
              )}
            </div>
            {/* 외부 링크 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
                  window.open(isMobile ? "https://m.cafe.naver.com/signal1035" : "https://cafe.naver.com/signal1035", "_blank")
                }}
                className="hover:-translate-y-[1px] hover:shadow-lg transition-all"
                style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 12, background: "#16a34a", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0 }}>N</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 3 }}>커뮤니티</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "white" }}>보험의 기준 카페</p>
                </div>
              </button>
              <button
                onClick={() => window.open("https://open.kakao.com/o/g8ND5toi", "_blank")}
                className="hover:-translate-y-[1px] hover:shadow-lg transition-all"
                style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 12, background: "#b45309", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0 }}>O</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 3 }}>실시간 소통</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "white" }}>보험의 기준 오픈채팅</p>
                </div>
              </button>
            </div>
          </div>

          {/* 공지사항 상세 팝업 */}
          {selectedAnnouncement && (
            <AnnouncementModal
              item={selectedAnnouncement}
              onClose={() => setSelectedAnnouncement(null)}
              onSave={saveAnnouncement}
              onDelete={deleteAnnouncement}
              isMaster={isMaster}
            />
          )}

        </div>
      )
          )}
        </div>
      </main>
    </div>
  )
}
