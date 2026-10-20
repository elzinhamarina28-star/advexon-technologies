// Paid access is decided ONLY from backend effective subscription data, which is written exclusively by the
// server (future verified Kiwify webhook: checkout → webhook → validate → identify user → activate plan).
// Clicking a checkout button never grants access by itself.
export type EffectiveSubscription = { plan_id: string | null; status: string; current_period_end: string | null; internal_test?: boolean };
export type SubscriptionRow = EffectiveSubscription | null | undefined;

export function parseSubscription(value: unknown): EffectiveSubscription {
  if (!value || typeof value !== 'object' || !('plan_id' in value) || !('status' in value) || !('current_period_end' in value)
    || (value.plan_id !== null && typeof value.plan_id !== 'string') || typeof value.status !== 'string'
    || (value.current_period_end !== null && typeof value.current_period_end !== 'string')) throw new Error('Assinatura inválida.');
  return { plan_id: value.plan_id, status: value.status, current_period_end: value.current_period_end, internal_test: 'internal_test' in value && value.internal_test === true };
}

export const statusLabel: Record<string, string> = {
  inactive: 'Sem assinatura', pending: 'Pagamento pendente', active: 'Ativa', past_due: 'Pagamento em atraso',
  canceled: 'Cancelada', expired: 'Expirada', refunded: 'Reembolsada',
};

export function hasPaidAccess(sub: SubscriptionRow, now = new Date()) {
  if (!sub || !sub.plan_id) return false;
  // Canceled keeps access only until the already-paid period end (never open-ended).
  const live = sub.status === 'active' || (sub.status === 'canceled' && !!sub.current_period_end);
  if (!live || !sub.plan_id || !['start', 'growth', 'pro'].includes(sub.plan_id)) return false;
  if (sub.current_period_end && !(new Date(sub.current_period_end).getTime() > now.getTime())) return false;
  return true;
}

/** Paid features and the plans that include them (mirrors plan features in pricing config). */
export const featurePlans = {
  'agent:athena': ['start', 'growth', 'pro'],
  'agent:ethan': ['growth', 'pro'],
  'agent:follow-up': ['growth', 'pro'],
  pipeline: ['growth', 'pro'],
  organization: ['growth', 'pro'],
  'dashboard:operational': ['growth', 'pro'],
  // Integration entitlements are intentionally not enforced until connectors are verified end-to-end.

} as const satisfies Record<string, readonly string[]>;
export type PaidFeature = keyof typeof featurePlans;

export function canUse(sub: SubscriptionRow, feature: PaidFeature, now = new Date()) {
  if (!sub?.plan_id || !hasPaidAccess(sub, now)) return false;
  return (featurePlans[feature] as readonly string[]).includes(sub.plan_id);
}
