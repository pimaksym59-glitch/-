/**
 * AI model registry (FS6). The frozen contract exposes no `/models` endpoint,
 * so the selectable set is a static registry *(assumed)* — the ids are the
 * platform's configured models (MASTER_SPEC: body `claude-opus-4-8`, fast
 * `claude-haiku-4-5`). Reconciled with the live backend under FE-RV-9; extend
 * the registry, never hand-wire copies (registry-driven pattern).
 */
export interface AiModelDef {
  readonly id: string;
  readonly label: string;
}

export const AI_MODELS: readonly AiModelDef[] = [
  { id: 'claude-opus-4-8', label: 'Opus · quality' },
  { id: 'claude-haiku-4-5', label: 'Haiku · fast' },
];

export const DEFAULT_MODEL_ID = 'claude-opus-4-8';

export function isKnownModel(id: string): boolean {
  return AI_MODELS.some((model) => model.id === id);
}
