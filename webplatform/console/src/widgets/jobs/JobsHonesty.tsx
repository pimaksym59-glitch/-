/**
 * The Jobs screen's honest absences (FS12). D3 §17 asks for four things the
 * frozen contract cannot back; each is named here rather than approximated.
 * Server Component — no state, no query, no cost beyond markup.
 */
export function JobsHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="jobs-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="jobs-honesty-heading" className="text-sm font-semibold text-primary">
        What this screen deliberately does not do
      </h2>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">No live transitions</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The contract exposes no task stream. Rather than poll and imply a freshness nobody
            promised, the list is cached and refetched when you act on it or return to it.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No bulk requeue</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Bulk operations must respect per-bot rate limits (§R10.7), and no bulk endpoint exists
            to enforce them. Intents are per task, which is what the queue actually accepts.
          </dd>
        </div>
        <div>
          {/* FS14 T-FS14.4 (plan §5.2 D1): the pipeline journey asks for
              pass/fail gate chips per post. `POST /posts/{id}/validate` exists
              and answers 202, but NOTHING reads a validation result — the post
              resource carries no gate fields — so the outcome is only ever a
              task status here and a status entry in the post's own history. */}
          <dt className="text-[13px] font-medium text-primary">No per-post validation report</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Validation is a queue stage: you can see that it ran and whether the task succeeded, but
            the contract exposes no call that returns which quality gates passed. So no console
            surface shows pass/fail chips for a post — the task status and the post’s own history
            are the whole truth available.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No log view</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            A task carries its own recorded error and that is what you see. The platform’s log
            stream has no read call in the contract, so nothing here links to one.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">
            Three statuses keep the backend’s own words
          </dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            <span className="font-medium">Deferred</span>,{' '}
            <span className="font-medium">Cancelled</span> and{' '}
            <span className="font-medium">Dead (DLQ)</span> have no equivalent in the shared status
            vocabulary, and collapsing them into “Failed” would hide the difference that decides
            what you can do — requeue applies to dead tasks only (§R8.11).
          </dd>
        </div>
      </dl>
      {/* FS14 T-FS14.3 (D3 Part C #1 and #3): the queue is the middle of two
          journeys, and before this strip it named neither end. Server-rendered
          markup — it never enters the client bundle (FS12 rule 60). */}
      <p className="mt-4 border-t border-border-subtle pt-4 text-[13px] leading-6 text-secondary">
        Work arrives here as an intent from somewhere else — a review decision on the{' '}
        <a href="/dashboard" className="underline underline-offset-4 hover:text-primary">
          Dashboard
        </a>{' '}
        or a draft generated from{' '}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
            MEASURED, not preferred: importing `next/link` into this
            server-rendered strip cost `/jobs` 172 → 176 kB and `/health`
            139 → 143 kB (FS14_REPORT §4). The rule exists to avoid a full
            reload on primary navigation; this is an explanatory footer whose
            hops are also reachable from the sidebar and the palette, so the
            trade is 8 kB of two protected routes against one soft reload. */}
        <a href="/chat" className="underline underline-offset-4 hover:text-primary">
          AI Chat
        </a>
        . What a person changed, and when, is recorded in the{' '}
        <a href="/audit" className="underline underline-offset-4 hover:text-primary">
          Audit log
        </a>
        .
      </p>
    </section>
  );
}
