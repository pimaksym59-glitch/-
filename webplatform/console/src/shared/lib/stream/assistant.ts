'use client';

/**
 * useAssistantStream (FS6 T-FS6.2 — Stage 3 §6). One assistant run over the
 * BFF AI relay, keyed by surface (`chat:<id>`, `summary:<channelId>`), with
 * the transient token state in a module-level Zustand store (the frozen
 * Streaming state owner — never Query, never component state). Stop aborts
 * the underlying request via the StreamingProvider registry and PRESERVES the
 * partial output; errors preserve it too. The caller reconciles the finished
 * result into its own store on `done` (Stage 2 §4).
 */
import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { endpoints } from '@/shared/lib/api';
import { AppError } from '@/shared/lib/errors';
import { useAnnouncer, useStreaming } from '@/shared/providers';
import type { StudioDryRunResponseWireDTO } from '@/shared/types';
import { STREAM_DONE, openStream } from './openStream';

export type AssistantStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'stopped' | 'error';

export interface AssistantResult {
  readonly output: string;
  readonly model: string;
  readonly costUsd: number;
}

export interface AssistantStreamSlice {
  readonly status: AssistantStatus;
  readonly text: string;
  readonly result: AssistantResult | null;
  readonly error: AppError | null;
}

export interface AssistantRunOutcome {
  readonly status: 'done' | 'stopped' | 'error';
  /** The wire result on `done`; null when stopped/errored before it arrived. */
  readonly result: AssistantResult | null;
  /** Whatever text had streamed in — preserved on stop/error (never lost). */
  readonly partialText: string;
  readonly error: AppError | null;
}

const IDLE: AssistantStreamSlice = { status: 'idle', text: '', result: null, error: null };

interface AssistantStoreState {
  readonly slices: Readonly<Record<string, AssistantStreamSlice>>;
  readonly stops: Readonly<Record<string, () => void>>;
  patch: (key: string, patch: Partial<AssistantStreamSlice>) => void;
  setStop: (key: string, stop: (() => void) | null) => void;
  clear: (key: string) => void;
}

/** Transient module-level store (FE-ADR-5: streaming is its own owner). */
export const useAssistantStore = create<AssistantStoreState>((set) => ({
  slices: {},
  stops: {},
  patch: (key, patch) =>
    set((prev) => ({
      slices: { ...prev.slices, [key]: { ...(prev.slices[key] ?? IDLE), ...patch } },
    })),
  setStop: (key, stop) =>
    set((prev) => ({
      stops: stop
        ? { ...prev.stops, [key]: stop }
        : Object.fromEntries(Object.entries(prev.stops).filter(([k]) => k !== key)),
    })),
  clear: (key) =>
    set((prev) => ({
      slices: Object.fromEntries(Object.entries(prev.slices).filter(([k]) => k !== key)),
    })),
}));

function mapResult(wire: StudioDryRunResponseWireDTO): AssistantResult {
  return { output: wire.output, model: wire.model, costUsd: wire.cost_usd };
}

/** Read one surface's transient slice (null key = idle). */
export function useAssistantSlice(key: string | null): AssistantStreamSlice {
  return useAssistantStore((s) => (key ? (s.slices[key] ?? IDLE) : IDLE));
}

export interface AssistantRunnerApi {
  readonly start: (
    key: string,
    request: { prompt: string; model: string },
  ) => Promise<AssistantRunOutcome>;
  readonly stop: (key: string) => void;
  readonly reset: (key: string) => void;
}

/** Imperative runner — `key` is chosen per call (a first chat turn creates its
 * conversation and streams under the new id in the same call). */
export function useAssistantRunner(): AssistantRunnerApi {
  const patch = useAssistantStore((s) => s.patch);
  const setStop = useAssistantStore((s) => s.setStop);
  const clear = useAssistantStore((s) => s.clear);
  const { register } = useStreaming();
  const announce = useAnnouncer();

  const start = useCallback(
    async (
      key: string,
      request: { prompt: string; model: string },
    ): Promise<AssistantRunOutcome> => {
      const { controller, release } = register();
      setStop(key, () => controller.abort());
      patch(key, { status: 'thinking', text: '', result: null, error: null });
      announce('Assistant is thinking.', 'polite');

      let text = '';
      let result: AssistantResult | null = null;
      try {
        const events = openStream(endpoints.aiStream(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        for await (const event of events) {
          if (event.event === 'chunk') {
            text += event.data;
            patch(key, { status: 'streaming', text });
          } else if (event.event === 'result') {
            result = mapResult(JSON.parse(event.data) as StudioDryRunResponseWireDTO);
          } else if (event.data === STREAM_DONE) {
            break;
          }
        }
        // The `result` frame is the wire truth; streamed chunks are its delivery.
        const output = result?.output ?? text;
        patch(key, { status: 'done', text: output, result, error: null });
        announce('Assistant response complete.', 'polite');
        return { status: 'done', result, partialText: output, error: null };
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          patch(key, { status: 'stopped' });
          announce('Generation stopped.', 'polite');
          return { status: 'stopped', result: null, partialText: text, error: null };
        }
        const error =
          cause instanceof AppError
            ? cause
            : new AppError({ kind: 'unknown', message: 'Generation failed.', details: cause });
        patch(key, { status: 'error', error });
        announce('Generation failed.', 'assertive');
        return { status: 'error', result: null, partialText: text, error };
      } finally {
        setStop(key, null);
        release();
      }
    },
    [register, patch, setStop, announce],
  );

  const stop = useCallback((key: string) => {
    useAssistantStore.getState().stops[key]?.();
  }, []);

  const reset = useCallback((key: string) => clear(key), [clear]);

  return useMemo(() => ({ start, stop, reset }), [start, stop, reset]);
}

export interface UseAssistantStreamApi {
  readonly slice: AssistantStreamSlice;
  readonly isActive: boolean;
  readonly start: (request: { prompt: string; model: string }) => Promise<AssistantRunOutcome>;
  readonly stop: () => void;
  readonly reset: () => void;
}

/** Fixed-key convenience (e.g. the dashboard summary card). */
export function useAssistantStream(key: string): UseAssistantStreamApi {
  const slice = useAssistantSlice(key);
  const runner = useAssistantRunner();
  return {
    slice,
    isActive: slice.status === 'thinking' || slice.status === 'streaming',
    start: useCallback(
      (request: { prompt: string; model: string }) => runner.start(key, request),
      [runner, key],
    ),
    stop: useCallback(() => runner.stop(key), [runner, key]),
    reset: useCallback(() => runner.reset(key), [runner, key]),
  };
}
