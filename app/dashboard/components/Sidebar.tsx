"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability */

import { useState, useEffect, useMemo } from "react"
import type React from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calculator,
  CarFront,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  Home,
  Hospital,
  MessageSquareText,
  MoreHorizontal,
  PieChart,
  Scale,
  Search,
  ShieldCheck,
  Stethoscope,
  ScrollText,
  Users,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"
import { CONSULTING_TOOLS, CONSULTING_TOOL_GROUPS, DEFAULT_MENU_STATUS } from "../../../lib/consultingTools"
import { MENU_LAYOUT_KEY, MENU_LAYOUT_LABELS, type MenuLayout, type MenuLayoutZone, defaultMenuLayout, isToolHidden, normalizeMenuLayout, orderToolsByLayout } from "../../../lib/menuLayout"
import { canAccessCrm, canAccessOffice, canAccessClaim, canAccessBranding, normalizeRole, roleLabel, isApprovedUser } from "../../../lib/roles"
import LibrarySearchPopup from "./LibrarySearchPopup"

function ToolIcon({ icon }: { icon: string }) {
  const className = "h-5 w-5"
  switch (icon) {
    case "cafe":
      return <BookOpen className={className} />
    case "search":
      return <Search className={className} />
    case "hospital":
      return <Hospital className={className} />
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
      return <GraduationCap className={className} />
    case "dm":
      return <ScrollText className={className} />
    case "직원관리":
      return <Users className={className} />
    case "시험":
      return <GraduationCap className={className} />
    default:
      return <Search className={className} />
  }
}

export default function Sidebar({ 
  user, selectedDate, onDateChange, mode, onBack, 
  externalMenuStatus, onMenuStatusChange, onTabChange, activeTab,
  isOpen, setIsOpen, onOpenOffice, onOpenConsulting,
  menuLayout, onMenuLayoutChange
}: any) {
  const router = useRouter();
  
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isLibrarySearchOpen, setIsLibrarySearchOpen] = useState(false);
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const currentRole = normalizeRole(user);
  const isMaster = currentRole === 'master';
  const isLeader = currentRole === 'leader' || currentRole === 'headquarters';
  const isManager = currentRole === 'manager';
  const isAgent = currentRole === 'agent' || isManager || isLeader || isMaster;
  
  const isAdmin = isMaster;
  const isStaff = isAgent;
  const isApproved = isApprovedUser(user);
  const canUseOffice = canAccessOffice(user);
  const canUseCrm = canAccessCrm(user);
  const canUseClaim = canAccessClaim(user);
  const canUseBranding = canAccessBranding(user);

  const getRankDisplay = (role: string) => {
    if (!isApproved) return '게스트(승인대기)';
    return roleLabel({ ...user, role });
  };

  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || DEFAULT_MENU_STATUS);
  const [isEditMode, setIsEditMode] = useState(false); 
  const activeMenuLayout = useMemo(() => normalizeMenuLayout(menuLayout), [menuLayout]);
  const [layoutDraft, setLayoutDraft] = useState<MenuLayout>(() => activeMenuLayout);
  const [draggedTool, setDraggedTool] = useState<{ id: string; from: MenuLayoutZone } | null>(null);
  useEffect(() => {
    if (isApproved) {
      fetchDailyData();
      fetch3MonthAvg();
    }
    fetchMenuSettings();
    // 시험 허브 오답노트가 사용자별로 분리되도록 localStorage에 사용자 정보 저장
    if (user?.id) {
      try {
        localStorage.setItem('mrsg_uid', user.id);
        localStorage.setItem('mrsg_uname', user?.name || '사용자');
      } catch(e) { /* ignore */ }
    }
  }, [dateStr, user?.id, isApproved]);

  useEffect(() => {
    if (externalMenuStatus) setMenuStatus(externalMenuStatus);
  }, [externalMenuStatus]);

  useEffect(() => {
    if (isConsultModalOpen) setLayoutDraft(activeMenuLayout);
  }, [activeMenuLayout, isConsultModalOpen]);

  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        if (curr.value === "true" || curr.value === "false") acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus((prev: any) => ({ ...prev, ...settings }));
      if (onMenuStatusChange) onMenuStatusChange(settings);
    }
  }

  const toggleMenu = async (key: string) => {
    if (!isAdmin) return; 
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    setMenuStatus(updatedStatus);
    if (onMenuStatusChange) onMenuStatusChange(updatedStatus);
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase.from("team_settings").select("value").eq("key", `daily_instruction_${dateStr}`).maybeSingle();
    setDailyAdminNotice(data ? data.value : "해당 날짜의 전달사항이 없습니다.");
  }

  async function fetch3MonthAvg() {
    const d = new Date(selectedDate);
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
    const endOfRange = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
    let queryBuilder = supabase.from("daily_perf").select("contract_amt, contract_cnt, user_id, date").gte("date", startOfRange).lt("date", endOfRange);
    if (!isMaster && !isLeader) queryBuilder = queryBuilder.eq("user_id", user?.id);
    const { data } = await queryBuilder; 
    if (data && data.length > 0) {
      const totalAmt = data.reduce((acc, curr) => acc + (Number(curr.contract_amt) || 0), 0);
      const totalCnt = data.reduce((acc, curr) => acc + (Number(curr.contract_cnt) || 0), 0);
      setThreeMonthAvg({ amt: Math.round(totalAmt / 3), cnt: Number((totalCnt / 3).toFixed(1)) });
    }
  }

  const saveDailyNotice = async (val: string) => {
    if (!isAdmin) return;
    setDailyAdminNotice(val);
    await supabase.from("team_settings").upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
  };

  const consultTools = CONSULTING_TOOLS.filter((tool) => tool.placement !== "office");
  const visibleConsultTools = consultTools.filter((tool) => {
    if (isToolHidden(activeMenuLayout, tool.id)) return false;
    if (!isApproved && tool.category === "face") return false;
    if (tool.staffOnly && !isApproved) return false;
    if (!isApproved) return tool.guestVisible === true;
    // "office" 접근 레벨: 설계사 이상 + 사무실업무(office_access) 체크된 경우만 노출. fixed=true 항목은 항상 노출
    if (tool.access === "office") return canUseOffice && (tool.fixed || menuStatus[tool.id] || isEditMode);
    if (tool.access === "approved") return isStaff && (tool.fixed || menuStatus[tool.id] || isEditMode);
    if (tool.access === "guest_approved") return isApproved && (tool.fixed || menuStatus[tool.id] || isEditMode);
    return tool.access === "public";
  });
  const sidebarLayoutTools = orderToolsByLayout(
    visibleConsultTools.filter((tool) => activeMenuLayout.desktopSidebar.includes(tool.id)),
    activeMenuLayout.desktopSidebar
  );
  const highlightTools: typeof visibleConsultTools = [];

  const moveLayoutTool = (toolId: string, targetZone: MenuLayoutZone) => {
    setLayoutDraft((prev) => {
      const next = normalizeMenuLayout(prev);
      const zonesToEdit: MenuLayoutZone[] =
        targetZone === "hidden"
          ? ["desktopHome", "desktopSidebar", "mobileQuick", "mobileMore", "hidden"]
          : targetZone === "desktopHome" || targetZone === "desktopSidebar"
            ? ["desktopHome", "desktopSidebar", "hidden"]
            : ["mobileQuick", "mobileMore", "hidden"];
      zonesToEdit.forEach((zone) => {
        next[zone] = next[zone].filter((id) => id !== toolId);
      });
      next[targetZone] = [...next[targetZone], toolId];
      return normalizeMenuLayout(next);
    });
  };

  const saveMenuLayout = async () => {
    if (!isMaster) return;
    const normalized = normalizeMenuLayout(layoutDraft);
    setLayoutDraft(normalized);
    onMenuLayoutChange?.(normalized);
    await supabase
      .from("team_settings")
      .upsert({ key: MENU_LAYOUT_KEY, value: JSON.stringify(normalized) }, { onConflict: "key" });
    alert("메뉴 배치가 저장되었습니다.");
  };

  const resetMenuLayout = () => {
    setLayoutDraft(defaultMenuLayout());
  };

  const layoutZones: MenuLayoutZone[] = ["desktopHome", "desktopSidebar", "mobileQuick", "mobileMore", "hidden"];

  const getLayoutTool = (toolId: string) => CONSULTING_TOOLS.find((tool) => tool.id === toolId);

  const handleLinkClick = (item: any) => {
    if (isEditMode) return; 

    if (item.url && item.url.startsWith('tab:')) {
      const targetTab = item.url.split(':')[1];
      if (onTabChange) onTabChange(targetTab);
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }

    if (item.url) {
      let finalUrl = "";

      if (item.url.startsWith('http')) {
        finalUrl = item.url;
      } else {
        // ✅ [수정] 경로가 슬래시(/)로 시작하도록 보정하여 도메인과 결합
        const cleanPath = item.url.startsWith('/') ? item.url : `/${item.url}`;
        finalUrl = `${window.location.origin}${cleanPath}`;
      }

      if (item.chromeRecommended) {
        navigator.clipboard?.writeText(finalUrl).catch(() => {});
        alert("숨은 보험금 찾기 링크를 복사했습니다.\n크롬을 열고 주소창에 붙여넣어 접속해주세요.\n\n" + finalUrl);
        setIsOpen(false);
        setIsConsultModalOpen(false);
        return;
      }

      window.open(finalUrl, "_blank", "noopener,noreferrer");

      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }
  };

  const openContentStudio = () => {
    const popup = window.open(
      `${window.location.origin}/dm`,
      "metarich-dm",
      "width=1280,height=920,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes"
    );
    if (!popup) window.open(`${window.location.origin}/dm`, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const openInsuranceCafe = () => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const url = isMobile ? "https://m.cafe.naver.com/signal1035" : "https://cafe.naver.com/signal1035";
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const openCustomerSupportApp = () => {
    window.open("https://drive.google.com/file/d/1VWrxYq8sal3CB-c7eRv-mKQOocfw_IIa/view?usp=sharing", "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const openInsuranceChat = () => {
    window.open("https://open.kakao.com/o/g8ND5toi", "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const openCrm = () => {
    window.open("/crm", "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const openInsuranceLibrary = () => {
    setIsLibrarySearchOpen(true);
    setIsOpen(false);
  };

  const openExamHub = () => {
    window.open(`${window.location.origin}/exam-hub/index.html`, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const showClaimAutomationStatus = () => {
    alert("보험금 청구 자동화는 준비 중입니다. 현재는 마스터만 진행 상태를 확인할 수 있습니다.");
    setIsOpen(false);
  };

  const showAiAutomationStatus = () => {
    alert("AI 자동화 도구는 준비 중입니다. 카카오 자동전송, 네이버 키워드 분석, 금소법 검토 기능을 순차 검토 중입니다.");
    setIsOpen(false);
  };

  const openOffice = () => {
    if (onOpenOffice) onOpenOffice();
    else router.push('/dashboard');
    setIsOpen(false);
  };

  const openConsulting = () => {
    if (onOpenConsulting) onOpenConsulting();
    setIsOpen(false);
  };

  const openToolById = (toolId: string) => {
    const tool = CONSULTING_TOOLS.find((item) => item.id === toolId);
    if (tool) handleLinkClick(tool);
  };

  return (
    <>
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed top-5 left-5 z-[60] bg-[#1a3a6e] text-white px-4 py-3 rounded-2xl shadow-lg font-bold text-[10px] transition-all active:scale-90 lg:hidden"
        >
          닫기
        </button>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a3268] shadow-xl transition-all duration-300 ${isOpen ? 'w-[300px] translate-x-0' : 'w-0 -translate-x-full lg:w-[300px] lg:translate-x-0'}`}>
        <div className={`flex flex-col h-full ${!isOpen && 'hidden lg:flex'}`}>
          {/* Brand Logo Section */}
          <div className="flex flex-shrink-0 justify-center px-7 pb-5 pt-6">
            <img
              src="/bohum-logo-sidebar.png"
              alt="보험의 기준"
              className="block h-[64px] w-[202px] object-contain"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 no-scrollbar">
            {/* User Profile Section */}
            <div className="hidden bg-white/5 p-4 rounded-2xl flex-col gap-2 transition-all hover:bg-white/10 cursor-pointer" onClick={() => { router.push('/dashboard'); setIsOpen(false); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white font-bold text-sm truncate">{user?.name || "사용자"}</span>
                  <span className="text-white/50 text-[10px] truncate">{getRankDisplay(user?.role)}</span>
                </div>
              </div>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1">
              <p className="px-2 mb-2 text-[10px] font-bold tracking-widest text-white/30">메인</p>

              <NavItem
                icon="홈"
                label="홈"
                active={mode === 'consulting' && !activeTab}
                onClick={openConsulting}
              />

              {canUseCrm && (
                <NavItem
                  icon="CRM"
                  label="고객관리"
                  active={false}
                  onClick={openCrm}
                  badge="PREMIUM"
                />
              )}

              <NavItem
                icon="자료"
                iconNode={<Search className="h-5 w-5 opacity-80" />}
                label="자료조회"
                active={false}
                onClick={openInsuranceLibrary}
              />

              <NavItem
                icon="exam"
                label="자격시험"
                active={false}
                onClick={() => {
                  window.open(`${window.location.origin}/exam-hub/index.html`, "_blank", "noopener,noreferrer");
                  setIsOpen(false);
                }}
              />

              {!canUseCrm && (
                <NavItem
                  icon="가이드"
                  iconNode={<BookOpen className="h-5 w-5 opacity-80" />}
                  label="사용가이드"
                  active={false}
                  onClick={() => {
                    window.open("/guide.html", "_blank", "width=1100,height=800,menubar=no,toolbar=no,location=no");
                    setIsOpen(false);
                  }}
                />
              )}

              {sidebarLayoutTools.filter((tool) => !["show_dm", "show_exam"].includes(tool.id)).length > 0 && (
                <>
                  <p className="px-2 mb-2 mt-5 text-[10px] font-bold tracking-widest text-white/30">빠른 메뉴</p>
                  {sidebarLayoutTools
                    .filter((tool) => !["show_dm", "show_exam"].includes(tool.id))
                    .map((tool) => (
                      <NavItem
                        key={tool.id}
                        icon={tool.icon}
                        iconNode={<ToolIcon icon={tool.icon} />}
                        label={tool.title}
                        active={false}
                        onClick={() => handleLinkClick(tool)}
                        badge={tool.premium ? "PREMIUM" : undefined}
                      />
                    ))}
                </>
              )}

              {(isApproved || canUseOffice || canUseClaim || canUseBranding || isMaster) && (
                <p className="px-2 mb-2 mt-5 text-[10px] font-bold tracking-widest text-white/30">업무</p>
              )}

              {isApproved && (
                <NavItem
                  icon="dm"
                  iconNode={<ScrollText className="h-5 w-5 opacity-80" />}
                  label="고객 DM 발송"
                  active={false}
                  onClick={openContentStudio}
                />
              )}

              {canUseOffice && (
                <NavItem
                  icon="업무"
                  iconNode={<MessageSquareText className="h-5 w-5 opacity-80" />}
                  label="사무실업무"
                  active={mode === 'office'}
                  onClick={openOffice}
                />
              )}

              {canUseClaim && (
                <NavItem
                  icon="청구"
                  label="보험금 청구 자동화"
                  active={false}
                  onClick={showClaimAutomationStatus}
                  badge="PRO"
                />
              )}

              {canUseClaim && (
                <NavItem
                  icon="AI"
                  label="AI 자동화 도구"
                  active={false}
                  onClick={showAiAutomationStatus}
                  badge="PRO"
                />
              )}

              {canUseBranding && (
                <NavItem
                  icon="🎨"
                  label="설계사 브랜딩 AI"
                  active={false}
                  onClick={() => window.open(`${window.location.origin}/branding-builder`, "_blank", "noopener,noreferrer")}
                  badge="PRO"
                />
              )}

              {isMaster && (
                <NavItem
                  icon="설정"
                  label="메뉴 배치 관리"
                  active={isConsultModalOpen}
                  onClick={() => setIsConsultModalOpen(true)}
                  badge="MASTER"
                />
              )}

              {isMaster && (
                <NavItem
                  icon="직원관리"
                  label="회원관리"
                  active={false}
                  onClick={() => window.open(`${window.location.origin}/dashboard/users`, "_blank", "noopener,noreferrer")}
                />
              )}
            </nav>

            {isApproved && mode === 'office' && (
              <div className="space-y-4">
                {/* Calendar Card */}
                <div className="bg-white rounded-2xl p-2 shadow-lg">
                  <Calendar 
                    onChange={(d: any) => onDateChange(d)} 
                    value={selectedDate} 
                    calendarType="gregory"
                    formatDay={(_, date) => date.getDate().toString()} 
                    className="border-0 w-full text-[11px] font-bold sidebar-calendar" 
                  />
                </div>

                {/* Performance Card */}
                <div className="bg-gradient-to-br from-[#1e40af] to-[#0ea5e9] p-5 rounded-2xl shadow-lg text-white">
                  <p className="text-[9px] text-white/60 font-bold tracking-widest mb-3 text-center">최근 3개월 평균</p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="border-r border-white/10">
                      <p className="text-[8px] opacity-60 font-bold">월평균 금액</p>
                      <p className="text-lg font-montserrat font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
                    </div>
                    <div>
                      <p className="text-[8px] opacity-60 font-bold">월평균 건수</p>
                      <p className="text-lg font-montserrat font-black">{threeMonthAvg.cnt}건</p>
                    </div>
                  </div>
                </div>

                {/* Instruction Box */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-white/40 tracking-widest">전달사항</p>
                  <textarea 
                    value={dailyAdminNotice} 
                    onChange={(e) => isAdmin && saveDailyNotice(e.target.value)} 
                    readOnly={!isAdmin} 
                    className="w-full bg-transparent text-[11px] font-medium outline-none resize-none leading-relaxed text-white/80 min-h-[80px]" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 flex-shrink-0 space-y-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center shadow-sm">
              <p className="text-[10px] font-black tracking-wide text-[#d4af37]">관리자 문의</p>
              <a href="tel:01034302565" className="mt-1 block text-[14px] font-black text-white">
                010-3430-2565
              </a>
            </div>
            <button
              onClick={openCustomerSupportApp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 py-3 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1d4ed8]"
            >
              <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-[#2563eb]">APP</span>
              고객관리 서포트앱
            </button>
            <button
              onClick={() => router.push("/dashboard/settings")}
              style={{ width: "100%", padding: "7px 12px", borderRadius: 8, background: "rgba(55,138,221,0.1)", border: "0.5px solid rgba(55,138,221,0.2)", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}
            >⚙️ 설정</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-white/5 text-white/40 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-white/10 transition-colors">
              로그아웃
            </button>
            <div className="text-[10px] text-white/20 text-center font-light">
              {user?.name || ""}<br/>{user?.department_name || user?.headquarter_name || "메타리치 시그널그룹"}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`${isOpen ? 'hidden' : 'block'} fixed inset-x-0 bottom-0 z-[55] border-t border-slate-200 bg-white/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,.12)] backdrop-blur lg:hidden`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <MobileNavButton label="홈" active={mode === 'consulting' && !isOpen} onClick={openConsulting}>
            <Home className="h-5 w-5" />
          </MobileNavButton>
          <MobileNavButton label="사무실업무" active={mode === 'office' && !isOpen} onClick={openOffice} disabled={!canUseOffice}>
            <MessageSquareText className="h-5 w-5" />
          </MobileNavButton>
          <MobileNavButton label="DM" onClick={openContentStudio} disabled={!isApproved}>
            <ClipboardCheck className="h-5 w-5" />
          </MobileNavButton>
          <MobileNavButton label="메뉴" active={isOpen} onClick={() => setIsOpen(true)}>
            <MoreHorizontal className="h-5 w-5" />
          </MobileNavButton>
        </div>
      </div>

      {isConsultModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-[1180px] rounded-[2rem] border-4 border-black overflow-hidden shadow-2xl">
            <div className="bg-black p-6 flex justify-between items-center">
              <h3 className="text-[#d4af37] font-black text-xl tracking-tighter">메뉴 배치 관리</h3>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-3 py-1 rounded-full font-black ${isEditMode ? 'bg-[#d4af37] text-black' : 'bg-white/10 text-white/50 border border-white/20'}`}>
                    {isEditMode ? "완료" : "편집"}
                  </button>
                )}
                <button onClick={() => setIsConsultModalOpen(false)} className="text-[#d4af37] text-2xl font-black">×</button>
              </div>
            </div>
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
              <p className="text-[12px] font-black text-slate-800">현재 적용 상태</p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                PC 메인, 사이드바, 모바일 빠른실행, 모바일 전체메뉴, 숨김 영역을 한 번에 관리합니다.
              </p>
            </div>
            {isMaster && (
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-black text-slate-950">메뉴 드래그 배치</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      카드를 원하는 영역으로 옮긴 뒤 저장하세요. 저장된 배치는 전체 직원 화면에 적용됩니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetMenuLayout}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50"
                    >
                      기본값
                    </button>
                    <button
                      type="button"
                      onClick={saveMenuLayout}
                      className="rounded-xl bg-[#10203a] px-4 py-2 text-[11px] font-black text-white shadow-sm hover:bg-[#0a3268]"
                    >
                      배치 저장
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {layoutZones.map((zone) => (
                    <div
                      key={zone}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedTool) moveLayoutTool(draggedTool.id, zone);
                        setDraggedTool(null);
                      }}
                      className={`min-h-[180px] rounded-2xl border-2 border-dashed p-3 ${
                        zone === "hidden"
                          ? "border-rose-200 bg-rose-50"
                          : zone === "desktopSidebar"
                            ? "border-[#0a3268]/25 bg-[#eef4fb]"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[12px] font-black text-slate-900">{MENU_LAYOUT_LABELS[zone]}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500 shadow-sm">
                          {layoutDraft[zone].length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {layoutDraft[zone].map((toolId) => {
                          const tool = getLayoutTool(toolId);
                          if (!tool) return null;
                          return (
                            <div
                              key={`${zone}-${toolId}`}
                              draggable
                              onDragStart={() => setDraggedTool({ id: toolId, from: zone })}
                              onDragEnd={() => setDraggedTool(null)}
                              className="cursor-grab rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-2">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eef4fb] text-[#0a3268]">
                                  <ToolIcon icon={tool.icon} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-black text-slate-900">{tool.title}</p>
                                  <p className="truncate text-[9px] font-bold text-slate-400">{tool.label}</p>
                                </div>
                                {tool.premium && (
                                  <span className="rounded-full bg-[linear-gradient(120deg,#ff4d6d,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef)] px-2 py-0.5 text-[8px] font-black text-white shadow-sm">
                                    PREMIUM
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {layoutZones.filter((target) => target !== zone).slice(0, 4).map((target) => (
                                  <button
                                    key={target}
                                    type="button"
                                    onClick={() => moveLayoutTool(toolId, target)}
                                    className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500 hover:bg-[#10203a] hover:text-white"
                                  >
                                    {MENU_LAYOUT_LABELS[target]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {layoutDraft[zone].length === 0 && (
                          <div className="grid min-h-[76px] place-items-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-[11px] font-black text-slate-300">
                            이곳으로 끌어오기
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isMaster && isEditMode && (
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-slate-600 mr-1">프리셋</span>
                  {([
                    { label: "게스트 승인", keys: ["show_coverage_stats","show_car_accident","show_premium_compare","show_surgery","show_disability","show_underwriting","show_calc","show_financial_portfolio"], off: ["show_insu","show_finance"] },
                    { label: "설계사 전체", keys: ["show_coverage_stats","show_car_accident","show_premium_compare","show_surgery","show_disability","show_underwriting","show_calc","show_financial_portfolio","show_insu","show_finance"], off: [] },
                    { label: "모두 끄기", keys: [], off: ["show_coverage_stats","show_car_accident","show_premium_compare","show_surgery","show_disability","show_underwriting","show_calc","show_financial_portfolio","show_insu","show_finance"] },
                  ] as const).map((preset) => (
                    <button
                      key={preset.label}
                      onClick={async () => {
                        const updates: Record<string, boolean> = {};
                        preset.keys.forEach((k) => { updates[k] = true; });
                        preset.off.forEach((k) => { updates[k] = false; });
                        const newStatus = { ...menuStatus, ...updates };
                        setMenuStatus(newStatus);
                        if (onMenuStatusChange) onMenuStatusChange(newStatus);
                        await Promise.all([...preset.keys, ...preset.off].map((k) =>
                          supabase.from("team_settings").upsert({ key: k, value: String(updates[k]) }, { onConflict: "key" })
                        ));
                      }}
                      className="text-[10px] px-3 py-1 rounded-full font-black bg-white text-slate-700 border border-slate-200 hover:bg-[#d4af37] hover:text-black transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {CONSULTING_TOOL_GROUPS.map((category) => {
                const catTools = category.toolIds
                  .map((id) => visibleConsultTools.find((tool) => tool.id === id))
                  .filter(Boolean) as typeof visibleConsultTools;
                if (catTools.length === 0) return null;
                return (
                  <section key={category.id} className="space-y-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">{category.title}</p>
                      <p className="text-[10px] font-bold text-slate-400">{category.desc}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catTools.map((item) => (
                        <div key={item.id} className="relative">
                          <button
                            onClick={() => handleLinkClick(item)}
                            className={`w-full min-h-[72px] flex items-center gap-3 px-4 py-3 border-2 ${item.color} rounded-2xl bg-white hover:bg-black hover:text-[#d4af37] transition-all ${!item.fixed && !menuStatus[item.id] && 'opacity-30'}`}
                          >
                            <ToolIcon icon={item.icon} />
                            <span className="text-[12px] font-black text-left leading-tight">{item.label}</span>
                            {item.premium && (
                              <span className="ml-auto rounded-full bg-[linear-gradient(120deg,#ff4d6d,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef)] px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                                PREMIUM
                              </span>
                            )}
                          </button>
                          {isMaster && isEditMode && item.editable && !item.fixed && (
                            <input
                              type="checkbox"
                              checked={menuStatus[item.id]}
                              onChange={() => toggleMenu(item.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 accent-black"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isOpen && <div onClick={() => setIsOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />}

      {isLibrarySearchOpen && (
        <LibrarySearchPopup
          onClose={() => setIsLibrarySearchOpen(false)}
          isApproved={isApproved}
        />
      )}
    </>
  );
}

function MobileNavButton({ children, label, active, disabled, onClick }: { children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition-all active:scale-95 ${
        active ? 'bg-[#1a3a6e] text-white shadow-lg shadow-blue-950/20' : 'text-slate-500 hover:bg-slate-100'
      } ${disabled ? 'opacity-35' : ''}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active, onClick, variant, badge, iconNode, arrow }: { icon: string, label: string, active?: boolean, onClick: () => void, variant?: "naver" | "kakao" | "support", badge?: string, iconNode?: React.ReactNode, arrow?: boolean }) {
  const variantClass =
    variant === "naver"
      ? "bg-[#03c75a] text-white hover:bg-[#02b150] shadow-lg shadow-emerald-950/20"
      : variant === "kakao"
        ? "bg-[#FEE500] text-[#191919] hover:bg-[#f4d900] shadow-lg shadow-yellow-950/20"
        : variant === "support"
          ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-lg shadow-blue-950/20"
          : active
            ? "bg-white/15 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5";

  const iconClass =
    variant === "naver"
      ? "bg-white text-[#03c75a] font-black rounded-md w-6 h-6 flex items-center justify-center text-[15px]"
      : variant === "kakao"
        ? "bg-[#191919] text-[#FEE500] font-black rounded-full w-6 h-6 flex items-center justify-center text-[13px]"
        : variant === "support"
          ? "bg-white text-[#2563eb] font-black rounded-md px-1.5 h-6 flex items-center justify-center text-[10px]"
          : `text-lg transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${variantClass}`}
    >
      <span className={iconClass}>{iconNode ?? icon}</span>
      <span className={`text-[13px] ${variant ? 'font-black' : 'font-medium'}`}>{label}</span>
      <span className="ml-auto flex items-center gap-2">
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
            badge === "PREMIUM"
              ? "bg-[linear-gradient(120deg,#ff4d6d,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef)] text-white shadow-sm"
              : "bg-white/20 text-white"
          }`}>{badge}</span>
        )}
        {arrow && <span className="text-[10px] opacity-50">→</span>}
      </span>
    </button>
  )
}
