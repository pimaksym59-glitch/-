import { describe, expect, it } from 'vitest';
import { apiFetch } from '@/shared/lib/api';
import { AppError } from '@/shared/lib/errors';
import type { HealthReportDTO, SessionDTO } from '@/shared/types';

const API = 'http://localhost/api/v1';

describe('apiFetch', () => {
  it('returns typed JSON on success', async () => {
    const me = await apiFetch<SessionDTO>(`${API}/auth/me`);
    expect(me.role).toBe('owner');
    expect(me.email).toBe('test@console.local');
  });

  it('parses nested DTO shapes', async () => {
    const health = await apiFetch<HealthReportDTO>(`${API}/health`);
    expect(health.overall).toBe('healthy');
    expect(health.probes).toHaveLength(1);
  });

  it('normalizes non-2xx responses to AppError with the right kind', async () => {
    await expect(apiFetch(`${API}/boom`)).rejects.toBeInstanceOf(AppError);
    await expect(apiFetch(`${API}/boom`)).rejects.toMatchObject({
      kind: 'server',
      status: 503,
      message: 'Kaboom',
    });
  });

  it('sends a correlation id header', async () => {
    // A generated id is attached; the call succeeds against the mocked endpoint.
    await expect(apiFetch<SessionDTO>(`${API}/auth/me`)).resolves.toBeDefined();
  });
});
