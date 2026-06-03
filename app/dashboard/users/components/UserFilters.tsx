"use client"

import { useEffect, useState } from "react"

type CompanyTypeFilter = "all" | "metarich" | "external"
type ApprovedFilter = "all" | "true" | "false"
type SortKey = "created_at" | "name" | "headquarter"

interface UserFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  companyType: CompanyTypeFilter
  onCompanyTypeChange: (v: CompanyTypeFilter) => void
  headquarter: string
  onHeadquarterChange: (v: string) => void
  rank: string
  onRankChange: (v: string) => void
  approved: ApprovedFilter
  onApprovedChange: (v: ApprovedFilter) => void
  sortBy: SortKey
  onSortByChange: (v: SortKey) => void
  totalCount: number
  filteredCount: number
}

const headquarters = ["1본부", "2본부", "3본부", "4본부", "5본부", "6본부", "7본부", "8본부", "9본부", "10본부", "CJ onstyle"]

const ranks = [
  { value: "agent", label: "설계사" },
  { value: "manager", label: "지점장" },
  { value: "leader", label: "사업부장" },
  { value: "headquarters", label: "본부장" },
  { value: "master", label: "마스터" },
]

export default function UserFilters({
  search,
  onSearchChange,
  companyType,
  onCompanyTypeChange,
  headquarter,
  onHeadquarterChange,
  rank,
  onRankChange,
  approved,
  onApprovedChange,
  sortBy,
  onSortByChange,
  totalCount,
  filteredCount,
}: UserFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search)

  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => onSearchChange(localSearch), 300)
    return () => window.clearTimeout(timer)
  }, [localSearch, onSearchChange])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#1a3a6e]">Staff Filters</p>
          <p className="mt-1 text-sm font-bold text-slate-500">전체 {totalCount}명 중 {filteredCount}명 표시</p>
        </div>
        <input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          placeholder="이름, 이메일, 연락처 검색..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1a3a6e] focus:bg-white lg:max-w-sm"
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <select value={companyType} onChange={(event) => onCompanyTypeChange(event.target.value as CompanyTypeFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
          <option value="all">전체</option>
          <option value="metarich">메타리치</option>
          <option value="external">타사</option>
        </select>
        <select value={headquarter} onChange={(event) => onHeadquarterChange(event.target.value)} disabled={companyType === "external"} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
          <option value="">본부 전체</option>
          {headquarters.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={rank} onChange={(event) => onRankChange(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
          <option value="">등급 전체</option>
          {ranks.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={approved} onChange={(event) => onApprovedChange(event.target.value as ApprovedFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
          <option value="all">승인 전체</option>
          <option value="true">승인</option>
          <option value="false">미승인</option>
        </select>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "created_at", label: "가입일 최신순" },
            { key: "name", label: "이름순" },
            { key: "headquarter", label: "본부순" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSortByChange(item.key as SortKey)}
              className={`rounded-xl px-2 py-3 text-[12px] font-black transition ${sortBy === item.key ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
