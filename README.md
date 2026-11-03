# Evidence First OSINT

**Find the right public profile. Run a GitHub tool. Check whether its result is real.**

[English](README.md) · [Русский](README.ru.md)

A free practical course for beginning researchers, journalists, analysts and security practitioners. Start with linked profiles and your own public footprint, then verify images, companies, payments and claims. Finish with a report another person can reproduce.

**[Open the interactive investigation workspace (Russian) →](https://bioxhaust.github.io/evidence-first-osint/investigator/)**

Three cases, 25 unlockable source cards and 10 evidence-backed checks. Choose documents, keep local notes, select the decisive sources and export your work. Free-text notes are not automatically graded; the workspace does not run external OSINT programs. Those run separately in the tool labs.

The new [hands-on route](docs/practice/fieldwork.md) starts with opening source documents and finding the right professional profile. Three separate fictional investigations cover profile matching, professional claims and project authorship, with progressively fewer instructions. Real **Sherlock, Maigret, ExifTool and FFmpeg** labs require learners to obtain and check their own outputs. The [toolkit](docs/resources/toolkit.md) distinguishes tested exercises from documentation-only recommendations. Allow roughly **4–6 hours plus setup**; this is an editorial estimate, and Sherlock overlaps with the original course. The new cases and additional labs are not included in the original course estimates below. Use the [60-exercise trainer](https://bioxhaust.github.io/evidence-first-osint/trainer/) for review after practical work.

[First profile lesson](docs/lessons/19-public-profiles.md) · [Run real Sherlock locally](docs/practice/labs/20.md) · [All practice](docs/practice/index.md) · [Cheatsheets](docs/resources/index.md) · [English map](docs/resources/course-map.en.md)

> **Language:** the 20 lessons, labs, trainer and worked solutions are in Russian. The English overview, map, quickstart, core cheatsheets and report/journal/confidence templates are translated. The full course is not translated.

## Try a concrete task

A known training page links to two profiles. A scanner finds a matching username elsewhere, a duplicate URL, a sign-in page and a timeout. Which results support an account link, and which remain candidates or unknown?

The [profile exercise](docs/practice/labs/19.md) gives you the original records. Then [Sherlock 0.16.2 runs against four local training endpoints](docs/practice/labs/20.md): one real synthetic profile, one misleading HTTP 200 page, one explicit absence marker and one delayed response. You inspect a real tool's false positive without searching for a stranger.

The required tool lab needs a Python runtime and terminal commands; no programming is required. The saved run is available for analysis, but reading it does not count as completing your own technical run. The separate Python programming/API module remains optional.

## Choose your depth

- **Trainer:** 20 short units, 60 exercises with evidence snippets, hints and explained feedback. Allow **2–3 hours**. It introduces the decisions; it does not replace full labs.
- **Full course:** 20 modules and 20 labs, three intermediate projects and one capstone. Module 16 and its lab are optional, leaving **19 required modules/labs**. Nominal required work is **27h 45m**; allow **28–36 hours** with revision.
- **Both:** allow approximately **30–39 hours**. These are editorial estimates, not measured learner outcomes. Optional module 16 adds about 75 minutes beyond the required route.

Progress is saved in the current browser. **GitHub sign-in and cloud sync are not enabled yet:** provider setup has been deferred to a later step. The adapter and database migration are implemented and locally tested; live login and cross-device sync remain unverified. See [quality notes](docs/about/quality.md).

## Learning route

1. **Public profiles and GitHub tools:** inspect self-links, reject false matches, run Sherlock locally, and plan changes to your own public footprint.
2. **Questions and sources:** scope, ethics, multilingual search, archives and preservation.
3. **Visual evidence:** images, video, location, time and map accuracy.
4. **Records and relationships:** companies, procurement, passive infrastructure, public posts, entities and data cleaning.
5. **Findings:** optional Python, disinformation/AI verification and reporting.

Lesson URLs retain their stable IDs: start with **19 → 20**, then **01–18**. Follow the [full map](docs/resources/course-map.en.md) or [30-day route](docs/resources/30-days.md).

[Practice and rubrics](docs/practice/index.md) · [Capstone](docs/practice/capstone.md) · [Separate solutions](docs/solutions/index.md)

## More material you can use immediately

[15-minute payment investigation](https://bioxhaust.github.io/evidence-first-osint/resources/quickstart.en/) · [Search operators](docs/resources/search.en.md) · [Method tree](docs/resources/decision-tree.en.md) · [Media checklist](docs/resources/media-checklist.en.md)

[Journal](docs/templates/journal.en.md) · [Report template](docs/templates/report.en.md) · [Confidence guide](docs/templates/confidence.en.md)

![Original synthetic course scene: bridge, square tower, three chimneys and barrier. This is an illustration, not a photograph of a real event.](docs/assets/case/media/repost.jpg)

## Study and reuse

Read the [website](https://bioxhaust.github.io/evidence-first-osint/) or download **Code → Download ZIP**. Small CSV/JSON records are readable in a text editor. A free spreadsheet editor is convenient; installation instructions for the required tool lab are in [lesson 20](docs/lessons/20-github-tools.md).

Training subjects and local endpoints are synthetic. Live extensions are limited to your own or explicitly agreed accounts. The course does not require private addresses, leaked-data purchases, authentication bypass or unsolicited contact. Public access does not waive privacy, copyright or platform rules.

## Build and check locally

Python 3.12 is used by site CI. The Sherlock lab has its own tested environment and installation instructions. Actual checks and platform limitations are in [quality notes](docs/about/quality.md).

~~~sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
python tools/check_fixtures.py
python -m mkdocs build --strict
python tools/check_project.py
python -m mkdocs serve
~~~

Activation above is for POSIX shells. Windows instructions have not been verified for the Sherlock exercise. The optional media generator needs ffmpeg; learners use committed assets.

## Project and contribution

[Research of 10 resources, 2026-11-03](research/landscape.md) · [Tool research](research/profile-tools-review.md) · [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md) · [Roadmap](ROADMAP.md) · [Launch drafts](launch/README.md)

If the course helps you, a GitHub star helps others discover it.

## Licensing

Original text and synthetic teaching assets: **[CC BY 4.0](LICENSE-CONTENT)**. Original code and code blocks: **[MIT](LICENSE-CODE)**. Read [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md) for scope, including upstream tools. Attribution: “Evidence First OSINT contributors”, repository URL, license link and a note of changes. Linking a tool does not relicense it.
