import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ─── 날짜 유틸 ──────────────────────────────────────────── */
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
/** 올해(또는 내년) 기준으로 날짜 반환 */
function thisOrNextYear(dateStr: string, today: Date): Date {
  const d = new Date(dateStr)
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)
  return thisYear
}

/* ─── 알림 행 생성 ──────────────────────────────────────── */
function buildRows(c: any, today: Date): any[] {
  const rows: any[] = []
  const base = { customer_id: c.id, customer_name: c.name, is_done: false, is_read: false }

  // 생일
  if (c.birth_date) {
    const target = thisOrNextYear(c.birth_date, today)
    rows.push({ ...base, type: 'birthday', title: `🎂 생일 (${c.name})`, message: `${c.name} 고객님 생일입니다.`, due_date: toIso(target) })
  }

  // 계약 follow-up (join_date 기준 30/90/180/365일)
  if (c.join_date) {
    const joinDate = new Date(c.join_date)
    for (const days of [30, 90, 180, 365]) {
      const alertDate = addDays(joinDate, days)
      if (alertDate > today) {
        const labels: Record<number, string> = { 30: '30일', 90: '90일', 180: '6개월', 365: '1년' }
        rows.push({ ...base, type: `join_${days}`, title: `📞 계약 ${labels[days]} 점검 (${c.name})`, message: `${c.name} 고객님 계약 후 ${labels[days]} — 안착 관리 연락`, due_date: toIso(alertDate) })
      }
    }
  }

  // 자동차보험 갱신 (D-60, D-30) — 매년 반복
  if (c.car_insurance_renewal_date) {
    const target = thisOrNextYear(c.car_insurance_renewal_date, today)
    rows.push({ ...base, type: 'car_renewal_d60', title: `🚗 자동차보험 D-60 (${c.name})`, message: `${c.name} 고객님 자동차보험 갱신일 60일 전입니다.`, due_date: toIso(addDays(target, -60)) })
    rows.push({ ...base, type: 'car_renewal_d30', title: `🚗 자동차보험 D-30 (${c.name})`, message: `${c.name} 고객님 자동차보험 갱신일 30일 전입니다.`, due_date: toIso(addDays(target, -30)) })
  }

  // 실손보험 갱신 (D-30) — 매년 반복
  if (c.indemnity_renewal_date) {
    const target = thisOrNextYear(c.indemnity_renewal_date, today)
    rows.push({ ...base, type: 'indemnity_renewal', title: `🔄 실손 재가입 D-30 (${c.name})`, message: `${c.name} 고객님 실손보험 갱신일 30일 전입니다. 세대 전환 여부를 확인하세요.`, due_date: toIso(addDays(target, -30)) })
  }

  return rows
}

/* ─── POST /api/crm/generate-notifications ──────────────── */
export async function POST(req: NextRequest) {
  // 클라이언트에서 Authorization 헤더로 토큰 전달
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date()

  // 전체 고객 조회
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id,name,birth_date,join_date,car_insurance_renewal_date,indemnity_renewal_date')
    .eq('advisor_id', user.id)
    .is('deleted_at', null)

  if (custErr || !customers) {
    return NextResponse.json({ error: custErr?.message || 'no customers' }, { status: 500 })
  }

  // 기존 미완료 알림 key 집합 (중복 방지)
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('customer_id,type,due_date')
    .in('customer_id', customers.map((c) => c.id))
    .eq('is_done', false)

  const existingKeys = new Set(
    (existingNotifs || []).map((n: any) => `${n.customer_id}|${n.type}|${n.due_date}`)
  )

  // 새 알림 행 구성
  const toInsert: any[] = []
  for (const c of customers) {
    const rows = buildRows(c as any, today)
    for (const row of rows) {
      const key = `${row.customer_id}|${row.type}|${row.due_date}`
      if (!existingKeys.has(key)) toInsert.push(row)
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ created: 0, message: '새로 생성할 알림이 없습니다.' })
  }

  const { error: insertErr } = await supabase.from('notifications').upsert(toInsert, {
    onConflict: 'customer_id,type,due_date',
    ignoreDuplicates: true,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ created: toInsert.length, message: `알림 ${toInsert.length}건 생성 완료` })
}
