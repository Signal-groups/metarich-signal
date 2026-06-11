/**
 * lib/coverageAnalysis/session.ts
 * 보장분석 PRO 세션 CRUD
 * Supabase coverage_pro_sessions 테이블 사용
 */

import { supabase } from '../supabase'
import type { ProSession, StepStatus } from './types'

// ── 새 세션 생성 ─────────────────────────────────────────────────────────
export async function createProSession(
  advisorId: string,
  customerId?: string
): Promise<ProSession | null> {
  const now = new Date().toISOString()
  const session: ProSession = {
    id: crypto.randomUUID(),
    advisorId,
    customerId,
    contracts: [],
    currentStep: 1,
    stepStatus: { 1: 'pending' },
    version: 1,
    createdAt: now,
    updatedAt: now,
  }

  const { data, error } = await supabase
    .from('coverage_pro_sessions')
    .insert({
      id: session.id,
      advisor_id: advisorId,
      customer_id: customerId ?? null,
      session_data: session,
      version: 1,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[session] 생성 실패:', error.message)
    return null
  }

  return { ...session, id: data.id }
}

// ── 세션 목록 조회 (내 세션만) ───────────────────────────────────────────
export async function listProSessions(
  advisorId: string,
  opts?: { customerId?: string; status?: string; limit?: number }
): Promise<ProSession[]> {
  let query = supabase
    .from('coverage_pro_sessions')
    .select('id, session_data, status, created_at, updated_at')
    .eq('advisor_id', advisorId)
    .order('updated_at', { ascending: false })
    .limit(opts?.limit ?? 50)

  if (opts?.customerId) query = query.eq('customer_id', opts.customerId)
  if (opts?.status)     query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) {
    console.error('[session] 목록 조회 실패:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    ...(row.session_data as ProSession),
    id: row.id,
  }))
}

// ── 세션 단건 조회 ───────────────────────────────────────────────────────
export async function getProSession(sessionId: string): Promise<ProSession | null> {
  const { data, error } = await supabase
    .from('coverage_pro_sessions')
    .select('id, session_data, status')
    .eq('id', sessionId)
    .single()

  if (error || !data) return null
  return { ...(data.session_data as ProSession), id: data.id }
}

// ── 세션 저장 (덮어쓰기) ────────────────────────────────────────────────
export async function saveProSession(session: ProSession): Promise<boolean> {
  const updated = { ...session, updatedAt: new Date().toISOString() }

  const { error } = await supabase
    .from('coverage_pro_sessions')
    .update({
      session_data: updated,
      version: updated.version,
      customer_id: updated.customerId ?? null,
    })
    .eq('id', session.id)

  if (error) {
    console.error('[session] 저장 실패:', error.message)
    return false
  }
  return true
}

// ── 세션 단계 업데이트 ──────────────────────────────────────────────────
export async function updateSessionStep(
  session: ProSession,
  step: ProSession['currentStep'],
  status: StepStatus
): Promise<ProSession> {
  const updated: ProSession = {
    ...session,
    currentStep: step,
    stepStatus: { ...session.stepStatus, [step]: status },
    updatedAt: new Date().toISOString(),
  }
  await saveProSession(updated)
  return updated
}

// ── 세션 완료 처리 ──────────────────────────────────────────────────────
export async function completeProSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('coverage_pro_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  return !error
}

// ── 세션 삭제 (아카이브) ────────────────────────────────────────────────
export async function archiveProSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('coverage_pro_sessions')
    .update({ status: 'archived' })
    .eq('id', sessionId)

  return !error
}
