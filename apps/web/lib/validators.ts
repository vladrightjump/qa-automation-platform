import type { AddressInput } from '@/lib/api';

export interface AddressErrors {
  name?: string;
  line1?: string;
  city?: string;
  postalCode?: string;
}

export function validateAddress(input: AddressInput): AddressErrors {
  const errs: AddressErrors = {};
  if (!input.name.trim()) errs.name = 'Name is required';
  if (!input.line1.trim()) errs.line1 = 'Address line 1 is required';
  if (!input.city.trim()) errs.city = 'City is required';
  if (input.postalCode.trim().length < 3) {
    errs.postalCode = 'Postal code must be at least 3 chars';
  }
  return errs;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password: string, minLength = 8): string | null {
  if (!password) return 'Password is required';
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  return null;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
