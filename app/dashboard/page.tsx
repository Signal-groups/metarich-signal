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
  Bell,
  BookOpen,
  Calculator,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Hospital,
  Lightbulb,
  Megaphone,
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
import { normalizeRole, isApprovedUser, canAccessBranding, canAccessOffice } from "../../lib/roles"
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
  const initializedRef = useRef(false);   // init 완료 여부 — 팝업창 TOKEN_REFRESHED 재초기화 방지
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

      initializedRef.current = true;
      setLoading(false);
    } catch {
      // 네트워크 오류 등 예외 상황 — 로딩만 해제, 로그인 redirect 안 함
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    init();

    // 토큰 갱신 이벤트 감지 — 세션 복원 시 자동 재초기화
    // ⚠️ 이미 초기화 완료된 경우(팝업창 열린 후 TOKEN_REFRESHED)에는 재초기화 생략 — 도구 사라짐 방지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" && initializedRef.current) return;
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
  const canUseOffice = canAccessOffice(user);
  const visibleConsultingTools = CONSULTING_TOOLS.filter((m) => {
    if (m.placement === "office") return false;
    if (!isApproved && m.category === "face") return false;
    if (!isApproved) return m.guestVisible === true;
    // "office" 접근 레벨: 설계사 이상 + 사무실업무(office_access) 체크된 경우만 노출. fixed=true 항목은 항상 노출
    if (m.access === "office") return canUseOffice && (m.fixed || isConsultEditMode || menuStatus[m.id] !== false);
    // fixed=true 항목은 menuStatus 무시 — 항상 노출 (대면상담 6개 도구 클릭 후 사라지는 문제 방지)
    if (m.access === "guest_approved") return m.fixed || isConsultEditMode || menuStatus[m.id] !== false;
    if (m.access === "approved") return !isGuest && (m.fixed || isConsultEditMode || menuStatus[m.id] !== false);
    return m.access === "public";
  });
  const favoriteTools = CONSULTING_TOOLS.filter(t => favorites.includes(t.id) && visibleConsultingTools.some(v => v.id === t.id));
  const faceTools = isApproved ? visibleConsultingTools.filter(t => t.category === "face") : [];

  const renderConsultingView = () => {
    const toolSections = CONSULTING_TOOL_CATEGORIES
      .filter((category) => ["coverage", "financial", "planning", "claims"].includes(category.id))
      .map((category) => ({
        ...category,
        tools: visibleConsultingTools.filter((tool) => tool.category === category.id),
      }))
      .filter((category) => category.tools.length > 0)

    const cardBase: React.CSSProperties = {
      background: "#fff",
      border: "1px solid #dce6f1",
      borderRadius: 12,
      boxShadow: "0 4px 14px rgba(16,32,58,0.04)",
    }

    return (
      <div className="mx-auto max-w-[1680px] min-w-0 pb-3">
        {!isApproved && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-black text-amber-800">{isGuest ? "타사 게스트 계정입니다" : "관리자 승인 대기 중입니다"}</p>
            <p className="mt-1 text-xs font-bold text-amber-700">
              {isGuest
                ? "기본 공개 도구만 이용 가능합니다. 추가 기능은 시그널그룹 소속 가입 후 승인을 받아야 합니다."
                : "승인 후 사무실 업무와 전체 상담 도구를 이용할 수 있습니다."}
            </p>
          </div>
        )}

        <header className="mb-4 flex flex-col gap-3 px-1 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[25px] font-black leading-tight tracking-[-0.01em] text-[#10203a]">
              {(user.name || user.email?.split("@")[0] || "")}님, 오늘도 좋은 하루 되세요!
            </h1>
            <p className="mt-2 text-[15px] font-bold text-[#50627a]">고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6f1] bg-white px-4 text-[13px] font-black text-[#21324d] shadow-sm">
                <CalendarDays className="h-4 w-4" />
                {selectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })}
              </button>
              <button
                onClick={() => window.open("/guide.html?tab=basic", "_blank", "width=1100,height=800,menubar=no,toolbar=no,location=no")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6f1] bg-white px-4 text-[13px] font-black text-[#1b54ad] shadow-sm"
              >
                <BookOpen className="h-4 w-4" /> 일반 가이드
              </button>
              <button
                onClick={() => window.open("/guide.html?tab=pro", "_blank", "width=1100,height=800,menubar=no,toolbar=no,location=no")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#0f3f86] bg-[#082b5f] px-4 text-[13px] font-black text-white shadow-sm"
              >
                <Star className="h-4 w-4 fill-[#f6c342] text-[#f6c342]" /> 프로 가이드
              </button>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <button
                onClick={() => {
                  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
                  window.open(isMobile ? "https://m.cafe.naver.com/signal1035" : "https://cafe.naver.com/signal1035", "_blank")
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6f1] bg-white px-4 text-[13px] font-black text-[#10203a] shadow-sm"
              >
                <span className="grid h-5 w-5 place-items-center rounded bg-[#03c75a] text-[12px] font-black text-white">N</span>
                보험의 기준 카페
              </button>
              <button
                onClick={() => window.open("https://open.kakao.com/o/g8ND5toi", "_blank")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6f1] bg-white px-4 text-[13px] font-black text-[#10203a] shadow-sm"
              >
                <span className="grid h-5 w-5 place-items-center rounded bg-[#FEE500] text-[11px] font-black text-[#191919]">톡</span>
                보험의 기준 오픈채팅
              </button>
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-[14px] border border-[#dce6f1] bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-7 w-7 fill-[#172947] text-[#172947]" />
              <p className="text-[17px] font-black text-[#10203a]">즐겨찾기</p>
              <span className="rounded-full bg-[#f2f5f9] px-3 py-1 text-[12px] font-black text-[#4b5d76]">나만의 바로가기</span>
            </div>
            <button
              onClick={() => setIsFavEditMode(!isFavEditMode)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#dce6f1] bg-[#f8fafc] px-4 py-2 text-[12px] font-black text-[#21324d]"
            >
              <Star className="h-3.5 w-3.5" /> {isFavEditMode ? "완료" : "편집"}
            </button>
          </div>
          {favoriteTools.length === 0 && !isFavEditMode ? (
            <div className="mt-3 flex items-center gap-3 text-[13px] font-bold text-[#10203a]">
              <Lightbulb className="h-5 w-5" />
              <span>편집을 눌러 자주 쓰는 도구에 ★를 클릭하면 여기에 모입니다.</span>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {(isFavEditMode ? visibleConsultingTools : favoriteTools).map((menu) => {
                const isFav = favorites.includes(menu.id)
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => isFavEditMode ? toggleFavorite(menu.id) : handleNavigation(menu)}
                    className="relative flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-xl border border-[#dce6f1] bg-[#f8fafc] px-3 py-3 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    {isFavEditMode && <Star className={`absolute right-2 top-2 h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />}
                    <ToolIcon icon={menu.icon} className="h-5 w-5 text-[#0f3f86]" />
                    <span className="text-[12px] font-black leading-tight text-[#10203a]">{menu.title}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {faceTools.length > 0 && (
          <section className="mb-4 rounded-[14px] border border-[#dce6f1] bg-white px-5 py-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <p className="text-[18px] font-black text-[#10203a]">대면상담</p>
              <span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-[12px] font-black text-[#1b54ad]">고객 현장 활용 핵심 도구</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {faceTools.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => !isConsultEditMode && handleNavigation(menu)}
                  className="group relative flex min-h-[148px] flex-col items-center justify-center rounded-[10px] border border-[#dce6f1] bg-white px-4 py-4 text-center transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {menu.isNew && <span className="absolute left-5 top-4 rounded-full bg-[#ff3158] px-2 py-0.5 text-[10px] font-black text-white">NEW</span>}
                  <ToolIcon icon={menu.icon} className="mb-3 h-8 w-8 text-[#0a3a86]" />
                  <p className="text-[15px] font-black text-[#10203a]">{menu.title}</p>
                  <p className="mt-2 text-[11px] font-bold leading-4 text-[#64748b]">{menu.desc}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mb-4 grid grid-cols-1 overflow-hidden rounded-[14px] border border-[#dce6f1] bg-white shadow-sm md:grid-cols-2 xl:grid-cols-4">
          {toolSections.map((category, index) => (
            <div key={category.id} className={`p-4 ${index > 0 ? "border-t border-[#e8eef5] md:border-l md:border-t-0" : ""}`}>
              <h2 className="text-[17px] font-black text-[#10203a]">{category.title}</h2>
              <p className="mt-1 text-[11px] font-bold text-[#64748b]">{category.desc}</p>
              <div className="mt-4 space-y-2">
                {category.tools.slice(0, 4).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => !isConsultEditMode && handleNavigation(tool)}
                    className="flex h-10 w-full items-center gap-3 rounded-lg border border-[#dce6f1] bg-white px-3 text-left transition hover:bg-[#f8fbff]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#f3f6fa] text-[#0a3a86]">
                      <ToolIcon icon={tool.icon} className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-[13px] font-black text-[#10203a]">{tool.title}</span>
                    {isConsultEditMode && tool.editable ? (
                      <input type="checkbox" checked={menuStatus[tool.id] !== false} onChange={() => toggleMenu(tool.id)} className="h-4 w-4 accent-[#082b5f]" onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#10203a]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div style={cardBase} className="min-h-[138px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-[#10203a]" />
                <h2 className="text-[17px] font-black text-[#10203a]">공지사항</h2>
              </div>
              {isMaster && <button onClick={() => addAnnouncement("notice")} className="text-[12px] font-black text-[#1b54ad]">더보기 <ChevronRight className="inline h-3.5 w-3.5" /></button>}
            </div>
            {announcements.filter((a) => a.category === "notice").slice(0, 2).map((ann) => (
              <button key={ann.id} onClick={() => setSelectedAnnouncement(ann)} className="block w-full py-1 text-left">
                <p className="text-[13px] font-black text-[#10203a]">{ann.title}</p>
                <p className="mt-1 text-[12px] font-bold text-[#8aa0ba]">{new Date(ann.created_at).toLocaleDateString("ko-KR")}</p>
              </button>
            ))}
          </div>

          <div style={cardBase} className="min-h-[138px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#10203a]" />
                <h2 className="text-[17px] font-black text-[#10203a]">업데이트 소식</h2>
              </div>
              {isMaster && <button onClick={() => addAnnouncement("update")} className="text-[12px] font-black text-[#1b54ad]">더보기 <ChevronRight className="inline h-3.5 w-3.5" /></button>}
            </div>
            <div className="space-y-3">
              {announcements.filter((a) => a.category === "update").slice(0, 2).map((ann) => (
                <button key={ann.id} onClick={() => setSelectedAnnouncement(ann)} className="flex w-full items-start gap-3 border-b border-[#edf2f7] pb-2 text-left last:border-b-0">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-600">NEW</span>
                  <span>
                    <span className="block text-[13px] font-black text-[#10203a]">{ann.title.replace(/^\[.*?\]\s*/, "")}</span>
                    <span className="mt-1 block text-[12px] font-bold text-[#8aa0ba]">{new Date(ann.created_at).toLocaleDateString("ko-KR")}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

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
  }

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
    <div className="min-h-screen bg-[#f5f8fc] flex flex-col lg:flex-row overflow-x-hidden [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
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

      <main className="flex-1 min-w-0 p-4 pb-28 transition-all duration-300 sm:p-5 lg:ml-[300px] lg:p-6 xl:p-7">
        <div className="mx-auto max-w-[1680px] min-w-0">
          {(
            activeTab === 'branding' ? <BrandingAIPage user={user} /> :
      viewMode ==