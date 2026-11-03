# Trainer implementation contract — 2026-11-03

User requested a practical public-profile / own-footprint route using real GitHub tools and a Duolingo-like trainer with login and cross-device synchronization. The foundations must lead the course, not be an optional appendix.

Root owns trainer page, UI, CSS, progress.js, tests/trainer-progress.test.mjs, site navigation/packaging/deployment. Curriculum worker owns profile/tool lessons19/20, local fixtures, offline CLI and tests. Resource worker owns lessons.js bank. QA worker owns cloud.js/config.js, Supabase schema/setup and cloud tests.

Trainer URL `/trainer/`, relative assets `../assets/trainer/*`. Twenty units, first IDs `profiles`, `github-tools`, then question/ethics/search/sources/evidence/images/video/geolocation/chronolocation/maps/companies/infrastructure/social/entities/data/python/disinformation-ai/reporting. Each has three substantive exercises. Type single or multi with options/array correct; number has options[] and correct string.

Progress v1: completed string[]; attempts Record<string,number>; mistakes string[] derived from review; activityDays string[] YYYY-MM-DD; review Record<id,{at:ISO,needed:boolean}>; completedAt Record<id,ISO>. Completed is monotonic; attempts max on merge; review latest timestamp (device-clock limitations); dates union. No target details/freeform people data in cloud. Local mistakes practice rechecks before clearing, while explanations are always available.

Auth requested, not optional in delivery scope. GitHub Pages cannot provide a private database by itself. Supabase adapter/SQL can be built locally, but no production auth/sync claim without a configured provider and end-to-end verification. Only GitHub CLI authorization was found initially.
