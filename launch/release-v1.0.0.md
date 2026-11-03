# v1.0.0 — Evidence First OSINT

The first release brings a complete free Russian-language course that starts with practical public-profile research and real GitHub tools, then leads to an investigation report with traceable evidence.

Start with a known synthetic page and check which account links it supports. Then run **Sherlock 0.16.2** against four local training endpoints and examine a useful match, a false HTTP 200 result, an explicit absence marker and a timeout.

## Included

- **20 modules and 20 labs**, three checkpoint projects and the North Crossing capstone, with separate solutions and rubrics.
- **20 trainer units and 60 short exercises** with evidence, hints and explained feedback.
- Public-profile and own-footprint practice, a real Sherlock localhost lab, and clearly separate fictional scanner records.
- The full investigation workflow: search, archives, source assessment, preservation, visual verification, place/time, maps, public records, passive infrastructure, entities, data, AI verification and reporting.
- English overview and map, plus bilingual quickstart, core reference sheets and templates. Full lessons, labs, solutions and trainer are in Russian.
- Original labelled synthetic fixtures, contributor guidance, license separation, source research and ready launch drafts.
- Local browser progress. A GitHub sign-in/sync adapter and database migration are included for later connection, while the cloud UI remains disabled pending provider setup. Live login and cross-device sync have not been verified.

Only module 16 on Python programming/APIs is optional. The required Sherlock lab needs a Python runtime, package installation and terminal commands, but no programming. Targets remain on the learner's computer. A saved run supports analysis and does not substitute for the learner's own execution.

Estimated workload: **28–36 hours** for the required full course, **2–3 hours** for the trainer separately, or **30–39 hours** combined. These are editorial estimates, not measured completion times.

## Start

- [Interactive trainer](https://bioxhaust.github.io/evidence-first-osint/trainer/)
- [First profile lesson](https://bioxhaust.github.io/evidence-first-osint/lessons/19-public-profiles/)
- [Real Sherlock lab](https://bioxhaust.github.io/evidence-first-osint/practice/labs/20/)
- [Course map](https://bioxhaust.github.io/evidence-first-osint/resources/course-map/)
- [English quickstart](https://bioxhaust.github.io/evidence-first-osint/resources/quickstart.en/)
- [Verified checks and limitations](https://bioxhaust.github.io/evidence-first-osint/about/quality/)
- [Repository](https://github.com/bioxhaust/evidence-first-osint)

Original prose and training assets are CC BY 4.0; original code is MIT. Upstream tools retain their own licenses. Live extensions are limited to the learner's own or explicitly agreed accounts.


## Checks and current limitation

The implementation passed **19 Python tests**, **25 persistent Node tests**, **13 migration/data-isolation checks in local PostgreSQL 16.15**, and **8 additional JSDOM scenarios**. These are different kinds of checks, not one combined persistent suite. JavaScript cloud responses were simulated; the database checks simulated Supabase roles/auth.uid(). The temporary JSDOM harness is not included in the repository.

GitHub provider connection was deferred. This release offers local progress; cloud login and synchronization remain planned but disabled until setup and live verification are complete. Local progress stays in the current browser and can be lost when browser data is cleared. See the linked quality report for exact environments, evidence and other limitations.
