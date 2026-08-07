/**
 * Honest-absence surfaces (FS10 T-FS10.9, plan §5.2 D1/D2/D3/D5/D8). D3 §10
 * describes author → version → test → diff → **promote**, with variables and a
 * Playground hand-off. The frozen `/prompts` group is three calls: list, new
 * version, versions. Everything it cannot back is named here rather than
 * simulated (the FS7 retrieval-honesty, FS8 memory-honesty and FS9
 * studio-honesty precedents).
 */
import { Braces, Globe2, Rocket, Trash2, UserRound } from 'lucide-react';

type Variant = 'activation' | 'variables' | 'platformWide' | 'author' | 'lifecycle';

const CONTENT: Readonly<Record<Variant, { icon: typeof Rocket; title: string; body: string }>> = {
  activation: {
    icon: Rocket,
    title: 'Which version is “active” is decided in the backend',
    body:
      'The contract has no promote call and the prompt record has no active flag, so this console never ' +
      'labels a version Active or Draft — either badge would be a guess. What it shows is the fact the ' +
      'API does carry: the version chain, newest first. The runtime prompt itself is assembled by the ' +
      'backend prompt-builder (§R5.3) from the persona, style rules, topic, schedule and few-shot ' +
      'examples — a stored row is an input to that build, not the text a model received.',
  },
  variables: {
    icon: Braces,
    title: 'No variables are claimed, because none are defined',
    body:
      'A prompt row is `type · text · version · author · model · result` — there is no variables field ' +
      'and the contract documents no templating syntax. Highlighting placeholders here would assert an ' +
      'interpolation mechanism that may not exist, so the text is shown exactly as stored.',
  },
  platformWide: {
    icon: Globe2,
    title: 'Prompts are platform-wide, not per-channel',
    body:
      'The prompt record carries no channel, so this library is the same for every channel in the ' +
      'workspace and switching the active channel changes nothing on this screen. Channel-specific ' +
      'voice lives in Memory (persona and style features); channel-specific knowledge lives in ' +
      'Knowledge.',
  },
  author: {
    icon: UserRound,
    title: 'Authors are shown as ids',
    body:
      'A version records the id of the account that created it. Resolving that id to a person requires ' +
      'the user directory, which the contract restricts to owners — so the id is shown as an id rather ' +
      'than replaced with a name this console cannot verify.',
  },
  lifecycle: {
    icon: Trash2,
    title: 'Editing is versioning, and nothing is deleted',
    body:
      'The only write the contract exposes is “create a new version” (§R10.6 — an edit *is* a new ' +
      'version). There is no update call and no delete call, so this library has no rename, no ' +
      'overwrite and no destructive action to offer. History is append-only by design.',
  },
};

export function PromptsHonesty({
  variant,
  className,
}: {
  readonly variant: Variant;
  readonly className?: string;
}): React.ReactElement {
  const { icon: Icon, title, body } = CONTENT[variant];
  const headingId = `prompts-honesty-${variant}`;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border border-border-default bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
        <h3 id={headingId} className="text-sm font-semibold text-primary">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-sm text-secondary">{body}</p>
    </section>
  );
}
