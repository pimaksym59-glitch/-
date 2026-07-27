# Support & Maintenance

**Category:** Support · **Audience:** support · **Status:** I (docs). Complements developer
[maintenance](../operations/maintenance.md) (system upkeep) with **support workflows** (user/operator-facing).

## Support channels (template)

- Issue tracker for defects/requests (`<TRACKER_URL>`).
- Operational escalation path: on-call → operations lead → engineering (`<ESCALATION>`).
- Security disclosures: `SECURITY.md` (do not file public issues for vulnerabilities).

## Severity & SLA (template)

| Severity | Definition | Target response |
|---|---|---|
| S1 | production down / data at risk | `<SLA_S1>` |
| S2 | major feature impaired | `<SLA_S2>` |
| S3 | minor/cosmetic | `<SLA_S3>` |

## Diagnostics to collect (§R12.15)

Environment (Local/CI/Staging/Prod), version/tag, `python -m app doctor` output, relevant structured logs
(secrets masked), health readiness snapshot, failing task ids / runbook already tried. Never include secrets.

## Escalation

Map incidents to [../runbooks/README.md](../runbooks/README.md); if none applies, capture diagnostics and
escalate per the path above.

## Status

Support **procedures** are documented (deterministic templates with placeholders); live SLAs/channels are
organization-specific and filled at operation time.

## Related

[Operations](../operations/README.md) · [Troubleshooting](../troubleshooting/README.md) · [Security](../security/README.md).
