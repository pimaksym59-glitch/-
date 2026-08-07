/** The Providers screen's honest absences (FS12). Server Component. */
export function ProvidersHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="providers-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="providers-honesty-heading" className="text-sm font-semibold text-primary">
        Why this screen is smaller than it looks like it should be
      </h2>
      <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
        The frozen API has no providers resource. It has a write-only key group and a readiness
        probe, and that is what you see above. Everything below would need a call that does not
        exist.
      </p>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">No capability matrix</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Which models a provider serves, and at what context length, is known inside the backend
            registry — no endpoint publishes it, so nothing here lists capabilities.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No enable/disable or routing</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Default-model routing is configuration the backend owns. Rolling it back is possible
            today through Admin → Config Versions; setting it from here is not.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No “test connection”</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            There is no probe-this-provider call. Readiness reports what the backend already
            checked, and only for the dependencies it names.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No key is ever displayed</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Not in full, not masked, not in an export and not in a log. A mask is still key
            material, and the contract promises none — “configured” is the honest maximum (§R10.4,
            §R12.2).
          </dd>
        </div>
      </dl>
    </section>
  );
}
