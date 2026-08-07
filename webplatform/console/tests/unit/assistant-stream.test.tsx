/**
 * useAssistantStream (FS6 T-FS6.2): thinking→streaming→done over the MSW SSE
 * relay fixture, error preserves state honestly, transient slices stay OUT of
 * Query (they live in the assistant store and reset cleanly).
 */
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { fixtureOutputFor, FIXTURE_AI_COST_USD } from '@/shared/lib/ai-gateway/fixture';
import { useAssistantStream, type AssistantRunOutcome } from '@/shared/lib/stream';
import { AccessibilityProvider, StreamingProvider } from '@/shared/providers';
import { server } from '../msw/server';

function wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <AccessibilityProvider>
      <StreamingProvider>{children}</StreamingProvider>
    </AccessibilityProvider>
  );
}

describe('useAssistantStream (FS6 T-FS6.2)', () => {
  it('streams to done: text = wire output, cost/model from the result frame', async () => {
    const { result } = renderHook(() => useAssistantStream('test:done'), { wrapper });
    let outcome: AssistantRunOutcome | null = null;
    await act(async () => {
      outcome = await result.current.start({ prompt: 'Hi there', model: 'claude-opus-4-8' });
    });

    const expected = fixtureOutputFor('Hi there');
    expect(outcome).toMatchObject({
      status: 'done',
      result: { output: expected, model: 'claude-opus-4-8', costUsd: FIXTURE_AI_COST_USD },
    });
    expect(result.current.slice.status).toBe('done');
    expect(result.current.slice.text).toBe(expected);

    await act(async () => result.current.reset());
    expect(result.current.slice.status).toBe('idle');
  });

  it('an upstream error surfaces as AppError (429 → rateLimit) and preserves state honestly', async () => {
    server.use(
      http.post('/api/ai/stream', () =>
        HttpResponse.json({ message: 'slow down' }, { status: 429 }),
      ),
    );
    const { result } = renderHook(() => useAssistantStream('test:error'), { wrapper });
    let outcome: AssistantRunOutcome | null = null;
    await act(async () => {
      outcome = await result.current.start({ prompt: 'Hi', model: 'claude-opus-4-8' });
    });

    expect(outcome).toMatchObject({ status: 'error', partialText: '' });
    expect(result.current.slice.status).toBe('error');
    expect(result.current.slice.error?.kind).toBe('rateLimit');
  });
});
