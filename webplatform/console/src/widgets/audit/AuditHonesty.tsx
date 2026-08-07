/** The Audit screen's honest absences (FS12). Server Component. */
export function AuditHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="audit-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="audit-honesty-heading" className="text-sm font-semibold text-primary">
        What this screen deliberately does not do
      </h2>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">No time-range filter</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The contract accepts <span className="font-mono">?entity=</span> and{' '}
            <span className="font-mono">?actor=</span> and no other parameter. A date picker here
            would filter only what was already fetched while looking like a query — so it is absent
            rather than misleading.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No server-side export</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            There is no export endpoint. “Download CSV” serializes the records already loaded in
            this browser, and the filename records the filters they came from.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">Actors stay raw ids</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Resolving a name needs the users endpoint, which is owner-only. Rather than show a name
            to some roles and a guess to others, every role sees the id the log recorded.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No AI summary or anomaly flag</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The audit log is the trustworthy history; a generated summary sitting next to it invites
            reading the summary instead. Nothing here is AI-altered or AI-ranked.
          </dd>
        </div>
      </dl>
    </section>
  );
}
