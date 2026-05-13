import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows requests within limit', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    const result1 = await checkRateLimit('signup', 'test-user-1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2); // 3 max - 1 used

    const result2 = await checkRateLimit('signup', 'test-user-1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('blocks requests over limit', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    await checkRateLimit('signup', 'test-user-2');
    await checkRateLimit('signup', 'test-user-2');
    await checkRateLimit('signup', 'test-user-2');

    const blocked = await checkRateLimit('signup', 'test-user-2');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different identifiers separately', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    await checkRateLimit('signup', 'user-a');
    await checkRateLimit('signup', 'user-a');
    await checkRateLimit('signup', 'user-a');

    const resultB = await checkRateLimit('signup', 'user-b');
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(2);
  });
});
