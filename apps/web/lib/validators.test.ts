import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  validateAddress,
  validateEmail,
  validatePassword,
} from './validators';
import type { AddressInput } from '@/lib/api';

const baseAddress: AddressInput = {
  label: 'Home',
  name: 'Alex Stone',
  line1: '1 Long Lane',
  line2: '',
  city: 'Brighton',
  postalCode: 'BN1 1AA',
  country: 'GB',
};

describe('validateAddress', () => {
  it('returns no errors for a valid address', () => {
    expect(validateAddress(baseAddress)).toEqual({});
  });

  it.each([
    ['name', { ...baseAddress, name: '   ' }, 'Name is required'],
    ['line1', { ...baseAddress, line1: '' }, 'Address line 1 is required'],
    ['city', { ...baseAddress, city: ' ' }, 'City is required'],
    [
      'postalCode',
      { ...baseAddress, postalCode: 'X' },
      'Postal code must be at least 3 chars',
    ],
  ] as const)('flags %s when invalid', (field, input, message) => {
    const errs = validateAddress(input);
    expect(errs[field]).toBe(message);
  });
});

describe('validateEmail', () => {
  it.each([
    ['user@example.com', null],
    ['', 'Email is required'],
    [' ', 'Email is required'],
    ['no-at', 'Enter a valid email address'],
    ['a@b', 'Enter a valid email address'],
  ])('"%s" → %s', (input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });
});

describe('validatePassword', () => {
  it('requires non-empty', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('enforces minLength (default 8)', () => {
    expect(validatePassword('short')).toBe(
      'Password must be at least 8 characters',
    );
    expect(validatePassword('longenough')).toBeNull();
  });

  it('honours custom minLength', () => {
    expect(validatePassword('hi', 4)).toBe(
      'Password must be at least 4 characters',
    );
  });
});

describe('hasErrors', () => {
  it('returns false for an all-undefined object', () => {
    expect(hasErrors({ a: undefined, b: undefined })).toBe(false);
  });

  it('returns true when any value is set', () => {
    expect(hasErrors({ a: undefined, b: 'oops' })).toBe(true);
  });
});
