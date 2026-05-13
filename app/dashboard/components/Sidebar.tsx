"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability */

import { useState, useEffect } from "react"
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
  Hospital,
  PieChart,
  Scale,
  Search,
  ShieldCheck,
  Stethoscope,
  ScrollText,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"
import { CONSULTING_TOOLS, CONSULTING_TOOL_CATEGORIES, DEFAULT_MENU_STATUS } from "../../../lib/consultingTools"
import { canAccessCrm, normalizeRole, roleLabel, isApprovedUser, isOrganizationAdminAccount } from "../../../lib/roles"

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
    default:
      return <Search className={className} />
  }
}

export default function Sidebar({ 
  user, selectedDate, onDateChange, mode, onBack, 
  externalMenuStatus, onMenuStatusChange, onTabChange, activeTab,
  isOpen, setIsOpen 
}: any) {
  const router = useRouter();
  
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false); 
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const currentRole = normalizeRole(user);
  const isMaster = currentRole === 'master';
  const isLeader = currentRole === 'leader' || currentRole === 'headquarters';
  const isManager = currentRole === 'manager';
  const isAgent = currentRole === 'agent' || isManager || isLeader || isMaster;
  
  const isAdmin = isMaster; 
  const canManageStaff = isOrganizationAdminAccount(user);
  const isStaff = isAgent;
  const isApproved = isApprovedUser(user);

  const getRankDisplay = (role: string) => {
    if (!isApproved) return '게스트(승인대기)';
    return roleLabel({ ...user, role });
  };

  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || DEFAULT_MENU_STATUS);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showStaffManager, setShowStaffManager] = useState(false);

  useEffect(() => {
    if (isApproved) {
      fetchDailyData();
      fetch3MonthAvg();
    }
    fetchMenuSettings();
    if (canManageStaff) fetchStaffList();
  }, [dateStr, user?.id, isApproved]);

  useEffect(() => {
    if (externalMenuStatus) setMenuStatus(externalMenuStatus);
  }, [externalMenuStatus]);

  async function fetchStaffList() {
    const { data } = await supabase.from("users").select("*").order("name", { ascending: true });
    if (data) setStaffList(data);
  }

  async function updateStaffRole(staffId: string, newRole: string) {
    const roleLevel = newRole === "leader" ? "director" : newRole;
    const { error } = await supabase.from("users").update({ role: newRole, role_level: roleLevel, rank: newRole }).eq("id", staffId);
    if (!error) { alert("직급 권한이 변경되었습니다."); fetchStaffList(); }
  }

  async function toggleStaffApproval(staffId: string, currentStatus: any) {
    const nextStatus = !(currentStatus === true || currentStatus === "true");
    const { error } = await supabase.from("users").update({ is_approved: nextStatus }).eq("id", staffId);
    if (!error) { alert(nextStatus ? "승인 완료되었습니다." : "승인이 취소되었습니다."); fetchStaffList(); }
  }


  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
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
  const visibleConsultTools = consultTools.filter((tool) =>
    tool.access === "public" ||
    (tool.access === "approved" && isApproved && (menuStatus[tool.id] || isEditMode))
  );
  const highlightTools = visibleConsultTools.filter((tool) => tool.highlight);

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

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-5 left-5 z-[60] bg-[#1a3a6e] text-white p-3 rounded-2xl shadow-lg font-bold text-[10px] transition-all active:scale-90 lg:hidden"
      >
        {isOpen ? 'CLOSE' : 'MENU'}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#1a3a6e] flex flex-col shadow-xl transition-all duration-300 ${isOpen ? 'w-[300px] translate-x-0' : 'w-0 -translate-x-full lg:w-[300px] lg:translate-x-0'}`}>
        <div className={`flex flex-col h-full ${!isOpen && 'hidden lg:flex'}`}>
          {/* Brand Logo Section */}
          <div className="p-6 pb-2 flex-shrink-0 flex flex-col gap-1 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-montserrat font-black text-2xl bg-gradient-to-br from-white to-[#0ea5e9] bg-clip-text text-transparent">MR<span className="text-[#0ea5e9]">SG</span></span>
            </div>
            <p className="text-[10px] text-white/50 font-light tracking-widest uppercase">MetaRich Signal Group</p>
            <div className="h-[1px] bg-white/10 w-full mt-4"></div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 no-scrollbar">
            {/* User Profile Section */}
            <div className="bg-white/5 p-4 rounded-2xl flex flex-col gap-2 transition-all hover:bg-white/10 cursor-pointer" onClick={() => { router.push('/dashboard'); setIsOpen(false); }}>
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
              <p className="text-[10px] text-white/30 font-bold tracking-widest px-2 mb-2">주요 메뉴</p>

              {onBack && (
                <NavItem 
                  icon="⌂" 
                  label="처음 화면" 
                  active={false} 
                  onClick={() => { onBack(); setIsOpen(false); }} 
                />
              )}
              
              <NavItem 
                icon="🏠" 
                label="대시보드" 
                active={mode === 'office'} 
                onClick={() => { router.push('/dashboard'); setIsOpen(false); }} 
              />
              
              <NavItem 
                icon="🤝" 
                label="상담 도구" 
                active={mode === 'consulting'} 
                onClick={() => setIsConsultModalOpen(true)} 
              />

              {canAccessCrm(user) && (
                <NavItem
                  icon="📋"
                  label="고객관리"
                  active={false}
                  onClick={() => {
                    window.open(`${window.location.origin}/crm`, "_blank", "noopener,noreferrer");
                    setIsOpen(false);
                  }}
                />
              )}

              {canManageStaff && (
                <NavItem
                  icon="👥"
                  label="조직 관리"
                  active={showStaffManager}
                  onClick={() => setShowStaffManager(!showStaffManager)}
                />
              )}
            </nav>

            {canManageStaff && showStaffManager && (
              <div className="bg-white p-4 rounded-2xl border border-white/20 space-y-3 shadow-lg">
                <p className="text-[14px] font-black text-[#1a3a6e]">조직 관리</p>
                <p className="text-[13px] leading-relaxed text-slate-500">
                  본부, 사업부, 지점 편집은 대시보드의 조직 관리에서 진행해주세요. 이곳에서는 빠른 승인과 직급만 조정합니다.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[14px] font-black text-slate-900">{staff.name || staff.email}</span>
                        <button onClick={() => toggleStaffApproval(staff.id, staff.is_approved)}
                          className={`text-[13px] px-2 py-1 rounded-lg font-black ${(staff.is_approved === true || staff.is_approved === "true") ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {(staff.is_approved === true || staff.is_approved === "true") ? '승인' : '미승인'}
                        </button>
                      </div>
                      <select value={staff.role || 'agent'} onChange={(e) => updateStaffRole(staff.id, e.target.value)} className="w-full text-[13px] font-bold p-2 bg-white text-slate-900 rounded-lg outline-none">
                        <option value="agent">설계사</option>
                        <option value="manager">지점장</option>
                        <option value="leader">사업부장</option>
                        <option value="headquarters">본부장</option>
                        {isMaster && <option value="master">마스터</option>}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-white/5 text-white/40 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-white/10 transition-colors">
              로그아웃
            </button>
            <div className="text-[10px] text-white/20 text-center font-light">
              배진우 팀장 AFPK<br/>메타리치 시그널그룹
            </div>
          </div>
        </div>
      </aside>

      {isConsultModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl">
            <div className="bg-black p-6 flex justify-between items-center">
              <h3 className="text-[#d4af37] font-black text-xl tracking-tighter">상담 도구</h3>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-3 py-1 rounded-full font-black ${isEditMode ? 'bg-[#d4af37] text-black' : 'bg-white/10 text-white/50 border border-white/20'}`}>
                    {isEditMode ? "완료" : "편집"}
                  </button>
                )}
                <button onClick={() => setIsConsultModalOpen(false)} className="text-[#d4af37] text-2xl font-black">×</button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto no-scrollbar">
              {highlightTools.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <p className="text-[13px] font-black text-slate-900">기본 바로가기</p>
                    <p className="text-[10px] font-bold text-slate-400">승인 전 게스트도 이용 가능한 기본 도구</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {highlightTools.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleLinkClick(item)}
                        className={`min-h-[72px] w-full rounded-2xl border-2 bg-white px-4 py-3 text-left transition-all hover:bg-black hover:text-[#d4af37] ${item.color}`}
                      >
                        <span className="flex items-center gap-3">
                          <ToolIcon icon={item.icon} />
                          <span className="text-[12px] font-black leading-tight">{item.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {CONSULTING_TOOL_CATEGORIES.map((category) => {
                const visibleTools = visibleConsultTools.filter((tool) => !tool.highlight && tool.category === category.id);
                if (visibleTools.length === 0) return null;
                return (
                  <section key={category.id} className="space-y-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">{category.title}</p>
                      <p className="text-[10px] font-bold text-slate-400">{category.desc}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {visibleTools.map((item) => (
                        <div key={item.id} className="relative">
                          <button onClick={() => handleLinkClick(item)} className={`w-full min-h-[72px] flex items-center gap-3 px-4 py-3 border-2 ${item.color} rounded-2xl bg-white hover:bg-black hover:text-[#d4af37] transition-all ${!item.fixed && !menuStatus[item.id] && 'opacity-30'}`}>
                            <ToolIcon icon={item.icon} />
                            <span className="text-[12px] font-black text-left leading-tight">{item.label}</span>
                          </button>
                          {isMaster && isEditMode && item.editable && (
                            <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 accent-black" />
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
    </>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
    >
      <span className={`text-lg transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-[#0ea5e9] rounded-full"></div>}
    </button>
  );
}
