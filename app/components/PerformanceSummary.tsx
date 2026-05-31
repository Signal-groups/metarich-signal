export default function PerformanceSummary() {

  const ap = 30
  const pt = 18
  const contract = 10
  const goal = 20

  const achievement = ((contract / goal) * 100).toFixed(1)

  return (
    <div className="bg-gradient-to-r from-[#151515] to-[#0d0d0d] p-8 rounded-2xl border border-[#d4af37]/30">

      <h2 className="text-[#d4af37] text-xl mb-6 font-bold">
        이번달 실적 요약
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">

        <div>
          <p className="text-gray-400">AP</p>
          <p className="text-2xl font-bold">{ap}</p>
        </div>

        <div>
          <p className="text-gray-400">PT</p>
          <p className="text-2xl font-bold">{pt}</p>
        </div>

        <div>
          <p className="text-gray-400">C</p>
          <p className="text-2xl font-bold">{contract}</p>
        </div>

        <div>
          <p className="text-gray-400">달성률</p>
          <p className="text-2xl font-bold text-[#d4af37]">
            {achievement}%
          </p>
        </div>

      </div>
    </div>
  )
}