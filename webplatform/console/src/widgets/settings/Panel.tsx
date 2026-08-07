/**
 * The frame every settings panel shares: one `h2` heading (the page owns the
 * single `h1` — the FS11/FS12 `heading-order` fix applied pre-emptively), an
 * optional lead, and the rows.
 *
 * `LocalNote` is load-bearing, not decoration. The frozen contract carries no
 * preferences resource, so every value on this screen lives in THIS BROWSER.
 * Saying so wherever a preference is rendered is the §R10.3 honesty rule
 * applied to controls: a browser-local value presented as an account value
 * would be the same class of lie as a fabricated metric.
 */
export function Panel({
  title,
  lead,
  children,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="onyx-raised rounded-xl border border-border-subtle p-5">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {lead ? (
        <p className="mt-1 max-w-[72ch] text-[13px] leading-6 text-secondary">{lead}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  );
}

export function PanelRow({
  label,
  description,
  control,
}: {
  readonly label: string;
  readonly description?: string;
  readonly control: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-primary">{label}</p>
        {description ? (
          <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-secondary">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** The standing statement of where a preference is kept. */
export function LocalNote({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <p className="rounded-lg border border-border-subtle bg-inset px-3 py-2 text-[13px] leading-5 text-secondary">
      {children}
    </p>
  );
}

/** A named absence, in the fact · reason · what-would-change-it shape. */
export function AbsenceRow({
  title,
  fact,
  remedy,
}: {
  readonly title: string;
  readonly fact: string;
  readonly remedy: string;
}): React.ReactElement {
  return (
    <div className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <p className="text-[13px] font-medium text-primary">{title}</p>
      <p className="mt-1 max-w-[72ch] text-[13px] leading-5 text-secondary">{fact}</p>
      <p className="mt-1 max-w-[72ch] text-[13px] leading-5 text-secondary">{remedy}</p>
    </div>
  );
}
