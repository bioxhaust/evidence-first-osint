# Changelog

## v1.0.0 — 2026-11-03

First release of the course and trainer with local browser progress. GitHub OAuth connection and cloud synchronization await completion of provider setup; they are not active release features. Verified checks and limitations are recorded in the [quality notes](docs/about/quality.md).

- Complete Russian course with **20 modules and 20 labs**, three intermediate projects and one capstone, with separate solutions and scoring rubrics. Only module 16 on Python programming/APIs is optional.
- Practical learning order: public profiles and your own footprint, real GitHub tools, then the investigation workflow. Stable lesson URLs follow **19 → 20 → 01–18**.
- Real **Sherlock 0.16.2** lab against four original localhost endpoints: a synthetic profile, a misleading HTTP 200 page, an explicit absence marker and a timeout. The separate fictional TrainingScanner dataset teaches candidate matching without being presented as Sherlock output.
- Interactive trainer with **20 units and 60 exercises**, evidence snippets, hints and explained feedback.
- Local browser progress, plus a GitHub sign-in/sync adapter and database migration for later connection. The cloud UI remains disabled; live OAuth and cross-device synchronization are not yet verified.
- Source assessment, multilingual search, archives, evidence preservation, image/video verification, location/time analysis, maps, companies, procurement, passive infrastructure, public posts, entity resolution, data cleaning, optional Python, AI verification and reporting.
- Original labelled synthetic records, profile fixtures, maps, illustrations, short video and integrity manifests.
- English README, overview and map; bilingual quickstart, core cheatsheets and journal/report/confidence templates. Full lessons, labs, solutions and trainer remain Russian.
- MkDocs Material site with search, mobile navigation, light/dark themes and GitHub Pages workflow.
- Contributor guidance, issue/PR templates, behavior rules, distinct content/code licenses, source research and platform-specific launch drafts.
- Required course workload estimated at **28–36 hours**, trainer at **2–3 hours** separately, or **30–39 hours** combined. Estimates are not measured learning outcomes.

The required tool lab needs a Python runtime and terminal commands, but no programming. Reading a saved tool run does not replace completing its execution. Tests, environments, external-source checks and remaining limitations belong in the current quality report rather than inherited check counts.

Validation recorded for this implementation: 19 Python tests, 25 persistent Node tests, 13 checks of the migration in a local PostgreSQL cluster, and 8 additional temporary JSDOM scenarios. Cloud replies/auth events were simulated in JavaScript; PostgreSQL used simulated Supabase roles/auth.uid(). These checks do not establish live hosted authentication.
