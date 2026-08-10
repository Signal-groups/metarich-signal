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
  Users,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import MasterView from "./components/MasterView"
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import BrandingAIPage from "./components/BrandingAIPage"
import ProductStrategyBoard from "./components/ProductStrategyBoard"
import CalendarWidget from "./components/CalendarWidget"
import GeneralHome from "./components/GeneralHome"
import ProHome from "./components/ProHome"
import { CONSULTING_TOOLS, CONSULTING_TOOL_CATEGORIES, CONSULTING_TOOL_GROUPS, ConsultingTool, DEFAULT_MENU_STATUS } from "../../lib/consultingTools"
import { MENU_LAYOUT_KEY, type MenuLayout, defaultMenuLayout, isToolHidden, orderToolsByLayout, parseMenuLayout } from "../../lib/menuLayout"
import { normalizeRole, isApprovedUser, canAccessBranding, canAccessOffice, canAccessCrm } from "../../lib/roles"
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
    case "exam":
      return <BookOpen className={className} />
    case "dm":
      return <ScrollText className={className} />
    default:
      return <Search className={className} />
  }
}

function PremiumMenuBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full bg-[linear-gradient(120deg,#ff4d6d,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef)] px-2 py-0.5 text-[9px] font-black leading-none text-white shadow-sm ${className}`}
    >
      PREMIUM
    </span>
  )
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
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-[15px] font-bold text-[#1e293b] leading-snug [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">{menu.title}</h3>
            {menu.premium && <PremiumMenuBadge />}
          </div>
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
  const [menuLayout, setMenuLayout] = useState<MenuLayout>(() => defaultMenuLayout());
  const [isConsultEditMode, setIsConsultEditMode] = useState(false);
  const [openConsultCategories, setOpenConsultCategories] = useState<Record<string, boolean>>({});
  // 공지사항
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  // 즐겨찾기
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isFavoritesVisible, setIsFavoritesVisible] = useState(true);
  const [isFavEditMode, setIsFavEditMode] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [showGuideDropdown, setShowGuideDropdown] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticePopupTab, setNoticePopupTab] = useState<'notice' | 'update'>('notice');
  // 마스터 전용: 일반/프로 미리보기 토글
  const [masterPreviewMode, setMasterPreviewMode] = useState<'pro' | 'general'>('pro');

  const init = useCallback(async () => {
    try {
      // 1. 세션 확인 — null이면 refresh 1회 시도 후 재확인
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }
      if (!session) return router.replace("/login");

      // 2. session.user.id로 직접 사용 (getUser() 불필요 — 네트워크 1회 절약)
      const userId = session.user?.id;
      if (!userId) { await supabase.auth.signOut().catch(() => {}); return router.replace("/login"); }

      // 3. DB 사용자 정보 조회
      let { data: userInfo } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
      if (!userInfo) {
        try {
          userInfo = await ensureUserProfile(supabase, session.user);
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
      const layoutValue = settings?.find((item: any) => item.key === MENU_LAYOUT_KEY)?.value;
      setMenuLayout(parseMenuLayout(layoutValue));
      const statusMap = settings?.reduce((acc: any, curr: any) => {
        if (curr.value === "true" || curr.value === "false") acc[curr.key] = curr.value === "true";
        return acc;
      }, { ...DEFAULT_MENU_STATUS }) || { ...DEFAULT_MENU_STATUS };

      const effectiveRole = normalizeRole(userInfo);
      const hydratedUser = { ...userInfo, effectiveRole };
      setMenuStatus(statusMap);
      setUser(hydratedUser);

      // 즐겨찾기 로드 (사용자별 localStorage)
      try {
        const defaultFavorites = canAccessCrm(hydratedUser)
          ? ["show_first_coverage_check", "show_insu", "show_proposal", "show_financial_portfolio"]
          : ["show_dm", "show_premium_compare", "show_surgery", "show_disease", "show_cont", "show_coverage_stats"];
        const savedFavs = localStorage.getItem(`mr-favorites-${userId}`);
        if (savedFavs) {
          const parsedFavs = JSON.parse(savedFavs).filter((id: string) => id !== "show_exam");
          const shouldResetForCurrentHome = parsedFavs.length === 0 || !defaultFavorites.every((id) => parsedFavs.includes(id));
          const nextFavs = shouldResetForCurrentHome ? defaultFavorites : parsedFavs;
          setFavorites(nextFavs);
          if (shouldResetForCurrentHome) localStorage.setItem(`mr-favorites-${userId}`, JSON.stringify(nextFavs));
        } else {
          setFavorites(defaultFavorites);
          localStorage.setItem(`mr-favorites-${userId}`, JSON.stringify(defaultFavorites));
        }
        const savedVisibility = localStorage.getItem(`mr-favorites-visible-${userId}`);
        if (savedVisibility !== null) setIsFavoritesVisible(savedVisibility !== "false");
      } catch { /* ignore */ }

      if (canAccessCrm(hydratedUser)) {
        const { data: recentCustomerData } = await supabase
          .from("customers")
          .select("*")
          .eq("advisor_id", userId)
          .is("deleted_at", null)
          .order("join_date", { ascending: false })
          .limit(5);

        setRecentCustomers(recentCustomerData || []);
      } else {
        setRecentCustomers([]);
      }

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

  // 즐겨찾기 순서 변경 (드래그앤드롭)
  const reorderFavorites = (newIds: string[]) => {
    setFavorites(newIds);
    if (user?.id) localStorage.setItem(`mr-favorites-${user.id}`, JSON.stringify(newIds));
  };

  const toggleFavoritesVisible = () => {
    setIsFavoritesVisible(prev => {
      const next = !prev;
      if (user?.id) localStorage.setItem(`mr-favorites-visible-${user.id}`, String(next));
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
  
  const isApproved = isApprovedUser(user);
  const isGuest = !isApproved;

  // 공지 카운트 — 컴포넌트 전역 (GeneralHome/ProHome 버튼에서도 사용)
  const noticeCnt = announcements.filter(a => a.category === 'notice').length;
  const updateCnt = announcements.filter(a => a.category === 'update').length;
  const canUseOffice = canAccessOffice(user);
  const canUseCrm = canAccessCrm(user);
  const visibleConsultingTools = CONSULTING_TOOLS.filter((m) => {
    if (isToolHidden(menuLayout, m.id)) return false;
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

  const renderConsultingView = () => {
    // 마스터 일반 보기
    const rawPreviewTools = (isMaster && masterPreviewMode === 'general')
      ? CONSULTING_TOOLS.filter(m => m.placement !== 'office' && m.access !== 'office' && (m.fixed || menuStatus[m.id] !== false))
      : visibleConsultingTools
    const previewTools = orderToolsByLayout(
      rawPreviewTools.filter((tool) => menuLayout.desktopHome.includes(tool.id)),
      menuLayout.desktopHome
    )

    // 카테고리별 섹션 — 모든 카테고리 포함
    const allCategorySections = CONSULTING_TOOL_CATEGORIES
      .map(cat => {
        const allCatTools = orderToolsByLayout(
          CONSULTING_TOOLS.filter(t => t.category === cat.id && t.placement !== 'office' && !t.hideFromMainGrid && menuLayout.desktopHome.includes(t.id) && !isToolHidden(menuLayout, t.id)),
          menuLayout.desktopHome
        )
        return {
          ...cat,
          tools: allCatTools.map(t => {
            const locked = (isMaster && masterPreviewMode === 'general')
              ? t.access === 'office'
              : !previewTools.some(v => v.id === t.id)
            return { ...t, locked }
          }),
        }
      })
      .filter(cat => cat.tools.length > 0)

    const mobileQuickIds = menuLayout.mobileQuick.length
      ? menuLayout.mobileQuick
      : (canUseCrm
        ? ["show_first_coverage_check", "show_insu", "show_proposal", "show_financial_portfolio", "show_dm", "show_premium_compare"]
        : ["show_premium_compare", "show_surgery", "show_disease", "show_cont", "show_dm", "show_coverage_stats"])
    const mobileQuickTools = mobileQuickIds
      .map(id => visibleConsultingTools.find(tool => tool.id === id))
      .filter(Boolean) as ConsultingTool[]
    const mobileMoreTools = orderToolsByLayout(
      visibleConsultingTools.filter((tool) => menuLayout.mobileMore.includes(tool.id)),
      menuLayout.mobileMore
    )
    const mobileCategorySections = CONSULTING_TOOL_CATEGORIES
      .map((cat) => ({
        ...cat,
        tools: mobileMoreTools.filter((tool) => tool.category === cat.id),
      }))
      .map(cat => ({ ...cat, tools: cat.tools.filter(tool => !(tool as any).locked) }))
      .filter(cat => cat.tools.length > 0)

    // 진료기록확인·상품공시조회 숨김(사이드바 전용) / 내보험바로알기+고객상담카드 통합
    const HIDDEN_FROM_MAIN = new Set(['show_hira', 'show_gongsi'])
    const COMBINED_FACE_IDS = new Set(['show_insurance_survey', 'show_card_consult'])

    return (
      <div className="mx-auto max-w-[1680px] min-w-0 pb-3">
        {!isApproved && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
            <p className="text-sm font-black text-amber-800">{isGuest ? "타사 게스트 계정입니다" : "관리자 승인 대기 중입니다"}</p>
            <p className="mt-1 text-xs font-bold text-amber-700">
              {isGuest ? "기본 공개 도구만 이용 가능합니다." : "승인 후 전체 상담 도구를 이용할 수 있습니다."}
            </p>
          </div>
        )}

        {/* ── 헤더 ── */}
        <header className="mb-3 flex flex-col gap-2 px-0.5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[22px] font-black leading-tight tracking-[-0.01em] text-[#10203a]">
              {(user.name || user.email?.split("@")[0] || "")}님, {canUseCrm ? "오늘 상담을 시작해볼까요?" : "필요한 도구를 빠르게 열어보세요"}
            </h1>
          </div>
          <div className="flex min-h-[34px] w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 xl:w-auto xl:flex-wrap xl:justify-end xl:overflow-visible xl:pb-0">
            {/* 공지·업데이트 통합 버튼 */}
            <button
              onClick={() => { setShowNoticePopup(true); setNoticePopupTab('notice'); }}
              className="relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce6f1] bg-white px-3 text-[11px] font-black text-[#10203a] shadow-sm hover:border-[#1b54ad] hover:text-[#1b54ad]"
            >
              <Bell className="h-3.5 w-3.5" />
              공지·업데이트
              {(noticeCnt + updateCnt) > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#e63946] text-[9px] font-black text-white">
                  {noticeCnt + updateCnt}
                </span>
              )}
            </button>
            <button
              onClick={() => window.open("/guide.html", "_blank", "width=1100,height=800,menubar=no,toolbar=no,location=no")}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce6f1] bg-white px-3 text-[11px] font-black text-[#1b54ad] shadow-sm hover:border-[#1b54ad]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              사용가이드
            </button>
            <button
              onClick={() => window.open("https://signalgroup-sigma.vercel.app/index.html", "_blank")}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#0a3268] bg-[#0a3268] px-3 text-[11px] font-black text-white shadow-sm hover:bg-[#082455]"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              시그널그룹 홈페이지
            </button>
            {/* 이달의 상품전략 */}
            {isApproved && (
              <button
                onClick={() => setActiveTab('strategy')}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#c9a96e] bg-[#fffbf0] px-3 text-[11px] font-black text-[#8a6a1e] shadow-sm hover:bg-[#fff3d0]"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                이달의 상품전략
              </button>
            )}
            <button
              onClick={() => { const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent); window.open(isMobile ? "https://m.cafe.naver.com/signal1035" : "https://cafe.naver.com/signal1035", "_blank"); }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#03c75a] bg-white px-3 text-[11px] font-black text-[#10203a] shadow-sm hover:bg-[#f0fff8]"
            >
              <span className="grid h-4 w-4 place-items-center rounded bg-[#03c75a] text-[10px] font-black text-white">N</span>
              보험의 기준 카페
            </button>
            <button
              onClick={() => window.open("https://open.kakao.com/o/g8ND5toi", "_blank")}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#f2d45c] bg-white px-3 text-[11px] font-black text-[#10203a] shadow-sm hover:bg-[#fffbea]"
            >
              <span className="grid h-4 w-4 place-items-center rounded bg-[#ffe812] text-[10px] font-black text-[#3a2d00]">K</span>
              오픈채팅
            </button>
          </div>
        </header>

        {/* ── 배너 4칸 (placeholder) ── */}
        <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: "배너 1", color: "#eef4fb", text: "#1b54ad" },
            { label: "배너 2", color: "#f0fff8", text: "#0f6e56" },
            { label: "배너 3", color: "#fffbf0", text: "#8a6a1e" },
            { label: "배너 4", color: "#fff5f5", text: "#c0392b" },
          ].map((b, i) => (
            <div
              key={i}
              className="flex min-h-[64px] items-center justify-center rounded-[12px] border border-dashed border-[#d0dce8] text-center"
              style={{ background: b.color }}
            >
              <span className="text-[12px] font-black" style={{ color: b.text }}>{b.label}</span>
            </div>
          ))}
        </section>

        {/* ── 고객관리 캘린더 ── */}
        {isApproved && (
          <CalendarWidget user={user} canUseCrm={canUseCrm} />
        )}

        {/* ── 모바일 전용 ── */}
        <section className="mb-3 rounded-[14px] border border-[#dce6f1] bg-white px-4 py-3 shadow-sm md:hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[14px] font-black text-[#10203a]">모바일 빠른 실행</p>
            <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-[10px] font-black text-[#1b54ad]">Mobile</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mobileQuickTools.map((menu) => (
              <button key={menu.id} type="button" onClick={() => handleNavigation(menu)}
                className="flex min-h-[60px] items-center gap-2 rounded-xl border border-[#dce6f1] bg-[#f8fafc] px-3 py-2 text-left active:scale-[0.98]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef4fb] text-[#0a3a86]">
                  <ToolIcon icon={menu.icon} className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[12px] font-black leading-tight text-[#10203a]">{menu.title}</span>
                  {menu.premium && <PremiumMenuBadge />}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="mb-3 rounded-[14px] border border-[#dce6f1] bg-white px-4 py-3 shadow-sm md:hidden">
          <p className="mb-2 text-[14px] font-black text-[#10203a]">전체 메뉴</p>
          <div className="space-y-1.5">
            {mobileCategorySections.map((cat) => (
              <details key={cat.id} className="rounded-xl border border-[#dce6f1] bg-[#f8fafc]">
                <summary className="cursor-pointer px-4 py-3 text-[13px] font-black text-[#10203a]">
                  {cat.title}
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-[#64748b]">{cat.tools.length}개</span>
                </summary>
                <div className="border-t border-[#e8eef5] bg-white p-2">
                  {cat.tools.map((tool) => (
                    <button key={tool.id} type="button" onClick={() => handleNavigation(tool)}
                      className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-left active:bg-[#eef4fb]">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#eef4fb] text-[#0a3a86]">
                        <ToolIcon icon={tool.icon} className="h-4 w-4" />
                      </span>
                      <span className="flex flex-1 items-center gap-2 text-[12px] font-black text-[#10203a]">
                        {tool.title}{tool.premium && <PremiumMenuBadge />}
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#c8d6e5]" />
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── 즐겨찾기 (compact) ── */}
        <section className="mb-3 rounded-[14px] border border-[#dce6f1] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-[#172947] text-[#172947]" />
              <p className="text-[15px] font-black text-[#10203a]">즐겨찾기</p>
              <span className="rounded-full bg-[#f2f5f9] px-2 py-0.5 text-[11px] font-black text-[#4b5d76]">나만의 바로가기</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={toggleFavoritesVisible}
                className="inline-flex items-center gap-1 rounded-lg border border-[#dce6f1] bg-white px-3 py-1.5 text-[11px] font-black text-[#4b5d76]">
                {isFavoritesVisible ? "숨기기" : "보이기"}
              </button>
              <button onClick={() => setIsFavEditMode(!isFavEditMode)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#dce6f1] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-black text-[#21324d]">
                <Star className="h-3 w-3" /> {isFavEditMode ? "완료" : "편집"}
              </button>
            </div>
          </div>
          {!isFavoritesVisible && !isFavEditMode ? (
            <div className="mt-2 flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <Lightbulb className="h-4 w-4" />
              <span>즐겨찾기 영역이 숨겨졌습니다.</span>
            </div>
          ) : favoriteTools.length === 0 && !isFavEditMode ? (
            <div className="mt-2 flex items-center gap-2 text-[12px] font-bold text-[#10203a]">
              <Lightbulb className="h-4 w-4" />
              <span>편집을 눌러 자주 쓰는 도구에 ★ 표시하면 여기에 모입니다.</span>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {(isFavEditMode ? visibleConsultingTools : favoriteTools).map((menu) => {
                const isFav = favorites.includes(menu.id)
                return (
                  <button key={menu.id} type="button"
                    onClick={() => isFavEditMode ? toggleFavorite(menu.id) : handleNavigation(menu)}
                    className="relative flex min-h-[60px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#dce6f1] bg-[#f8fafc] px-2 py-2 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                    {isFavEditMode && <Star className={`absolute right-1.5 top-1.5 h-3 w-3 ${isFav ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />}
                    <ToolIcon icon={menu.icon} className="h-4 w-4 text-[#0f3f86]" />
                    <span className="text-[10px] font-black leading-tight text-[#10203a]">{menu.title}</span>
                    {menu.premium && <PremiumMenuBadge className="absolute left-1.5 top-1.5" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 데스크톱 카테고리 그리드 ── */}
        <div className="hidden md:block">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px', alignItems: 'start' }}>
          {allCategorySections.map((cat) => {
            const isOpen = openConsultCategories[cat.id] ?? false
            // 진료기록확인·상품공시조회 숨김
            const displayTools = cat.tools.filter(t => !HIDDEN_FROM_MAIN.has(t.id))
            // 내보험바로알기 + 고객상담카드는 통합 카드로 처리
            const combinedTools = cat.id === 'face' ? displayTools.filter(t => COMBINED_FACE_IDS.has(t.id)) : []
            const regularTools = cat.id === 'face' ? displayTools.filter(t => !COMBINED_FACE_IDS.has(t.id)) : displayTools
            const visibleCount = regularTools.filter(t => !(t as any).locked).length + (combinedTools.length > 0 ? 1 : 0)

            return (
              <section key={cat.id} className="overflow-hidden rounded-[14px] border border-[#dce6f1] bg-white shadow-sm">
                {/* 아코디언 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleConsultCategory(cat.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#fafcff] transition-colors"
                >
                  <span className="flex-1 text-[15px] font-black text-[#10203a]">{cat.title}</span>
                  <span className="rounded-full bg-[#f0f4f9] px-2.5 py-0.5 text-[10px] font-black text-[#64748b]">{visibleCount}개</span>
                  <ChevronDown className={`h-4 w-4 text-[#9ab4c8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 아코디언 내용 */}
                {isOpen && (
                  <div className="border-t border-[#e8eef5] px-5 py-4">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {regularTools.map((tool) => {
                        const locked = (tool as any).locked
                        return (
                          <button key={tool.id} type="button"
                            onClick={() => { if (locked) return; if (isConsultEditMode && tool.editable) { toggleMenu(tool.id); return; } handleNavigation(tool); }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 100, flex: '1 1 100px', maxWidth: 160, minHeight: 80, borderRadius: 12, border: locked ? '1px solid #edf0f5' : '1px solid #dce6f1', background: locked ? '#f8f9fb' : '#fff', padding: '12px 10px', cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.6 : 1, textAlign: 'center', transition: 'all 0.15s' }}
                            onMouseOver={e => { if (!locked) { (e.currentTarget as HTMLButtonElement).style.background = '#f3f7fe'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8d0f0'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
                            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = locked ? '#f8f9fb' : '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = locked ? '#edf0f5' : '#dce6f1'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                          >
                            <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: locked ? '#edf0f5' : '#eef4fb', color: locked ? '#9aadbe' : '#0a3a86' }}>
                              <ToolIcon icon={tool.icon} className="h-4 w-4" />
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 900, color: locked ? '#9aadbe' : '#10203a', lineHeight: 1.3 }}>{tool.title}</span>
                            {tool.premium && <PremiumMenuBadge />}
                            {locked && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: '#1a2744', borderRadius: 100, padding: '1px 6px' }}>PRO</span>}
                          </button>
                        )
                      })}

                      {/* 통합 카드: 내보험 바로알기 + 고객상담카드 */}
                      {combinedTools.length >= 2 && (() => {
                        const t0 = combinedTools[0]
                        const t1 = combinedTools[1]
                        const locked0 = (t0 as any).locked
                        const locked1 = (t1 as any).locked
                        return (
                          <div style={{ display: 'flex', borderRadius: 12, border: '1px solid #dce6f1', overflow: 'hidden', minWidth: 210, flex: '1 1 210px', maxWidth: 330 }}>
                            <button type="button" onClick={() => { if (!locked0) handleNavigation(t0); }}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '12px 10px', cursor: locked0 ? 'default' : 'pointer', opacity: locked0 ? 0.5 : 1, background: '#fff', border: 'none', minHeight: 80 }}
                              onMouseOver={e => { if (!locked0) (e.currentTarget as HTMLButtonElement).style.background = '#f3f7fe'; }}
                              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                            >
                              <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: '#eef4fb', color: '#0a3a86' }}>
                                <ToolIcon icon={t0.icon} className="h-4 w-4" />
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#10203a', lineHeight: 1.3 }}>{t0.title}</span>
                            </button>
                            <div style={{ width: 1, background: '#e8eef5', flexShrink: 0 }} />
                            <button type="button" onClick={() => { if (!locked1) handleNavigation(t1); }}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '12px 10px', cursor: locked1 ? 'default' : 'pointer', opacity: locked1 ? 0.5 : 1, background: '#fff', border: 'none', minHeight: 80 }}
                              onMouseOver={e => { if (!locked1) (e.currentTarget as HTMLButtonElement).style.background = '#f3f7fe'; }}
                              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                            >
                              <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: '#eef4fb', color: '#0a3a86' }}>
                                <ToolIcon icon={t1.icon} className="h-4 w-4" />
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#10203a', lineHeight: 1.3 }}>{t1.title}</span>
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </section>
            )
          })}
          </div>
        </div>

        {/* ── 공지·업데이트 통합 팝업 ── */}
        {showNoticePopup && (
          <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,20,40,0.45)" }}
            onClick={() => setShowNoticePopup(false)}>
            <div style={{ background:"white",borderRadius:16,maxWidth:540,width:"calc(100% - 32px)",padding:"0",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",maxHeight:"78vh",display:"flex",flexDirection:"column" }}
              onClick={e => e.stopPropagation()}>
              {/* 탭 헤더 */}
              <div style={{ display:"flex",borderBottom:"1px solid #eef3f8",padding:"16px 20px 0" }}>
                <div style={{ display:"flex",gap:0,flex:1 }}>
                  {(['notice','update'] as const).map(tab => (
                    <button key={tab} onClick={() => setNoticePopupTab(tab)}
                      style={{ padding:"8px 18px",fontSize:14,fontWeight:900,border:"none",background:"none",cursor:"pointer",borderBottom: noticePopupTab === tab ? "2.5px solid #1a2744" : "2.5px solid transparent",color: noticePopupTab === tab ? "#1a2744" : "#9ab4c8",transition:"all 0.15s",fontFamily:"inherit",position:"relative" }}>
                      {tab === 'notice' ? '공지사항' : '업데이트'}
                      {tab === 'notice' && noticeCnt > 0 && (
                        <span style={{ position:"absolute",top:4,right:4,background:"#e63946",color:"white",borderRadius:"50%",width:14,height:14,display:"grid",placeItems:"center",fontSize:9,fontWeight:900 }}>{noticeCnt}</span>
                      )}
                      {tab === 'update' && updateCnt > 0 && (
                        <span style={{ position:"absolute",top:4,right:4,background:"#0f6e56",color:"white",borderRadius:"50%",width:14,height:14,display:"grid",placeItems:"center",fontSize:9,fontWeight:900 }}>{updateCnt}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex",gap:6,alignItems:"center",paddingBottom:8 }}>
                  {isMaster && (
                    <button onClick={() => { addAnnouncement(noticePopupTab); setShowNoticePopup(false); }}
                      style={{ fontSize:11,fontWeight:700,color: noticePopupTab === 'notice' ? "#1b54ad" : "#0f6e56",background: noticePopupTab === 'notice' ? "#eef4fb" : "#e1f5ee",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit" }}>
                      + 추가
                    </button>
                  )}
                  <button onClick={() => setShowNoticePopup(false)}
                    style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ab4c8",lineHeight:1 }}>×</button>
                </div>
              </div>
              {/* 탭 내용 */}
              <div style={{ overflowY:"auto",padding:"12px 20px 20px",flex:1 }}>
                {announcements.filter(a => a.category === noticePopupTab).length === 0 ? (
                  <p style={{ fontSize:13,color:"#b8ccd8",fontWeight:700,marginTop:12 }}>
                    {noticePopupTab === 'notice' ? '공지사항이 없습니다.' : '업데이트 소식이 없습니다.'}
                  </p>
                ) : announcements.filter(a => a.category === noticePopupTab).map(ann => (
                  <button key={ann.id} onClick={() => { setSelectedAnnouncement(ann); setShowNoticePopup(false); }}
                    style={{ display:"block",width:"100%",textAlign:"left",padding:"12px 0",borderBottom:"1px solid #eef3f8",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit" }}>
                    {noticePopupTab === 'update' && (
                      <span style={{ background:"#dcfce7",color:"#15803d",fontSize:9,fontWeight:900,borderRadius:12,padding:"2px 8px",marginRight:8 }}>NEW</span>
                    )}
                    <span style={{ fontSize:14,fontWeight:900,color:"#10203a" }}>{ann.title.replace(/^\[.*?\]\s*/, '')}</span>
                    <p style={{ fontSize:11,color:"#8aa0ba",marginTop:4 }}>{new Date(ann.created_at).toLocaleDateString("ko-KR")}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedAnnouncement && (
          <AnnouncementModal
            item={selectedAnnouncement}
            onClose={() => setSelectedAnnouncement(null)}
            onSave={saveAnnouncement}
            onDelete={deleteAnnouncement}
            isMaster={isMaster}
          />
        )}

        {/* ── 저작권 푸터 ── */}
        <footer className="mt-6 border-t border-[#dce6f1] pt-4 pb-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 mb-3">
            <p className="text-[11px] font-black text-amber-800 mb-1">⚠️ 저작권 및 이용 제한 안내</p>
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
              본 플랫폼(메타리치 시그널 CRM)에 포함된 모든 콘텐츠·도구·데이터·분석 결과물은 <strong>메타리치 시그널그룹</strong>의 독점 저작물로,
              무단 복제·배포·상업적 이용이 금지됩니다. 소속 설계사 본인의 업무 목적 외 사용 시 민·형사상 책임을 질 수 있습니다.
            </p>
          </div>
          <p className="text-center text-[10px] font-bold text-[#9ab4c8]">
            © {new Date().getFullYear()} Metarich Signal Group. All rights reserved.
          </p>
        </footer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#eef3f8] flex flex-col lg:flex-row overflow-x-hidden [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      {/* ── 공지·업데이트 통합 팝업 ── */}
      {showNoticePopup && (
        <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,20,40,0.45)" }}
          onClick={() => setShowNoticePopup(false)}>
          <div style={{ background:"white",borderRadius:16,maxWidth:540,width:"calc(100% - 32px)",padding:"0",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",maxHeight:"78vh",display:"flex",flexDirection:"column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex",borderBottom:"1px solid #eef3f8",padding:"16px 20px 0" }}>
              <div style={{ display:"flex",gap:0,flex:1 }}>
                {(['notice','update'] as const).map(tab => (
                  <button key={tab} onClick={() => setNoticePopupTab(tab)}
                    style={{ padding:"8px 18px",fontSize:14,fontWeight:900,border:"none",background:"none",cursor:"pointer",borderBottom: noticePopupTab === tab ? "2.5px solid #1a2744" : "2.5px solid transparent",color: noticePopupTab === tab ? "#1a2744" : "#9ab4c8",transition:"all 0.15s",fontFamily:"inherit",position:"relative" }}>
                    {tab === 'notice' ? '공지사항' : '업데이트'}
                    {tab === 'notice' && noticeCnt > 0 && (
                      <span style={{ position:"absolute",top:4,right:4,background:"#e63946",color:"white",borderRadius:"50%",width:14,height:14,display:"grid",placeItems:"center",fontSize:9,fontWeight:900 }}>{noticeCnt}</span>
                    )}
                    {tab === 'update' && updateCnt > 0 && (
                      <span style={{ position:"absolute",top:4,right:4,background:"#0f6e56",color:"white",borderRadius:"50%",width:14,height:14,display:"grid",placeItems:"center",fontSize:9,fontWeight:900 }}>{updateCnt}</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center",paddingBottom:8 }}>
                {isMaster && (
                  <button onClick={() => { addAnnouncement(noticePopupTab); setShowNoticePopup(false); }}
                    style={{ fontSize:11,fontWeight:700,color: noticePopupTab === 'notice' ? "#1b54ad" : "#0f6e56",background: noticePopupTab === 'notice' ? "#eef4fb" : "#e1f5ee",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit" }}>
                    + 추가
                  </button>
                )}
                <button onClick={() => setShowNoticePopup(false)}
                  style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ab4c8",lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ overflowY:"auto",padding:"12px 20px 20px",flex:1 }}>
              {announcements.filter(a => a.category === noticePopupTab).length === 0 ? (
                <p style={{ fontSize:13,color:"#b8ccd8",fontWeight:700,marginTop:12 }}>
                  {noticePopupTab === 'notice' ? '공지사항이 없습니다.' : '업데이트 소식이 없습니다.'}
                </p>
              ) : announcements.filter(a => a.category === noticePopupTab).map(ann => (
                <button key={ann.id} onClick={() => { setSelectedAnnouncement(ann); setShowNoticePopup(false); }}
                  style={{ display:"block",width:"100%",textAlign:"left",padding:"12px 0",borderBottom:"1px solid #eef3f8",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit" }}>
                  {noticePopupTab === 'update' && (
                    <span style={{ background:"#dcfce7",color:"#15803d",fontSize:9,fontWeight:900,borderRadius:12,padding:"2px 8px",marginRight:8 }}>NEW</span>
                  )}
                  <span style={{ fontSize:14,fontWeight:900,color:"#10203a" }}>{ann.title.replace(/^\[.*?\]\s*/, '')}</span>
                  <p style={{ fontSize:11,color:"#8aa0ba",marginTop:4 }}>{new Date(ann.created_at).toLocaleDateString("ko-KR")}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {selectedAnnouncement && (
        <AnnouncementModal
          item={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          onSave={saveAnnouncement}
          onDelete={deleteAnnouncement}
          isMaster={isMaster}
        />
      )}

      <Sidebar
        user={user}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        mode={viewMode}
        onBack={undefined}
        externalMenuStatus={menuStatus}
        onMenuStatusChange={setMenuStatus}
        menuLayout={menuLayout}
        onMenuLayoutChange={setMenuLayout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenOffice={() => { setViewMode('office'); setActiveTab(null); }}
        onOpenConsulting={() => { setViewMode('consulting'); setActiveTab(null); }}
        onTabChange={(val: string) => setActiveTab(val.startsWith('tab:') ? val.split(':')[1] : val)}
        activeTab={activeTab}
        recentCustomers={recentCustomers}
      />

      <main className="flex-1 min-w-0 p-4 pb-28 transition-all duration-300 sm:p-5 lg:ml-[300px] lg:p-8 xl:p-10">
        {isMaster && viewMode === 'consulting' && !activeTab && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', background: '#e8eef5', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['pro', 'general'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMasterPreviewMode(mode)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 800,
                    background: masterPreviewMode === mode ? '#1a2744' : 'transparent',
                    color: masterPreviewMode === mode ? '#fff' : '#4b5d76',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'pro' ? '프로 보기' : '일반 보기'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-[1680px] min-w-0">
          {activeTab === 'strategy' ? (
            <ProductStrategyBoard user={user} />
          ) : activeTab === 'branding' ? (
            <BrandingAIPage user={user} />
          ) : viewMode === 'office' ? (
            isGuest || !isApproved ? (
              <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
                <div className="text-5xl">{isGuest ? '⛔' : '⏳'}</div>
                <p className="text-xl font-black text-slate-700">
                  {isGuest ? '타사 게스트 계정은 사무실 업무를 이용할 수 없습니다' : '관리자 승인 후 이용 가능합니다'}
                </p>
              </div>
            ) : (
              (() => {
                const props = { user, selectedDate, onTabChange: setActiveTab, currentUserRole: userRole };
                if (isMaster || isHeadquarters) return <MasterView {...props} />;
                if (isLeader) return <LeaderView {...props} />;
                if (isManager) return <ManagerView {...props} />;
                return <AgentView {...props} />;
              })()
            )
          ) : (() => {
            // 2-tier 대시보드: canUseCrm → ProHome, 그 외 → GeneralHome
            // 마스터는 masterPreviewMode 토글로 전환
            const showProHome = isMaster ? masterPreviewMode === 'pro' : canUseCrm
            const commonProps = {
              user,
              announcements,
              favorites,
              isFavEditMode,
              visibleTools: visibleConsultingTools,
              onFavEditToggle: () => setIsFavEditMode(!isFavEditMode),
              onFavToggle: toggleFavorite,
              onNavigate: handleNavigation,
              onNoticeClick: () => { setShowNoticePopup(true); setNoticePopupTab('notice') },
              onStrategyClick: () => setActiveTab('strategy'),
            }
            return showProHome ? (
              <ProHome
                {...commonProps}
                recentCustomers={recentCustomers}
                onFavReorder={reorderFavorites}
              />
            ) : (
              <GeneralHome
                {...commonProps}
                canUseCrm={canUseCrm}
              />
            )
          })()}
        </div>

      </main>
    </div>
  )
}
