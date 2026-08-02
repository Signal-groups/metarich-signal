import { supabase } from "@/lib/supabase"

/**
 * 페이지 방문을 /api/track 서버 엔드포인트를 통해 기록합니다.
 * 서버 측에서 service role key를 사용하므로 RLS 영향 없이 안정적으로 저장됩니다.
 *
 * @param userId - 현재 로그인된 사용자의 UUID (하위 호환용, 실제 검증은 access_token으로 진행)
 * @param pathname - 방문한 경로 (예: "/dashboard", "/crm/customers")
 */
export async function trackPageView(userId: string, pathname: string) {
  if (!userId || !pathname) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pathname }),
    })
  } catch (e) {
    // 트래킹 실패는 UX에 영향 없이 조용히 처리
    console.warn("[trackPageView] failed:", e)
  }
}
