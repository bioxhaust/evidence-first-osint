# Investigation journal template

[Русский](journal.md) · [Report template](report.en.md)

Copy and complete these intentional blank fields. Use ISO 8601 timestamps with offsets. Keep observation and inference separate; multiple copies do not become independent sources.

```text
Investigation / version:
Question and individual claims:
Scope, period and cutoff:
Permitted access / data minimization / stopping conditions:
Hypothesis H1:
Alternative H2:

Journal entry J…
Action timestamp with offset:
Action / exact query / filters / tool version:
Evidence ID E… and author / publisher:
Original URL or path / record ID:
Publication time / event time / access time (separately):
Preserved original / working copy / SHA-256 if computed:
Exact passage or observation:
Provenance: primary record or copied from whom:
Inference (separate from observation):
Supports / contradicts / does not distinguish H1 and H2:
Independent corroboration / shared origin:
Exclusion / quarantine / redaction decision:
Uncertainty / next verification step:
```

Example: E02 is `payments.csv`, PAY-01 and PAY-02. The rows record settled payments of 3m and 2m TST. PAY-03 is scheduled after the cutoff. Filtering by contract ID, date and status yields 5m. Full payment is unsupported in the supplied ledger; external completeness remains unknown. Record your real access time and compute a hash or explicitly state it was not computed.
