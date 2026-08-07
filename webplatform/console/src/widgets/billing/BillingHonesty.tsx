/** The Billing screen's honest absences (FS12). Server Component. */
export function BillingHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="billing-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="billing-honesty-heading" className="text-sm font-semibold text-primary">
        What this screen deliberately does not do
      </h2>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">No plan or invoices</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            There is no billing provider behind this console and no invoice endpoint. What you see
            is computed usage cost, not a bill, and no charge is ever shown as pending or paid.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No forecast</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Cost forecasting is designed backend-side and deferred by design (§R11.8). Projecting a
            month-end figure in the browser would be a number nobody computed — so the total is the
            served window and nothing more.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No budget alerts</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Setting a threshold implies something watches it. Nothing here can, because there is no
            endpoint to store a budget and no alerting path that would fire.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">Platform-wide, not per channel</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Switching the active channel changes nothing on this screen. Group by{' '}
            <span className="font-mono">channel</span> to compare them — that facet is the
            contract’s own, and it is the honest way to ask the question.
          </dd>
        </div>
      </dl>
    </section>
  );
}
