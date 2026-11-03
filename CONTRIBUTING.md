# Contributing / Как помочь

Thank you for improving a free course. Russian and English issues are welcome. Lessons are currently Russian; please label translation scope accurately.

## Useful contributions

Correct a factual claim with a primary source; repair a reproducibility problem; improve an explanation; add an accessible diagram; translate an existing standalone resource. Before adding a new tool, explain which method it serves, its access/cost requirements and a free local fallback. Do not submit affiliate links or promotional lists.

For a substantial new module, open an issue describing the learning outcome and its difference from existing material. A small correction can go directly to a pull request.

## Editorial contract

Each lesson needs an outcome, prerequisites, terms/method, a worked example, an independent task, success criteria, mistakes/limits, explained self-check answers and primary/further sources. Preserve the distinction between observations, inferences and hypotheses. State jurisdiction for legal claims, date for service behavior, and what was actually tested.

Do not add real personal-data dossiers, leaks, unauthorized access instructions, scraped photographs, unlicensed media or sensitive targets. New practice should use synthetic or consented/licensed material with provenance. Do not put private information or credentials in an issue or PR.

## Local verification

With Python 3.12 and a virtual environment:

```sh
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
python tools/check_fixtures.py
python -m mkdocs build --strict
python tools/check_project.py
```

Review the rendered changed pages at desktop and narrow mobile widths. Test links and keyboard interaction. Check both language links when translating a resource. Do not edit committed data just to make a test pass; update the case contract, affected lessons/solutions and manifest together if the educational facts intentionally change.

## Pull requests and licensing

Describe the learner-visible problem, the change and how it was checked. Include source URLs and access dates for factual corrections. Keep changes small enough to review. By submitting original content, you agree to license it under CC BY 4.0, and original code under MIT, as scoped in [LICENSE](LICENSE). You must have the right to contribute it; identify third-party material separately. No copyright assignment or CLA is required.

Maintainers may request changes or decline additions that increase maintenance cost without improving a learning outcome. Response times are not guaranteed. Follow the [code of conduct](CODE_OF_CONDUCT.md).
