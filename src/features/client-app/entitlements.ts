// Paid access is decided ONLY from the backend `subscriptions` row, which is written exclusively by the
// server (future verified Kiwify webhook: checkout → webhook → validate → identify user → activate plan).
// Clicking a checkout button never grants access by itself.
export type SubscriptionRow = { plan_id: string | null; status: string; current_period_end: string | null } | null | undefined;

export const statusLabel: Record<string, string> = {
  inactive: 'Sem assinatura', pending: 'Pagamento pendente', active: 'Ativa', past_due: 'Pagamento em atraso',
  canceled: 'Cancelada', expired: 'Expirada', refunded: 'Reembolsada',
};

export function hasPaidAccess(sub: SubscriptionRow, now = new Date()) {
  if (!sub || sub.status !== 'active' || !sub.plan_id) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < now) return false;
  return true;
}

/** Paid features and the plans that include them (mirrors plan features in pricing config). */
export const featurePlans = {
  'agent:ethan': ['growth', 'pro'],
  'agent:follow-up': ['growth', 'pro'],
} as const satisfies Record<string, readonly string[]>;
export type PaidFeature = keyof typeof featurePlans;

export function canUse(sub: SubscriptionRow, feature: PaidFeature, now = new Date()) {
  return hasPaidAccess(sub, now) && (featurePlans[feature] as readonly string[]).includes(sub!.plan_id!);
}
