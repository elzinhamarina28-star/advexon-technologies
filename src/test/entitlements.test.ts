import { describe, expect, it } from 'vitest';
import { hasPaidAccess } from '@/features/client-app/entitlements';

const now = new Date('2026-10-08T00:00:00Z');
describe('paid access comes only from an active backend subscription', () => {
  it('denies when there is no subscription row', () => expect(hasPaidAccess(null, now)).toBe(false));
  it('denies inactive/pending status even with a plan', () => expect(hasPaidAccess({ plan_id: 'growth', status: 'pending', current_period_end: null }, now)).toBe(false));
  it('denies an expired period', () => expect(hasPaidAccess({ plan_id: 'pro', status: 'active', current_period_end: '2026-10-01T00:00:00Z' }, now)).toBe(false));
  it('grants active plan within period', () => expect(hasPaidAccess({ plan_id: 'start', status: 'active', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(true));
});
import { canUse, featurePlans } from '@/features/client-app/entitlements';
describe('ETHAN and FOLLOW-UP require active GROWTH or PRO', () => {
  const end = '2026-11-01T00:00:00Z';
  it('denies START', () => expect(canUse({ plan_id: 'start', status: 'active', current_period_end: end }, 'agent:ethan', now)).toBe(false));
  it('grants GROWTH', () => expect(canUse({ plan_id: 'growth', status: 'active', current_period_end: end }, 'agent:follow-up', now)).toBe(true));
  it('denies PRO when pending', () => expect(canUse({ plan_id: 'pro', status: 'pending', current_period_end: end }, 'agent:ethan', now)).toBe(false));
});
describe('implemented plan matrix and fail-closed access', () => {
  it.each(Object.keys(featurePlans) as (keyof typeof featurePlans)[])('requires GROWTH or PRO for %s', feature => {
    expect(canUse({ plan_id: 'start', status: 'active', current_period_end: null }, feature, now)).toBe(false);
    expect(canUse({ plan_id: 'growth', status: 'active', current_period_end: null }, feature, now)).toBe(true);
    expect(canUse({ plan_id: 'pro', status: 'active', current_period_end: null }, feature, now)).toBe(true);
  });
  it('does not let an internal marker alone grant paid access', () => {
    expect(canUse({ plan_id: 'pro', status: 'inactive', current_period_end: null, internal_test: true }, 'agent:athena', now)).toBe(false);
  });
  it('denies invalid or exactly expired periods', () => {
    expect(hasPaidAccess({ plan_id: 'growth', status: 'active', current_period_end: 'invalid' }, now)).toBe(false);
    expect(hasPaidAccess({ plan_id: 'growth', status: 'active', current_period_end: now.toISOString() }, now)).toBe(false);
  });
  it('denies unknown plans', () => expect(hasPaidAccess({ plan_id: 'other', status: 'active', current_period_end: null }, now)).toBe(false));
});
