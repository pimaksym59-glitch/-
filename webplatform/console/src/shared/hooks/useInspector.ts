'use client';

/**
 * useInspector (Stage 3 §6 UI hooks / D4 Universal Inspector).
 * The inspector target lives in the **URL** (`?inspect=type:id`, FE-ADR-5), so
 * a view is shareable and restorable, and opening it never navigates away.
 */
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';
import {
  INSPECT_PARAM,
  formatInspect,
  parseInspect,
  type InspectTarget,
} from '@/shared/config/shell';

export interface InspectorApi {
  readonly target: InspectTarget | null;
  readonly isOpen: boolean;
  readonly inspect: (target: InspectTarget) => void;
  readonly close: () => void;
}

export function useInspector(): InspectorApi {
  const [raw, setRaw] = useQueryState(INSPECT_PARAM, { history: 'push' });

  const target = useMemo(() => parseInspect(raw), [raw]);

  const inspect = useCallback(
    (next: InspectTarget) => {
      void setRaw(formatInspect(next));
    },
    [setRaw],
  );

  const close = useCallback(() => {
    void setRaw(null);
  }, [setRaw]);

  return { target, isOpen: target !== null, inspect, close };
}
