"use client"

/**
 * 보험의 기준 — 전역 로딩 스크린
 * 나침반 SVG 애니메이션 + 필기체 브랜드명
 * layout.tsx 의 ClientLayout 에서 페이지 전환마다 표시
 */
export default function LoadingScreen({ message = "잠시만 기다려 주세요" }: { message?: string }) {
  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: "100%",
      minHeight: "100vh",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0c1428",
    }}>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap");

        @keyframes bezel-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes needle-seek {
          0%   { transform: rotate(-35deg); }
          25%  { transform: rotate(20deg); }
          50%  { transform: rotate(-12deg); }
          75%  { transform: rotate(7deg); }
          90%  { transform: rotate(-3deg); }
          100% { transform: rotate(0deg); }
        }
        /* transform-box: fill-box → 각 요소 자체 바운딩박스 기준으로 정중앙 회전 */
        .ls-bezel-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: bezel-rotate 7s linear infinite;
        }
        .ls-needle-seek {
          transform-box: fill-box;
          transform-origin: center;
          animation: needle-seek 2.8s ease-in-out infinite alternate;
        }
        @keyframes ls-dot-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        .ls-dot {
          animation: ls-dot-bounce 1.1s ease-in-out infinite;
        }
        .ls-dot:nth-child(2) { animation-delay: 0.18s; }
        .ls-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>

      <div style={{ textAlign: "center" }}>
        {/* ── 나침반 SVG ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <svg viewBox="0 0 140 140" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
            {/* 글로우 링 (고정) */}
            <circle cx="70" cy="70" r="67" fill="none" stroke="#C9A96E" strokeWidth="0.5" opacity="0.15"/>

            {/* 회전하는 베젤 그룹 */}
            <g className="ls-bezel-spin">
              <circle cx="70" cy="70" r="62" fill="none" stroke="#C9A96E" strokeWidth="1.2" opacity="0.55"/>
              {/* 눈금 8방향 */}
              {([0,45,90,135,180,225,270,315] as number[]).map((deg, i) => {
                const rad = Math.PI / 180 * deg
                const r1 = 56, r2 = 62
                const x1 = 70 + r1 * Math.sin(rad), y1 = 70 - r1 * Math.cos(rad)
                const x2 = 70 + r2 * Math.sin(rad), y2 = 70 - r2 * Math.cos(rad)
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9A96E" strokeWidth={i % 2 === 0 ? 2 : 0.8} opacity="0.75"/>
              })}
              {/* N/S/E/W */}
              <text x="70" y="10" textAnchor="middle" dominantBaseline="middle" fill="#C9A96E" fontSize="11" fontWeight="bold" fontFamily="sans-serif">N</text>
              <text x="70" y="130" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="sans-serif">S</text>
              <text x="130" y="70" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="sans-serif">E</text>
              <text x="10" y="70" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="sans-serif">W</text>
            </g>

            {/* 나침반 판면 (고정) */}
            <circle cx="70" cy="70" r="50" fill="#0f1e38" stroke="#1A2744" strokeWidth="1"/>
            {/* 십자선 */}
            <line x1="70" y1="24" x2="70" y2="116" stroke="#1A2744" strokeWidth="0.5" opacity="0.5"/>
            <line x1="24" y1="70" x2="116" y2="70" stroke="#1A2744" strokeWidth="0.5" opacity="0.5"/>

            {/* 흔들리는 바늘 */}
            <g className="ls-needle-seek">
              {/* 북쪽 (골드) */}
              <polygon points="70,26 65.5,70 74.5,70" fill="#C9A96E"/>
              {/* 남쪽 (네이비) */}
              <polygon points="70,114 65.5,70 74.5,70" fill="#2D4A8A" opacity="0.65"/>
            </g>

            {/* 중심 허브 */}
            <circle cx="70" cy="70" r="6" fill="#0c1428" stroke="#C9A96E" strokeWidth="1.5"/>
            <circle cx="70" cy="70" r="2.5" fill="#C9A96E"/>
          </svg>
        </div>

        {/* ── 보험의 기준 필기체 ── */}
        <h1
          style={{
            fontFamily: "'Nanum Pen Script', cursive",
            fontSize: "4.5rem",
            lineHeight: 1.2,
            color: "#ffffff",
            margin: 0,
            textAlign: "center",
            width: "100%",
          }}
        >
          보험의 기준
        </h1>

        {/* 서브 메시지 */}
        <p style={{
          marginTop: 20,
          fontSize: "0.875rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.4)",
          textAlign: "center",
        }}>
          {message}
        </p>

        {/* 바운스 도트 */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="ls-dot"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A96E" }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
