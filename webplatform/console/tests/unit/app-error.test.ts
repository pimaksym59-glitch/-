import { describe, expect, it } from 'vitest';
import { AppError, isAppError, kindFromStatus, recoveryFor } from '@/shared/lib/errors';

describe('kindFromStatus', () => {
  it('maps HTTP statuses to error kinds', () => {
    expect(kindFromStatus(400)).toBe('validation');
    expect(kindFromStatus(401)).toBe('permission');
    expect(kindFromStatus(403)).toBe('permission');
    expect(kindFromStatus(404)).toBe('notFound');
    expect(kindFromStatus(409)).toBe('conflict');
    expect(kindFromStatus(429)).toBe('rateLimit');
    expect(kindFromStatus(500)).toBe('server');
    expect(kindFromStatus(418)).toBe('unknown');
  });
});

describe('AppError', () => {
  it('defaults retryable from kind', () => {
    expect(new AppError({ kind: 'network', message: 'x' }).retryable).toBe(true);
    expect(new AppError({ kind: 'server', message: 'x' }).retryable).toBe(true);
    expect(new AppError({ kind: 'validation', message: 'x' }).retryable).toBe(false);
  });

  it('respects an explicit retryable override', () => {
    expect(new AppError({ kind: 'validation', message: 'x', retryable: true }).retryable).toBe(
      true,
    );
  });

  it('is detectable via isAppError', () => {
    expect(isAppError(new AppError({ kind: 'unknown', message: 'x' }))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
  });
});

describe('recoveryFor', () => {
  it('maps every kind to a recovery affordance', () => {
    expect(recoveryFor(new AppError({ kind: 'permission', message: 'x' })).action).toBe('signin');
    expect(recoveryFor(new AppError({ kind: 'gated', message: 'x' })).action).toBe('learn');
  });
});
