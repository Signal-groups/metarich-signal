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
  const [draftSearch, setDraftSearch] = useState(search)

  useEffect(() => {
    setDraftSearch(search)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => onSearchChange(draftSearch), 300)
    return () => window.clearTimeout(timer)
  }, [draftSearch, onSearchChange])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">직원 검색 및 필터</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            전체 {totalCount.toLocaleString()}명 중 {filteredCount.toLocaleString()}명 표시
          </p>
        </div>
        <input
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="이름, 이메일, 연락처 검색..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-[#1a3a6e] lg:w-80"
        />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
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
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 xl:col-span-2">
          {[
            { key: "created_at", label: "가입일 최신순" },
            { key: "name", label: "이름순" },
            { key: "headquarter", label: "본부순" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSortByChange(item.key as SortKey)}
              className={`flex-1 px-3 py-3 text-xs font-black ${sortBy === item.key ? "bg-[#1a3a6e] text-white" : "text-slate-500 hover:bg-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
