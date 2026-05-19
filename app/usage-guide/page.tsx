"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  ImageDown,
  MessageSquareText,
  Monitor,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react"

type GuideMode = "office" | "consulting"

const stages = ["가망발굴", "사전접근", "초회면담", "사실확인", "제안", "클로징", "사후관리"]

const officeGuides = [
  {
    title: "업로드 분석",
    path: "/crm/upload",
    icon: FileText,
    purpose: "GPTs 분석 결과, 보험증권, 상담 자료를 고객 상담 전 자료로 정리합니다.",
    contents: ["GPTs 보장분석 JSON 붙여넣기", "PDF·엑셀·이미지 자료 분류", "리포트 포함 여부 체크"],
    timing: ["사실확인", "제안", "사후관리"],
    use: "상담 전날 또는 상담 직후, 받은 자료를 한 곳에 정리해 다음 제안 자료의 근거로 씁니다.",
    capture: ["GPTs로 분석하기", "JSON 코드 붙여넣기", "분석 적용하기", "업로드 파일 목록"],
  },
  {
    title: "DM 및 정보 작성",
    path: "/crm/content-studio",
    icon: ImageDown,
    purpose: "공통 정보 이미지를 설계사별 이름·소속·연락처가 들어간 발송 이미지로 만듭니다.",
    contents: ["인스타그램 4:5 이미지", "고객 DM 9:16 이미지", "상단·하단 문구 및 색상 조정", "PNG 다운로드"],
    timing: ["가망발굴", "사전접근", "사후관리"],
    use: "오늘의 정보, 보장 통계, 뉴스 이미지를 고객에게 보낼 때 설계사 개인 브랜딩을 입힙니다.",
    capture: ["관리자 이미지 선택", "문구 설정", "디자인 설정", "최종 발송 이미지"],
  },
  {
    title: "PDF 리포트",
    path: "/crm/reports",
    icon: Presentation,
    purpose: "상담 내용을 고객에게 전달할 수 있는 문서형 결과물로 정리합니다.",
    contents: ["상담 준비 리포트", "담보 상세 리포트", "포함 자료 선택", "PDF 저장"],
    timing: ["제안", "클로징", "사후관리"],
    use: "상담 후 고객에게 다시 설명하거나, 가족과 상의할 자료를 줄 때 사용합니다.",
    capture: ["고객 선택", "리포트 유형", "포함 자료", "리포트 생성"],
  },
  {
    title: "설정",
    path: "/crm/settings",
    icon: ShieldCheck,
    purpose: "담당자 정보, 알림, 자료 관리 방식을 정리해 운영 기준을 맞춥니다.",
    contents: ["담당자 정보", "알림 설정", "자료 관리 방식", "화면 설정"],
    timing: ["사전접근", "사후관리"],
    use: "처음 사용을 시작할 때 또는 팀 운영 기준을 바꿀 때 점검합니다.",
    capture: ["내 정보", "알림 설정", "자료 관리 방식"],
  },
]

const consultingGuides = [
  {
    title: "정보확인 도구",
    path: "/dashboard",
    icon: Search,
    purpose: "고객 상담 전 숨은보험금, 진료기록, 약 정보를 빠르게 확인합니다.",
    contents: ["숨은보험금", "진료기록 확인", "약학정보원", "내보험 바로 알기"],
    timing: ["사전접근", "초회면담", "사실확인"],
    use: "고객이 관심을 보였거나, 상담 전 확인할 근거가 필요할 때 사용합니다.",
    capture: ["정보확인 카드", "시작하기", "고객 상담 도구 화면"],
  },
  {
    title: "보장별 통계 자료",
    path: "/insurance-tools/coverage-stats",
    icon: BarChart3,
    purpose: "암·뇌·심장·치매·치아 등 통계 이미지를 상담 근거로 보여줍니다.",
    contents: ["카테고리별 이미지 자료", "키워드 검색", "이미지 팝업 확인"],
    timing: ["초회면담", "사실확인", "제안"],
    use: "고객이 필요성을 느끼지 못할 때 객관적인 자료로 니즈를 환기합니다.",
    capture: ["자료 카테고리", "검색창", "이미지 카드", "팝업 확대"],
  },
  {
    title: "보험료 비교",
    path: "/insurance-tools/premium-compare",
    icon: ClipboardList,
    purpose: "회사별 보험료와 담보 차이를 비교해 제안 방향을 잡습니다.",
    contents: ["상품 선택", "질환 검색", "자주 고지 질환", "회사별 비교"],
    timing: ["사실확인", "제안", "클로징"],
    use: "고객에게 왜 특정 회사나 상품 구성이 필요한지 설명할 때 사용합니다.",
    capture: ["상품 선택", "질환 검색", "비교 결과", "상담 포인트"],
  },
  {
    title: "인수 기준·수술·장해 정보",
    path: "/dashboard",
    icon: Stethoscope,
    purpose: "고객의 병력, 수술, 후유장해 가능성을 상담 중 빠르게 확인합니다.",
    contents: ["회사별 간편 인수 확인", "수술비 검색", "장해분류표", "질병코드 조회"],
    timing: ["사실확인", "제안", "클로징"],
    use: "고지사항이나 청구 가능성, 가입 가능성 질문이 나올 때 현장에서 확인합니다.",
    capture: ["질환 검색", "분류 선택", "상세 기준", "상담 메모"],
  },
  {
    title: "청구 서류 안내",
    path: "/claim-documents",
    icon: MessageSquareText,
    purpose: "보험금 청구, 기타안내, 모니터링 문구를 고객에게 바로 보냅니다.",
    contents: ["청구 유형 선택", "담당자 안내 입력", "보험회사 선택", "문구 복사"],
    timing: ["사후관리", "소개요청"],
    use: "청구 상황에서 고객에게 필요한 서류와 안내 문구를 빠르게 전달합니다.",
    capture: ["안내 종류", "청구 유형", "보험회사 선택", "최종 문구"],
  },
  {
    title: "세일즈 마스터",
    path: "/sales-master",
    icon: BookOpenCheck,
    purpose: "DB 접근, 약속잡기, 반론 처리, 클로징 흐름을 훈련합니다.",
    contents: ["세일즈 프로세스", "DB 영업", "약속잡기", "상황 코치"],
    timing: ["가망발굴", "사전접근", "초회면담", "클로징"],
    use: "상담 전에 말의 순서를 정리하거나 막히는 반론을 준비할 때 사용합니다.",
    capture: ["프로세스 탭", "예시 화법", "체크리스트", "상황 코치"],
  },
]

export default function UsageGuidePage() {
  const [mode, setMode] = useState<GuideMode>("office")
  const guides = mode === "office" ? officeGuides : consultingGuides
  const subtitle = mode === "office"
    ? "자료 준비, 이미지 제작, 리포트 출력처럼 사무실에서 상담 품질을 올리는 업무입니다."
    : "고객 앞에서 확인하고 설명하고 제안하는 데 필요한 상담 지원 도구입니다."

  const stageMap = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      items: guides.filter((guide) => guide.timing.includes(stage)).map((guide) => guide.title),
    }))
  }, [guides])

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[28px] border border-white bg-white p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#2563eb]">Metarich Signal Guide</p>
              <h1 className="text-3xl font-black tracking-tight text-[#1a3a6e] md:text-5xl">보험 설계사 업무 사용 가이드</h1>
              <p className="mt-4 max-w-3xl text-[15px] font-semibold leading-7 text-slate-500">
                고객관리는 제외하고, 사무실에서 준비하는 업무와 고객 앞에서 사용하는 상담 업무를 나누어 정리했습니다.
              </p>
            </div>
            <Link href="/dashboard" className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">
              대시보드로 이동
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <ModeButton
            active={mode === "office"}
            title="사무실 업무"
            desc="자료 정리, 콘텐츠 제작, 리포트 생성"
            icon={<BriefcaseBusiness />}
            onClick={() => setMode("office")}
          />
          <ModeButton
            active={mode === "consulting"}
            title="고객 상담 업무"
            desc="상담 전 확인, 현장 설명, 제안 보조"
            icon={<MessageSquareText />}
            onClick={() => setMode("consulting")}
          />
        </section>

        <section className="mb-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#eff6ff] p-3 text-[#2563eb]"><Sparkles size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-[#1a3a6e]">{mode === "office" ? "사무실 업무의 목적" : "고객 상담 업무의 목적"}</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">{subtitle}</p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-2">
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <article key={guide.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#1a3a6e] p-3 text-white"><Icon size={22} /></div>
                    <div>
                      <h3 className="text-xl font-black text-[#1a3a6e]">{guide.title}</h3>
                      <p className="mt-1 text-xs font-black text-slate-400">{guide.timing.join(" · ")}</p>
                    </div>
                  </div>
                  <Link href={guide.path} target="_blank" className="shrink-0 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-black text-white hover:bg-[#1d4ed8]">
                    열기
                  </Link>
                </div>

                <GuideBlock title="사용 목적" text={guide.purpose} />
                <GuideBlock title="활용 방식" text={guide.use} />

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ListBox title="담고 있는 내용" items={guide.contents} />
                  <ListBox title="화면 캡쳐 포인트" items={guide.capture} />
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-500"><Monitor size={15} /> 화면 위치 예시</div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="mb-3 h-3 w-28 rounded-full bg-slate-200" />
                    <div className="grid grid-cols-3 gap-2">
                      {guide.capture.slice(0, 4).map((item, index) => (
                        <div key={item} className={`rounded-xl p-3 text-center text-[11px] font-black ${index === 0 ? "bg-[#eff6ff] text-[#2563eb]" : "bg-slate-100 text-slate-500"}`}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-[#1a3a6e]">세일즈 프로세스별 사용 위치</h2>
          <div className="grid gap-3 md:grid-cols-7">
            {stageMap.map((entry) => (
              <div key={entry.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-black text-[#1a3a6e]">{entry.stage}</div>
                {entry.items.length ? (
                  <div className="space-y-2">
                    {entry.items.map((item) => (
                      <div key={item} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm">{item}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-400">해당 없음</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function ModeButton({ active, title, desc, icon, onClick }: { active: boolean; title: string; desc: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[24px] border p-6 text-left shadow-sm transition ${active ? "border-[#2563eb] bg-[#1a3a6e] text-white" : "border-slate-200 bg-white text-slate-900 hover:border-[#2563eb]"}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${active ? "bg-white/10 text-white" : "bg-[#eff6ff] text-[#2563eb]"}`}>{icon}</div>
        <div>
          <h2 className="text-2xl font-black">{title}</h2>
          <p className={`mt-1 text-sm font-bold ${active ? "text-white/65" : "text-slate-400"}`}>{desc}</p>
        </div>
      </div>
    </button>
  )
}

function GuideBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1 text-xs font-black text-[#2563eb]">{title}</div>
      <p className="text-sm font-semibold leading-7 text-slate-600">{text}</p>
    </div>
  )
}

function ListBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 text-xs font-black text-slate-500">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm font-bold leading-6 text-slate-700">• {item}</li>
        ))}
      </ul>
    </div>
  )
}
