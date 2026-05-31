export default function NoticeBoard() {
  const dummyNotices = [
    { id: 1, title: "3월 프로모션 안내" },
    { id: 2, title: "교육 일정 공지" },
    { id: 3, title: "목표 달성 이벤트" }
  ]

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
      <h2 className="text-[#d4af37] mb-4 font-bold">공지사항</h2>

      <ul className="space-y-3 text-sm">
        {dummyNotices.map((notice) => (
          <li key={notice.id} className="border-b border-gray-800 pb-2">
            {notice.title}
          </li>
        ))}
      </ul>
    </div>
  )
}