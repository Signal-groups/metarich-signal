"use client"

import UserRow, { type StaffUser } from "./UserRow"

interface UserTableProps {
  users: StaffUser[]
  selectedIds: Set<string>
  onSelectChange: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onSave: (user: StaffUser) => Promise<void>
  onResetPassword: (user: StaffUser) => void
  viewerId: string
}

export default function UserTable({
  users,
  selectedIds,
  onSelectChange,
  onSelectAll,
  onSave,
  onResetPassword,
  viewerId,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every((user) => selectedIds.has(user.id))

  if (users.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-black text-slate-900">표시할 직원이 없습니다.</p>
        <p className="mt-2 text-sm font-bold text-slate-400">검색어나 필터 조건을 조정해주세요.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="block space-y-3 p-3 md:hidden">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            selected={selectedIds.has(user.id)}
            onSelectChange={onSelectChange}
            onSave={onSave}
            onResetPassword={onResetPassword}
            viewerId={viewerId}
            compact
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-400">
              <th className="w-12 rounded-tl-2xl p-4">
                <input type="checkbox" checked={allSelected} onChange={(event) => onSelectAll(event.target.checked)} className="h-5 w-5 accent-[#1a3a6e]" />
              </th>
              <th className="p-4">이름</th>
              <th className="p-4">구분</th>
              <th className="p-4">소속</th>
              <th className="p-4">직급</th>
              <th className="p-4">권한</th>
              <th className="p-4">승인</th>
              <th className="p-4">가입일</th>
              <th className="rounded-tr-2xl p-4">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selectedIds.has(user.id)}
                onSelectChange={onSelectChange}
                onSave={onSave}
                onResetPassword={onResetPassword}
                viewerId={viewerId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
