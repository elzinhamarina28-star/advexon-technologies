import { describe, expect, it } from 'vitest';
import { authErrorKind, authErrorMessage, validateAuthFields } from '@/features/client-app/auth-messages';

describe('Authentication error normalization', () => {
  it.each([
    ['weak_password', 'weak-password'], ['invalid_credentials', 'credentials'],
    ['email_address_invalid', 'invalid-email'], ['email_exists', 'existing-account'],
    ['email_not_confirmed', 'confirmation'], ['otp_expired', 'expired-link'],
    ['session_not_found', 'session'], ['same_password', 'same-password'],
    ['over_email_send_rate_limit', 'rate-limit'],
  ])('classifies %s without exposing provider details', (code, kind) => {
    expect(authErrorKind({ code, message: 'private provider details' })).toBe(kind);
    expect(authErrorMessage({ code, message: 'private provider details' })).not.toContain('private provider details');
  });
  it('never forwards unknown provider errors', () => {
    expect(authErrorKind(new Error('unexpected private error'))).toBe('unknown');
    expect(authErrorMessage(new Error('unexpected private error'))).not.toContain('unexpected private error');
  });
  it('normalizes older password-length errors', () => {
    expect(authErrorKind(new Error('Password should be at least 8 characters'))).toBe('short-password');
  });
  it('does not distinguish existing-account responses by provider code', () => {
    expect(authErrorMessage({ code: 'email_exists' })).toBe(authErrorMessage({ code: 'user_already_exists' }));
  });
});

describe('Authentication validation', () => {
  it('requires at least six characters for a new password', () => {
    expect(validateAuthFields({ password: '12345' })?.field).toBe('password');
    expect(validateAuthFields({ password: '123456' })).toBeNull();
  });
  it('rejects mismatched confirmation', () => {
    expect(validateAuthFields({ password: 'abcdef', confirm: 'abcdeg' })?.field).toBe('confirm');
    expect(validateAuthFields({ password: 'abcdef', confirm: 'abcdef' })).toBeNull();
  });
  it('rejects invalid email before making a request', () => {
    expect(validateAuthFields({ email: 'not-an-email' })?.field).toBe('email');
    expect(validateAuthFields({ email: 'person@example.com' })).toBeNull();
  });
});
import { validateAuthFields as vaf } from '@/features/client-app/auth-messages';
describe('password confirmation', () => {
  it('rejects mismatched confirmation', () => expect(vaf({ password: 'abcdef1', confirm: 'abcdef2' })?.field).toBe('confirm'));
  it('accepts matching confirmation', () => expect(vaf({ password: 'abcdef1', confirm: 'abcdef1' })).toBeNull());
});
