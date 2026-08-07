/**
 * Honest-absence surfaces (FS9 T-FS9.10, plan §5.2 D1/D2/D4/D5). D3 §9
 * describes prompt → generate → verify → attach. The frozen contract carries
 * verification and regeneration, but **no image-create call**, **no media
 * URL**, **no post-update that could attach an image** and **no safety
 * verdict** — and this console does not simulate what it cannot read (the FS7
 * retrieval-honesty and FS8 memory-honesty precedents).
 */
import { ImageOff, Link2Off, ShieldQuestion, Wand2 } from 'lucide-react';

type Variant = 'generation' | 'preview' | 'attach' | 'safety';

const CONTENT: Readonly<Record<Variant, { icon: typeof Wand2; title: string; body: string }>> = {
  generation: {
    icon: Wand2,
    title: 'Generation runs in the pipeline, not here',
    body:
      'Images are produced by the backend stage `generate_image` (§R2.5) as part of a post’s pipeline. ' +
      'The contract exposes no endpoint that creates an image from a free-form prompt, so this console ' +
      'offers no composer that could not submit. What it does offer is real: every produced record, its ' +
      'parameters, its attempt history, its similarity report — and regeneration of an existing image.',
  },
  preview: {
    icon: ImageOff,
    title: 'The picture itself is served by object storage',
    body:
      'A record stores its file as an object key (§R6.8); the contract exposes no endpoint that serves ' +
      'the binary and no media URL. Rather than invent a thumbnail or a placeholder that pretends to be ' +
      'the generated image, this console shows the record and says so. The day the API carries a URL, ' +
      'previews appear with no rework.',
  },
  attach: {
    icon: Link2Off,
    title: 'Attaching an image to a post is a backend operation',
    body:
      'A post carries its image reference in its own record, and the contract has no call that updates ' +
      'it. So there is no “Accept” or “Attach to post” button here — a control that cannot do what it ' +
      'says would be worse than its absence.',
  },
  safety: {
    icon: ShieldQuestion,
    title: 'Safety checks are backend-side and not exposed',
    body:
      'The image validator (§R6.7) runs in the pipeline — faces, hands, artefacts, actor likeness. The ' +
      'contract carries no safety field, so this console never shows a “safety ok” chip. What you see ' +
      'below comes from the similarity report the backend does expose (§R6.4).',
  },
};

export function StudioHonesty({
  variant,
  className,
}: {
  readonly variant: Variant;
  readonly className?: string;
}): React.ReactElement {
  const { icon: Icon, title, body } = CONTENT[variant];
  const headingId = `studio-honesty-${variant}`;
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
