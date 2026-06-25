import type { User } from '@supabase/supabase-js'

type SupabaseClientLike = {
  from: (table: string) => any
}

type ProfileInput = {
  email?: string
  name?: string
  phone?: string
  accountType?: 'signal' | 'external'
  headquarter?: string
  department?: string
  branch?: string
  companyName?: string
  position?: string
}

export async function ensureUserProfile(supabase: SupabaseClientLike, user: User, input: ProfileInput = {}) {
  const email = (input.email || user.email || '').trim()
  if (!user.id || !email) return null

  const { data: byId } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (byId) return byId

  const { data: byEmail } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  const metadata = (user.user_metadata || {}) as Record<string, any>
  const isExternal = input.accountType === 'external' || metadata.accountType === 'external'
  const profile = {
    id: user.id,
    email,
    name: input.name || metadata.name || byEmail?.name || email.split('@')[0],
    phone: (input.phone || metadata.phone || byEmail?.phone || '').trim(),
    role: byEmail?.role || (isExternal ? 'guest' : 'agent'),
    role_level: byEmail?.role_level || (isExternal ? 'guest' : 'staff'),
    rank: byEmail?.rank || (isExternal ? 'guest' : 'agent'),
    headquarter: isExternal ? '대외' : input.headquarter || metadata.headquarter || byEmail?.headquarter || '',
    headquarter_name: isExternal ? '대외' : input.headquarter || metadata.headquarter || byEmail?.headquarter_name || '',
    department: isExternal ? input.companyName || metadata.companyName || byEmail?.department || '' : input.department || metadata.department || byEmail?.department || '',
    department_name: isExternal ? input.companyName || metadata.companyName || byEmail?.department_name || '' : input.department || metadata.department || byEmail?.department_name || '',
    team: isExternal ? input.position || metadata.position || byEmail?.team || '' : input.branch || metadata.branch || byEmail?.team || '',
    branch_name: isExternal ? input.position || metadata.position || byEmail?.branch_name || '' : input.branch || metadata.branch || byEmail?.branch_name || '',
    is_approved: byEmail?.is_approved ?? false,
    service_level: byEmail?.service_level ?? 'guest',
    premium_expires_at: byEmail?.premium_expires_at ?? null,
    // ─── 권한 기본값 ────────────────────────────────────────────────────
    // 메타리치(signal): 승인 후 사무실 업무 자동 허용 (office_access 기본 true)
    // 타사(external/guest): 모든 기능 false — 메인홈만 이용 가능
    // CRM·브랜딩·청구: 소속 관계없이 마스터가 개별 부여
    crm_access: byEmail?.crm_access ?? false,
    office_access: byEmail?.office_access ?? false,
    claim_access: byEmail?.claim_access ?? false,
    branding_access: byEmail?.branding_access ?? false,
  }

  if (byEmail?.id) {
    const { data, error } = await supabase
      .from('users')
      .update(profile)
      .eq('email', email)
      .select('*')
      .maybeSingle()

    if (!error) return data
  }

  const { data, error } = await supabase
    .from('users')
    .insert([profile])
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}
