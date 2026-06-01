"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"

export default function BrandingAIPageInner({ user }: { user?: any }) {
  const advisorName = user?.name || "담당자"

  return (
    <section className="min-w-0 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-[12px] font-black uppercase tracking-widest text-[#2563eb]">Branding AI</p>
        <h1 className="mt-2 text-2xl font-black text-[#1a3a6e] md:text-3xl">
          {advisorName} 보험 전문가 브랜딩 페이지
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] font-bold leading-6 text-slate-500">
          브랜딩 빌더 화면은 현재 정리 중입니다. 대시보드와 상담 업무 화면은 정상적으로 사용할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          "상담 소개 문구",
          "보장분석 안내",
          "고객 전달용 페이지",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[14px] font-black text-slate-800">{item}</p>
            <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
              문구가 길어져도 카드 안에서 자연스럽게 줄바꿈되도록 정리했습니다.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
