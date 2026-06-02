"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// InfoPanel — 정보 입력 패널 (직접 관리 파일. Codex 수정 금지)
// 스펙 3단계 1단계 필드 전체 포함
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useRef } from 'react'
import type { AgentInfo, BrandingState } from '../../templates/types'

interface InfoPanelProps {
  state: BrandingState
  onPatchState: (patch: Partial<BrandingState>) => void
}

function upd(
  onPatchState: (patch: Partial<BrandingState>) => void,
  current: AgentInfo,
  patch: Partial<AgentInfo>,
) {
  onPatchState({ agentInfo: { ...current, ...patch } })
}

function toB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = (e) => res(e.target?.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export default function InfoPanel({ state, onPatchState }: InfoPanelProps) {
  const info = state.agentInfo
  const imgRef = useRef<HTMLInputElement>(null)
  const u = (patch: Partial<AgentInfo>) => upd(onPatchState, info, patch)

  return (
    <section className="space-y-6 pb-4">

      {/* ── 프로필 이미지 ── */}
      <FieldGroup title="프로필 이미지">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {info.profileImg
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={info.profileImg} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-2xl">👤</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => imgRef.current?.click()}
            >
              + 이미지 업로드
            </button>
            {info.profileImg && (
              <button
                type="button"
                className="h-8 rounded-md border border-red-200 px-3 text-xs font-bold text-red-500 hover:bg-red-50"
                onClick={() => u({ profileImg: '' })}
              >
                삭제
              </button>
            )}
          </div>
        </div>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            if (e.target.files?.[0]) u({ profileImg: await toB64(e.target.files[0]) })
          }}
        />
      </FieldGroup>

      {/* ── 기본 정보 ── */}
      <FieldGroup title="기본 정보">
        <Field label="이름 *"    value={info.name}    ph="홍길동"           onChange={(v) => u({ name: v })} />
        <Field label="직함"      value={info.title}   ph="AFPK 재무설계사"  onChange={(v) => u({ title: v })} />
        <Field label="소속 회사 *" value={info.company} ph="메타리치 시그널그룹" onChange={(v) => u({ company: v })} />
        <Field label="지점/팀"   value={info.branch}  ph="강남지점"          onChange={(v) => u({ branch: v })} />
        <Field label="브랜드명"  value={info.brand}   ph="보험의 기준"       onChange={(v) => u({ brand: v })} />
      </FieldGroup>

      {/* ── 연락처 ── */}
      <FieldGroup title="연락처">
        <Field label="전화번호"        value={info.phone}      ph="010-0000-0000"           onChange={(v) => u({ phone: v })} />
        <Field label="이메일"          value={info.email}      ph="name@company.kr"         onChange={(v) => u({ email: v })} />
        <Field label="팩스"            value={info.fax}        ph="02-000-0000"             onChange={(v) => u({ fax: v })} />
        <Field label="카카오 오픈채팅" value={info.kakaoUrl}   ph="https://open.kakao.com/" onChange={(v) => u({ kakaoUrl: v })} tip="명함 💬 버튼 연결" />
        <Field label="상담 신청 URL"   value={info.consultUrl} ph="https://..."             onChange={(v) => u({ consultUrl: v })} tip="CTA 버튼 연결" />
        <Field label="리쿠르팅 URL"    value={info.recruitUrl} ph="https://..."             onChange={(v) => u({ recruitUrl: v })} tip="리쿠르팅 CTA 연결" />
        <Field label="주소"            value={info.address}    ph="서울시 강남구 테헤란로"  onChange={(v) => u({ address: v })} />
      </FieldGroup>

      {/* ── SNS / 채널 ── */}
      <FieldGroup title="SNS / 채널">
        <Field label="네이버 블로그" value={info.blogUrl}       ph="https://blog.naver.com/" onChange={(v) => u({ blogUrl: v })} />
        <Field label="인스타그램"   value={info.instagramUrl}  ph="https://instagram.com/"  onChange={(v) => u({ instagramUrl: v })} />
        <Field label="유튜브"       value={info.youtubeUrl}    ph="https://youtube.com/"    onChange={(v) => u({ youtubeUrl: v })} />
        <Field label="네이버 카페"  value={info.cafeUrl}       ph="https://cafe.naver.com/" onChange={(v) => u({ cafeUrl: v })} />
        <Field label="홈페이지"     value={info.websiteUrl}    ph="https://..."             onChange={(v) => u({ websiteUrl: v })} />

        {/* 추가 링크 (최대 5개) */}
        {info.extraLinks.map((link, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="h-9 w-20 shrink-0 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#1A2744]"
              placeholder="이름"
              value={link.label}
              onChange={(e) => {
                const next = [...info.extraLinks]
                next[i] = { ...next[i], label: e.target.value }
                u({ extraLinks: next })
              }}
            />
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#1A2744]"
              placeholder="https://"
              value={link.url}
              onChange={(e) => {
                const next = [...info.extraLinks]
                next[i] = { ...next[i], url: e.target.value }
                u({ extraLinks: next })
              }}
            />
            <button
              type="button"
              className="h-9 w-9 shrink-0 rounded-md border border-red-200 text-xs font-bold text-red-400 hover:bg-red-50"
              onClick={() => u({ extraLinks: info.extraLinks.filter((_, j) => j !== i) })}
            >✕</button>
          </div>
        ))}
        {info.extraLinks.length < 5 && (
          <button
            type="button"
            className="h-8 w-full rounded-md border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-400"
            onClick={() => u({ extraLinks: [...info.extraLinks, { label: '', url: '' }] })}
          >
            + 링크 추가 ({info.extraLinks.length}/5)
          </button>
        )}
      </FieldGroup>

      {/* ── 자격사항 ── */}
      <FieldGroup title="자격사항">
        {info.qualifications.map((q, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-[#1A2744]"
              placeholder="예: AFPK, CFP"
              value={q}
              onChange={(e) => {
                const next = [...info.qualifications]
                next[i] = e.target.value
                u({ qualifications: next })
              }}
            />
            <button
              type="button"
              className="h-9 w-9 shrink-0 rounded-md border border-red-200 text-xs font-bold text-red-400 hover:bg-red-50"
              onClick={() => u({ qualifications: info.qualifications.filter((_, j) => j !== i) })}
            >✕</button>
          </div>
        ))}
        <button
          type="button"
          className="h-8 w-full rounded-md border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-400"
          onClick={() => u({ qualifications: [...info.qualifications, ''] })}
        >
          + 자격사항 추가
        </button>
      </FieldGroup>

      {/* ── 상담 분야 (태그 칩) ── */}
      <FieldGroup title="상담 분야">
        <div className="flex flex-wrap gap-2">
          {info.consultFields.map((field, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              {field}
              <button
                type="button"
                className="ml-0.5 text-slate-400 hover:text-red-500"
                onClick={() => u({ consultFields: info.consultFields.filter((_, j) => j !== i) })}
              >✕</button>
            </span>
          ))}
        </div>
        <TagInput
          placeholder="분야 입력 후 Enter"
          onAdd={(v) => {
            if (!v || info.consultFields.includes(v)) return
            u({ consultFields: [...info.consultFields, v] })
          }}
        />
      </FieldGroup>

      {/* ── 소개 ── */}
      <FieldGroup title="소개">
        <Field
          label="한줄 슬로건"
          value={info.slogan}
          ph="내 보험을 지금 기준으로 다시 점검합니다"
          onChange={(v) => u({ slogan: v })}
        />
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">자기소개</label>
          <textarea
            className="h-24 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-xs leading-5 outline-none focus:border-[#1A2744]"
            placeholder="고객에게 보여줄 소개를 적어주세요."
            value={info.intro}
            onChange={(e) => u({ intro: e.target.value })}
          />
        </div>
      </FieldGroup>

      {/* ── 실적 수치 ── */}
      <FieldGroup title="실적 수치">
        <Field label="누적 상담 수" value={info.stat1} ph="1,200건"  onChange={(v) => u({ stat1: v })} />
        <Field label="고객 만족도"  value={info.stat2} ph="97%"      onChange={(v) => u({ stat2: v })} />
        <Field label="평균 절감액"  value={info.stat3} ph="월 25만원" onChange={(v) => u({ stat3: v })} />
      </FieldGroup>

    </section>
  )
}

// ── 서브 컴포넌트 ──

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({
  label, value, ph, tip, onChange,
}: {
  label: string; value: string; ph?: string; tip?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        {tip && <span className="font-normal text-[10px] text-slate-400">{tip}</span>}
      </label>
      <input
        type="text"
        className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-[#1A2744]"
        value={value}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function TagInput({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  return (
    <input
      type="text"
      className="h-9 w-full rounded-md border border-dashed border-slate-300 px-3 text-xs outline-none focus:border-[#1A2744]"
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        const el = e.target as HTMLInputElement
        onAdd(el.value.trim())
        el.value = ''
      }}
    />
  )
}
