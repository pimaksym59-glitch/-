'use client';

/**
 * Chat composer (FS6 T-FS6.4 — D3 §5). ONYX AIComposer + the model selector
 * from the static registry. Keyboard contract: `⌘↵` send (AIComposer), `⇧↵`
 * newline (textarea default), `↑` on an EMPTY composer recalls the last user
 * turn for editing (the screen supplies it), `⌘⌫` stop (global shortcut wired
 * by the screen; the Stop button here covers pointer users).
 */
import { AI_MODELS } from '@/shared/config/models';
import { AIComposer } from '@/shared/ui/ai';
import { Select } from '@/shared/ui/select';

export interface ComposerProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSend: () => void;
  readonly streaming: boolean;
  readonly onStop: () => void;
  readonly model: string;
  readonly onModelChange: (model: string) => void;
  /** `↑` on an empty composer restores this text for editing (D3 §5). */
  readonly lastUserPrompt?: string | undefined;
  readonly disabled?: boolean;
}

export function Composer({
  value,
  onValueChange,
  onSend,
  streaming,
  onStop,
  model,
  onModelChange,
  lastUserPrompt,
  disabled = false,
}: ComposerProps): React.ReactElement {
  return (
    // Key delegation only: the wrapper adds NO interactivity of its own — it
    // listens for `↑` bubbling from the child textarea (the interactive
    // element), which is why the static-interaction rule is suppressed here.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' && value === '' && lastUserPrompt && !streaming) {
          event.preventDefault();
          onValueChange(lastUserPrompt);
        }
      }}
    >
      <AIComposer
        value={value}
        onValueChange={onValueChange}
        onSend={onSend}
        streaming={streaming}
        onStop={onStop}
        disabled={disabled}
        placeholder="Ask your AI… (⌘↵ to send)"
        modelSelector={
          <Select
            label="Model"
            hideLabel
            size="sm"
            items={AI_MODELS.map((m) => ({ value: m.id, label: m.label }))}
            value={model}
            onValueChange={onModelChange}
            className="w-36"
          />
        }
      />
    </div>
  );
}
