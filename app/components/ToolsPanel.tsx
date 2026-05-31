import Link from "next/link"

export default function ToolsPanel() {
  const tools = [
    { name: "보험료 계산기", path: "/tools/premium" },
    { name: "보장 분석 툴", path: "/tools/analysis" },
    { name: "수수료 계산기", path: "/tools/commission" },
    { name: "DB 관리", path: "/tools/db" },
    { name: "교육자료", path: "/tools/education" }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">

      {tools.map((tool, index) => (
        <Link
          key={index}
          href={tool.path}
          className="bg-[#111] p-6 rounded-2xl text-center border border-gray-800 hover:border-[#d4af37] transition"
        >
          {tool.name}
        </Link>
      ))}

    </div>
  )
}