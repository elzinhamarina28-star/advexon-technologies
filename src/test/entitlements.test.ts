import { describe, expect, it } from 'vitest';
import { canUse, featurePlans, hasPaidAccess, parseSubscription } from '@/features/client-app/entitlements';

const now = new Date('2026-10-08T00:00:00Z');
const validEnd = '2026-11-01T00:00:00Z';
const subscription = (plan_id: string, status = 'active', current_period_end: string | null = validEnd) => ({ plan_id, status, current_period_end });

describe('paid access requires a known plan, allowed status, and valid future period', () => {
  it('denies when there is no subscription row', () => expect(hasPaidAccess(null, now)).toBe(false));
  it.each(['inactive', 'pending', 'past_due', 'expired', 'refunded', 'unknown'])('denies status %s even with a future period', status => {
    expect(hasPaidAccess(subscription('growth', status), now)).toBe(false);
  });
  it('grants an active subscription with a future end date', () => expect(hasPaidAccess(subscription('start'), now)).toBe(true));
  it('grants a canceled subscription only until its paid period ends', () => expect(hasPaidAccess(subscription('growth', 'canceled'), now)).toBe(true));
  it('denies a canceled subscription after the period end', () => expect(hasPaidAccess(subscription('growth', 'canceled', '2026-10-01T00:00:00Z'), now)).toBe(false));
  it('denies a canceled subscription without a period end', () => expect(hasPaidAccess(subscription('growth', 'canceled', null), now)).toBe(false));
  it('denies an active subscription without a period end (fail closed)', () => expect(hasPaidAccess(subscription('pro', 'active', null), now)).toBe(false));
  it('denies an invalid, absent, or exactly expired period', () => {
    expect(hasPaidAccess(subscription('growth', 'active', 'not-a-date'), now)).toBe(false);
    expect(hasPaidAccess(subscription('growth', 'active', now.toISOString()), now)).toBe(false);
  });
  it('denies unknown plan IDs', () => expect(hasPaidAccess(subscription('other'), now)).toBe(false));
  it('rejects malformed effective-subscription payloads', () => expect(() => parseSubscription({ plan_id: 'pro', status: 'active' })).toThrow('Assinatura inválida.'));
});

describe('internal test access is explicit and cannot be inferred from a missing period', () => {
  it('allows an active backend-designated internal test account without a period end', () => {
    expect(hasPaidAccess({ plan_id: 'pro', status: 'active', current_period_end: null, internal_test: true }, now)).toBe(true);
  });
  it('does not allow an internal test marker to override inactive status', () => {
    expect(hasPaidAccess({ plan_id: 'pro', status: 'inactive', current_period_end: null, internal_test: true }, now)).toBe(false);
  });
  it('does not allow a missing or false internal marker to bypass the period requirement', () => {
    expect(hasPaidAccess({ plan_id: 'growth', status: 'active', current_period_end: null, internal_test: false }, now)).toBe(false);
    expect(hasPaidAccess({ plan_id: 'growth', status: 'active', current_period_end: null }, now)).toBe(false);
  });
});

describe('server authorization matrix for the three agents', () => {
  it.each(['start', 'growth', 'pro'])('allows ATHENA for an active %s plan', plan => {
    expect(canUse(subscription(plan), 'agent:athena', now)).toBe(true);
  });
  it.each(['growth', 'pro'])('allows ETHAN and FOLLOW-UP for an active %s plan', plan => {
    expect(canUse(subscription(plan), 'agent:ethan', now)).toBe(true);
    expect(canUse(subscription(plan), 'agent:follow-up', now)).toBe(true);
  });
  it('denies ETHAN and FOLLOW-UP on START', () => {
    expect(canUse(subscription('start'), 'agent:ethan', now)).toBe(false);
    expect(canUse(subscription('start'), 'agent:follow-up', now)).toBe(false);
  });
  it('denies every paid feature when the subscription period is missing', () => {
    for (const feature of Object.keys(featurePlans) as (keyof typeof featurePlans)[]) {
      expect(canUse(subscription('pro', 'active', null), feature, now)).toBe(false);
    }
  });
  it('requires GROWTH or PRO for operational features', () => {
    for (const feature of ['pipeline', 'organization', 'dashboard:operational'] as const) {
      expect(canUse(subscription('start'), feature, now)).toBe(false);
      expect(canUse(subscription('growth'), feature, now)).toBe(true);
      expect(canUse(subscription('pro'), feature, now)).toBe(true);
    }
  });
  it('does not grant access after cancellation grace period or after refund', () => {
    expect(canUse(subscription('growth', 'canceled', '2026-10-01T00:00:00Z'), 'agent:ethan', now)).toBe(false);
    expect(canUse(subscription('pro', 'refunded'), 'agent:athena', now)).toBe(false);
  });
});
