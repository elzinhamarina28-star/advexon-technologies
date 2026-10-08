import { describe, expect, it } from 'vitest';
import { hasPaidAccess } from '@/features/client-app/entitlements';

const now = new Date('2026-10-08T00:00:00Z');
describe('paid access comes only from an active backend subscription', () => {
  it('denies when there is no subscription row', () => expect(hasPaidAccess(null, now)).toBe(false));
  it('denies inactive/pending status even with a plan', () => expect(hasPaidAccess({ plan_id: 'growth', status: 'pending', current_period_end: null }, now)).toBe(false));
  it('denies an expired period', () => expect(hasPaidAccess({ plan_id: 'pro', status: 'active', current_period_end: '2026-10-01T00:00:00Z' }, now)).toBe(false));
  it('grants active plan within period', () => expect(hasPaidAccess({ plan_id: 'start', status: 'active', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(true));
});
