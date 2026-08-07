/** The Health screen's honest absences (FS12). Server Component. */
export function HealthHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="health-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="health-honesty-heading" className="text-sm font-semibold text-primary">
        What this screen deliberately does not do
      </h2>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">No probe history</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The contract returns the current readiness verdict and nothing else. There is no
            time-series call, so no uptime figure and no history chart is drawn.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No AI triage</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Naming a cause (“readiness is red because the queue is backed up”) would be a causal
            claim the data does not support. The screen shows which dependency reported what, and
            leaves the diagnosis to you.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No alert subscription</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Alerting lives outside the console, with an external dead-man’s switch by design
            (§R12.10) — a scheduler that is down cannot alert about itself.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">Re-check is a re-read</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            There is no “run the probes” call. The button re-reads the endpoint; if a dependency is
            slow to recover, the verdict simply has not changed yet.
          </dd>
        </div>
      </dl>
      {/* FS14 T-FS14.3 (D3 Part C #3 / D1 §7.10): triage is "probe → jobs →
          logs → runbook". Two of those four exist; this strip carries the user
          to them and names the two that do not, instead of ending the chain in
          silence. Server-rendered markup (FS12 rule 60). */}
      <p className="mt-4 border-t border-border-subtle pt-4 text-[13px] leading-6 text-secondary">
        When a dependency reports badly, the work it blocked is in{' '}
        <a href="/jobs" className="underline underline-offset-4 hover:text-primary">
          Jobs
        </a>{' '}
        — a dead task carries its own recorded error and can be requeued as an intent — and any
        configuration change that preceded it is in the{' '}
        <a href="/audit" className="underline underline-offset-4 hover:text-primary">
          Audit log
        </a>
        . The two remaining steps of the triage path have no endpoint in the frozen contract: there
        is no log stream to filter and no runbook corpus to open.
      </p>
    </section>
  );
}
