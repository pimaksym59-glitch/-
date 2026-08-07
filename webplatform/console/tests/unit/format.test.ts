import { describe, expect, it } from 'vitest';
import { formatBytes, formatCost, formatNumber, formatRelativeTime } from '@/shared/lib/format';

describe('format', () => {
  it('formats numbers with grouping', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats currency', () => {
    expect(formatCost(12.5)).toBe('$12.50');
  });

  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB');
  });

  it('formats relative time deterministically', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    const twoHoursAgo = new Date('2026-07-27T10:00:00Z');
    expect(formatRelativeTime(twoHoursAgo, now)).toBe('2 hours ago');
  });
});
