'use client';

/**
 * StreamingProvider (Stage 3 §7 #7 — INNERMOST). A shared registry of active
 * streams with a global Stop-all, and the correlation-id source (Stage 2 §11).
 * Streaming state is transient/append-only and reconciled into Query on done
 * (Stage 2 §4). FS1 provides the registry + abort plumbing; per-surface stream
 * hooks (useAssistantStream, useLogTail, …) land with their features.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { generateCorrelationId } from '@/shared/lib/api';

interface StreamHandle {
  readonly id: string;
  readonly controller: AbortController;
}

interface StreamingContextValue {
  readonly activeCount: number;
  /** Register a new stream; returns its AbortController and an unregister fn. */
  readonly register: () => { id: string; controller: AbortController; release: () => void };
  readonly stopAll: () => void;
  readonly newCorrelationId: () => string;
}

const StreamingContext = createContext<StreamingContextValue | null>(null);

export function StreamingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const streamsRef = useRef<Map<string, StreamHandle>>(new Map());
  const [activeCount, setActiveCount] = useState(0);

  const sync = useCallback(() => setActiveCount(streamsRef.current.size), []);

  const register = useCallback(() => {
    const id = generateCorrelationId();
    const controller = new AbortController();
    streamsRef.current.set(id, { id, controller });
    sync();
    const release = (): void => {
      streamsRef.current.delete(id);
      sync();
    };
    return { id, controller, release };
  }, [sync]);

  const stopAll = useCallback(() => {
    for (const { controller } of streamsRef.current.values()) controller.abort();
    streamsRef.current.clear();
    sync();
  }, [sync]);

  const value = useMemo<StreamingContextValue>(
    () => ({ activeCount, register, stopAll, newCorrelationId: generateCorrelationId }),
    [activeCount, register, stopAll],
  );

  return <StreamingContext.Provider value={value}>{children}</StreamingContext.Provider>;
}

export function useStreaming(): StreamingContextValue {
  const ctx = useContext(StreamingContext);
  if (!ctx) throw new Error('useStreaming must be used within <StreamingProvider>.');
  return ctx;
}
