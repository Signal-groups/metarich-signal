"use client"

import { useState } from "react"

export default function EmployeeView() {

  // 🔹 더미 데이터
  const goal = 20
  const ap = 30
  const pt = 18
  const contract = 10

  const achievement = ((contract / goal) * 100).toFixed(1)
  const weeklyAvg = (contract / 4).toFixed(1)
  const threeMonthAvg = 12

  const apToPt = ((pt / ap) * 100).toFixed(1)
  const ptToC = ((contract / pt) * 100).toFixed(1)

  const [schedule, setSchedule] = useState("")

  return (
    <div className="space-y-8">

      {/* 🔷 상단 KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="bg-blue-100 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-600">월 목표</h3>
          <p className="text-2xl font-bold text-blue-700 mt-2">{goal}</p>
        </div>

        <div className="bg-green-100 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-600">현재 계약</h3>
          <p className="text-2xl font-bold text-green-700 mt-2">{contract}</p>
        </div>

        <div className="bg-orange-100 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-600">달성률</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">
            {achievement}%
          </p>
        </div>

        <div className="bg-purple-100 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-600">주 평균</h3>
          <p className="text-2xl font-bold text-purple-700 mt-2">
            {weeklyAvg}
          </p>
        </div>

      </div>

      {/* 🔷 전환율 영역 */}
      <div className="grid grid-cols-3 gap-6">

        <div className="bg-gray-100 p-6 rounded-2xl text-center">
          <h4 className="text-gray-600">AP</h4>
          <p className="text-xl font-bold">{ap}</p>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl text-center">
          <h4 className="text-gray-600">PT</h4>
          <p className="text-xl font-bold">{pt}</p>
          <p className="text-sm text-gray-500 mt-1">
            AP → PT {apToPt}%
          </p>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl text-center">
          <h4 className="text-gray-600">C</h4>
          <p className="text-xl font-bold">{contract}</p>
          <p className="text-sm text-gray-500 mt-1">
            PT → C {ptToC}%
          </p>
        </div>

      </div>

      {/* 🔷 최근 평균 */}
      <div className="bg-gray-100 p-6 rounded-2xl">
        <h3 className="font-bold mb-3">최근 3개월 평균 계약</h3>
        <p className="text-2xl font-bold text-blue-600">
          {threeMonthAvg}
        </p>
      </div>

      {/* 🔷 오늘 일정 */}
      <div className="bg-gray-100 p-6 rounded-2xl">
        <h3 className="font-bold mb-3">오늘 일정</h3>

        <textarea
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="오늘 상담 일정 입력..."
          className="w-full p-3 border rounded-xl"
        />

        <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg">
          저장
        </button>
      </div>

      {/* 🔷 상담 툴 버튼 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        <button className="bg-gray-200 p-4 rounded-xl">
          보험료 계산기
        </button>

        <button className="bg-gray-200 p-4 rounded-xl">
          보장 분석 툴
        </button>

        <button className="bg-gray-200 p-4 rounded-xl">
          수수료 계산기
        </button>

        <button className="bg-gray-200 p-4 rounded-xl">
          DB 관리
        </button>

        <button className="bg-gray-200 p-4 rounded-xl">
          교육자료
        </button>

      </div>

    </div>
  )
}