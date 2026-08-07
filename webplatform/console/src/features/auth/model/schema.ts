/**
 * Login schema (FS4 — feature-owned Zod, Stage 3 §3). Mirrors the contract
 * request `{email, password, otp?}` exactly; no extra fields are invented.
 */
import { z } from 'zod';
import type { LoginRequestDTO } from '@/shared/types';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  otp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type LoginValues = z.infer<typeof loginSchema>;

export function toLoginRequest(values: LoginValues): LoginRequestDTO {
  return {
    email: values.email,
    password: values.password,
    ...(values.otp !== undefined ? { otp: values.otp } : {}),
  };
}

/**
 * Same-origin `next=` validation — an absolute or protocol-relative target is
 * an open redirect and is replaced by the default destination.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
