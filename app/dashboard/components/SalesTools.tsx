"use client"

import { useState } from "react"

export default function SalesTools({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState(100);
  const [r, setR] = useState(5);
  const [t, setT] = useState(10);
  const res = Math.floor(p * Math.pow(1 + r/100, t));

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 font-black text-xl">✕</button>
        <h3 className="text-xl font-black italic uppercase border-b-2 border-black pb-2 text-center">Sales Calculators</h3>
        
        {/* 복리 계산기 */}
        <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border">
          <h4 className="font-black text-[11px] uppercase italic text-slate-400">Compound Interest (복리)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <label className="text-[8px] font-black">원금(만)</label>
              <input type="number" value={p} onChange={e=>setP(Number(e.target.value))} className="w-full p-2 rounded-lg border text-center font-bold text-xs" />
            </div>
            <div className="text-center">
              <label className="text-[8px] font-black">이율(%)</label>
              <input type="number" value={r} onChange={e=>setR(Number(e.target.value))} className="w-full p-2 rounded-lg border text-center font-bold text-xs" />
            </div>
            <div className="text-center">
              <label className="text-[8px] font-black">기간(년)</label>
              <input type="number" value={t} onChange={e=>setT(Number(e.target.value))} className="w-full p-2 rounded-lg border text-center font-bold text-xs" />
            </div>
          </div>
          <div className="pt-4 border-t text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">만기 예상액</p>
            <p className="font-black text-2xl text-indigo-600">{res.toLocaleString()} 만원</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl">
          <h4 className="font-black text-[10px] uppercase italic mb-2 text-[#d4af37]">Sales Tip</h4>
          <p className="text-[10px] font-bold opacity-80 leading-relaxed">
            인플레이션 3% 가정 시, 현재 1억의 20년 후 가치는 약 5,436만원입니다. 고객에게 화폐가치 하락을 방어할 플랜이 필요함을 강조하세요.
          </p>
        </div>
      </div>
    </div>
  )
}