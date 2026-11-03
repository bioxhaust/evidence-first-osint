# DEV Community — техническая статья, черновик

Кандидат: [DEV Community](https://dev.to/), тематические теги `python`, `opensource`, `tutorial`, `beginners` при соответствии их текущим описаниям. [Code of Conduct](https://dev.to/code-of-conduct) прочитан 2026-11-03; [Terms](https://dev.to/terms) доступны по результатам исходной проверки. Это не подтверждает допустимость любого рекламного или сгенерированного материала. Перед отправкой проверьте текущие правила редактора об AI-assisted content, укажите помощь ИИ и лично повторите пример. Ниже самостоятельный учебный материал с раскрытием связи с проектом.

## Title

A payment total is not a contract value: an evidence-first data-cleaning exercise

## Draft

A dataset can produce a correct sum and still support the wrong conclusion. In a synthetic teaching case, a post claims that all 12 million TST under contract C-17 has been paid. Four rows are enough to see why schema, status and time matter.

I maintain Evidence First OSINT, a free Russian-language course built around local, labelled synthetic evidence. This article is based on one of its exercises and was drafted with AI assistance. The rows below are fictional; TST is a training currency.

```csv
payment_id,contract_id,amount,currency,paid_at,status
PAY-01,C-17,3000000,TST,2025-04-25,settled
PAY-02,C-17,2000000,TST,2025-05-10,settled
PAY-03,C-17,7000000,TST,2025-05-20,scheduled
PAY-04,C-18,250000,TST,2025-05-05,settled
```

The question is specific: what settled payments are recorded for C-17 by the end of 18 May 2025? It is not a question about every payment the supplier has ever received.

### Define the rule before calculating

Use the stable contract ID, not a company name. Require `status == "settled"`. Keep the cutoff explicit. Preserve rejected rows and the reason for rejection rather than silently deleting them.

For this fixture, dates are complete ISO calendar dates and currency is consistently TST. A real dataset with mixed currencies or timestamps would require different validation; do not copy these assumptions blindly.

```python
import csv
from datetime import date
from decimal import Decimal
from io import StringIO

records = """payment_id,contract_id,amount,currency,paid_at,status
PAY-01,C-17,3000000,TST,2025-04-25,settled
PAY-02,C-17,2000000,TST,2025-05-10,settled
PAY-03,C-17,7000000,TST,2025-05-20,scheduled
PAY-04,C-18,250000,TST,2025-05-05,settled
"""
cutoff = date(2025, 5, 18)
total = Decimal("0")
for row in csv.DictReader(StringIO(records)):
    reasons = []
    if row["contract_id"] != "C-17":
        reasons.append("different contract")
    if row["status"] != "settled":
        reasons.append("not settled")
    if date.fromisoformat(row["paid_at"]) > cutoff:
        reasons.append("after cutoff")
    if row["currency"] != "TST":
        raise ValueError("Unexpected currency")
    if reasons:
        print(row["payment_id"], "; ".join(reasons))
    else:
        total += Decimal(row["amount"])
print("Recorded settled total:", total, "TST")
```

The total is **5,000,000 TST**. PAY-03 is both scheduled and after the cutoff; PAY-04 belongs to C-18. The 12 million contract value is a separate fact, not another payment row.

### State the limit beside the result

A defensible finding is: “The supplied ledger records 5 million TST in settled payments for C-17 by the cutoff. It does not establish full payment of 12 million.”

It would be too strong to write: “The company only received 5 million in total.” The supplied ledger’s completeness outside the training corpus is unknown. Confidence can be high in the calculation and lower in a broader claim about the world.

The full exercise introduces duplicate rows, inconsistent number formatting and an unknown amount. Those need an audit trail and quarantine before summing; this compact example intentionally starts with the clean fixture.

You can try the [English 15-minute exercise](https://bioxhaust.github.io/evidence-first-osint/resources/quickstart.en/) or inspect the [course and local fixtures](https://github.com/bioxhaust/evidence-first-osint). The full lessons are Russian; the English quickstart, map and reference templates stand alone. Original prose and training assets are CC BY 4.0; original code is MIT.

If you review it, useful feedback would identify an assumption that the data does not justify, or a step another reader cannot reproduce.
