/** The Admin screen's honest absences (FS12). Server Component. */
export function AdminHonesty(): React.ReactElement {
  return (
    <section
      aria-labelledby="admin-honesty-heading"
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="admin-honesty-heading" className="text-sm font-semibold text-primary">
        What this screen deliberately does not do
      </h2>
      <dl className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-[13px] font-medium text-primary">Create, not invite</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The contract creates an account directly. There is no invitation, no email and no
            pending state, so nothing here claims one was sent.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No deactivate or delete</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            The users table has a status column, but the API documents only a role change. Until a
            write for it exists, the button does not — revoking sessions is the honest lever.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">No session inventory</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            Sessions can be revoked but not listed: there is no sessions endpoint and no sessions
            table. Devices, IPs and last-seen times are absent rather than approximated.
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-primary">Role changes are not optimistic</dt>
          <dd className="mt-1 text-[13px] leading-6 text-secondary">
            A role decides what someone can do. The list shows what the server recorded, not what
            the click hoped for — and the change is audited server-side either way.
          </dd>
        </div>
      </dl>
    </section>
  );
}
