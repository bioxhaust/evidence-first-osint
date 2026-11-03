# Your first OSINT investigation in 15 minutes

[Русский](quickstart.md) · [English course map](../en/index.md)

**Outcome:** one bounded finding with a reproducible evidence trail. You need a browser and notes. All records are original synthetic training data; no real person or company is a target.

**Minutes 0–3 — ask one question.** A fictional post says a bridge opened for cars and its entire 12 million contract has been paid. Separate those claims. Ask: “Does the supplied payment ledger establish payment of all 12 million TST under C-17 by 2025-05-18T23:59:59Z?”

**Minutes 3–7 — inspect the records.** Open [contracts](../assets/case/contracts.csv) and [payments](../assets/case/payments.csv). C-17 has a contract value of 12,000,000 TST. PAY-01 and PAY-02 are `settled`: 3,000,000 and 2,000,000. PAY-03 is `scheduled` for May 20. PAY-04 belongs to C-18. Join by `contract_id`, not by a similar company name.

**Minutes 7–10 — calculate and challenge.** The known settled total is **5,000,000 TST**. Contract value is not cash paid. A scheduled payment is not settled. A further question remains: is the supplied ledger exhaustive? The exercise does not establish that.

**Minutes 10–13 — record the trail.** Assign evidence IDs to the contract row, settled payment rows and scheduled row. Preserve the filenames, row IDs, access time, inclusion/exclusion decisions and arithmetic. Three evidence items from one ledger are not three independent sources.

**Minutes 13–15 — write the finding.**

> The supplied ledger records 5 million TST in settled payments for C-17 by the cutoff. Its contract value is 12 million; the remaining 7 million is scheduled after the cutoff. Full payment is not supported by these records. Completeness outside the supplied corpus is unknown.

Confidence is high in the arithmetic and recorded status, while coverage remains uncertain. Do not infer fraud or motive. A reader should be able to reproduce your calculation from the named rows.

[Get the journal template](../templates/journal.en.md) · [Explore the course](../en/index.md). Lessons are in Russian; this quickstart and the core reference materials have English versions.

Method reference: [Berkeley Protocol](https://humanrights.berkeley.edu/projects/developing-the-berkeley-protocol-on-digital-open-source-investigations/), page checked 2026-11-03.
