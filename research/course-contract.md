# Editorial and fixture contract

Project: **Evidence First OSINT — Сначала доказательства**. Research date: 2026-11-03.
Repository/site: https://github.com/bioxhaust/evidence-first-osint and https://bioxhaust.github.io/evidence-first-osint/.
Lessons are Russian. EN README/map and core cheatsheets/templates are translated; do not imply full translation.

## File layout and lesson IDs

`docs/lessons/{id}.md`: 01-question, 02-ethics, 03-search, 04-sources, 05-evidence,
06-images, 07-video, 08-geolocation, 09-chronolocation, 10-maps, 11-companies,
12-infrastructure, 13-social, 14-entities, 15-data, 16-python, 17-disinformation-ai, 18-reporting.

Each lesson: 60 minutes INCLUDING its lab except 16 (optional, 75 min) and 17 (75 min).
Required lessons total 17 h 15 min; 3 intermediate projects at 90 min = 4 h 30;
capstone 4 h; core total 25 h 45, round to 26–34 hours allowing revision. Optional Python adds 75 min.
Each lesson must have result, prerequisites, terms/method, worked steps, independent exercise,
success criteria, mistakes/limits, self-check questions with explained answers, primary/further sources.
Use headings `## Результат`, `## До начала`, `## Метод`, `## Разобранный пример`,
`## Самостоятельная работа`, `## Критерии успеха`, `## Ошибки и ограничения`,
`## Самопроверка`, `## Источники`. Include real explanation, not outlines. Target 650–1000 Russian words per lesson.
Lab paths `docs/practice/labs/01.md` … `18.md`; from lesson link `../practice/labs/01.md`.
Separate answers `docs/solutions/labs/01.md` … `18.md`.
Project paths `docs/practice/projects/01.md` … `03.md`, solutions corresponding.
Final `docs/practice/capstone.md`, solution `docs/solutions/capstone.md`.
Helpers `docs/resources/{quickstart,search,decision-tree,media-checklist,course-map,30-days,challenge}.md`.
Templates `docs/templates/{journal,report,confidence}.md`, EN versions suffixed `.en.md`.

## Case facts: СЕВЕРНАЯ ПЕРЕПРАВА (all synthetic)

No real people, companies, locations or domains are research targets. All study material is original synthetic data, CC BY 4.0. Every document/image has visible SYNTHETIC / УЧЕБНЫЙ МАТЕРИАЛ label. Dates below are fictional events, not course update dates. Domain `northbridge.example` and `.example` only; IPs TEST-NET per RFC5737. Do not resolve them over network.

Assets will live under `docs/assets/case/` and be downloadable from site, with README.md index and manifest.json (SHA-256 of each asset excluding manifest itself). Root creates exact files below. Link from lesson `../assets/case/README.md`; from lab `../../assets/case/README.md`.

1. `posts.csv`: headers `post_id,published_at,account_id,text,source_ref,synthetic`.
   P01 2025-05-17T12:10:00+03:00, account CITY-DIGEST: «Северная переправа открыта для автомобилей 17 мая. Контракт выиграла компания Маяк. Все 12 миллионов уже выплачены. Фото снято сегодня.» ref media/repost.jpg.
   P02 2025-05-17T12:15:00+03:00 REPOST-A: repetition of P01, source_ref P01.
   P03 2025-05-17T12:18:00+03:00 REPOST-B: repetition of P01, source_ref P01.
   P04 2025-05-18T09:05:00+03:00 NOTICE: «Открыт проход для пешеходов; автомобили пока не допускаются.» ref bulletin-02.txt.
   P05 2025-05-17T13:00:00+03:00 RIVER-NOTES: «Вижу людей на мосту; дату съёмки подтвердить не могу.» ref media/repost.jpg.
   The same image was already in local archive `archive/photo-record.txt` at 2025-05-03T10:00:00Z. This upper-bounds prior existence of depicted scene IN THIS synthetic archive; does not establish exact exposure time.

2. `bulletin-01.txt` B01 published 2025-05-17T08:00:00Z: load testing on 17 May; no authorization for motor traffic; opening date pending acceptance.
   `bulletin-02.txt` B02 published 2025-05-18T06:00:00Z: pedestrian opening at 2025-05-18T09:00:00+03:00; motor vehicles remain closed.
   `archive/page-before.txt` captured 2025-05-16T18:00:00Z says «испытания запланированы на 17 мая».
   `archive/page-after.txt` captured 2025-05-18T06:10:00Z says «проход для пешеходов открыт 18 мая».
   Archive snapshots bound page change to (May16 18Z, May18 06:10Z]; not exact event time.

3. `companies.csv`: `registry_id,name,jurisdiction,status,address_code,synthetic`.
   SYN-101,Маяк Инжиниринг,TRAIN-A,active,OFFICE-7,true
   SYN-202,Маяк Медиа,TRAIN-A,active,OFFICE-7,true
   SYN-303,Mayak Engineering,TRAIN-B,active,OFFICE-9,true
   Shared OFFICE-7 is a coworking building, not evidence of common ownership.
   `contracts.csv`: `contract_id,supplier_id,description,contract_value,currency,signed_at,synthetic`.
   C-17,SYN-101,Испытания и подготовка переправы,12000000,TST,2025-04-20,true.
   C-18,SYN-202,Информационные материалы,250000,TST,2025-05-02,true.
   `payments.csv`: `payment_id,contract_id,amount,currency,paid_at,status,synthetic`.
   PAY-01,C-17,3000000,TST,2025-04-25,settled,true
   PAY-02,C-17,2000000,TST,2025-05-10,settled,true
   PAY-03,C-17,7000000,TST,2025-05-20,scheduled,true
   PAY-04,C-18,250000,TST,2025-05-05,settled,true.
   cutoff 2025-05-18T23:59:59Z: confirmed C-17 settled payments 5,000,000 TST; 12m contract value != paid. Table coverage not assumed exhaustive outside corpus.

4. `payments-dirty.csv` has rows PAY-01 twice (identical), PAY-02 amount `2 000 000`, PAY-03 scheduled amount `7,000,000`, BAD-01 amount `unknown`, PAY-04 250000 C-18. Dates ISO (no ambiguous locale conversion). Expected clean unique settled C17 total 5000000; duplicate PAY01 retained in audit, BAD01 quarantined, scheduled excluded (not lost), other contract excluded from C17 filter. Tools should preserve raw and ledger of decisions.

5. `domain-records.json`: synthetic collected_at 2025-05-18T12:00:00Z; domain northbridge.example; A 192.0.2.10; MX mail.northbridge.example; nameservers ns1.example; certificate SAN [northbridge.example, www.northbridge.example], not_before 2025-04-01T00:00:00Z; registrar Example Registrar; redacted registrant; historical_A 198.51.100.20 on 2025-04-01. A second domain may share IP, not owner. CT cert issuance neither proof of operation date nor domain controller identity.

6. `media/original.jpg` original synthetic illustrated bridge (drawn by script, not a real photograph); EXIF DateTimeOriginal `2025:05:03 09:00:00`, no timezone, no GPS. `media/repost.jpg` cropped/resized derived version, no EXIF. Both show distinctive square water tower west of bridge, striped barrier on south approach, factory 3 chimneys east. Visual watermark on both. `media/metadata.json` explicitly states extraction from these local images, not externally verified truth. `media/scene.svg` accessible schematic with visual marks. `map.svg` 2D fictional local metre grid (NOT WGS84) with north arrow, scale, candidates A/B: A (200,300) has tower west + factory east + road from south; B (700,300) has tower east + factory west. Visual matches favour A; no real coordinates.
   `media/training-clip.mp4` if ffmpeg available: generated synthetic animated clip with source frames `media/frame-01.jpg`, `frame-02.jpg`, `frame-03.jpg`. Frame 01 closed barrier; frame02 sign «ИСПЫТАНИЯ» (or TEST); frame03 bridge pedestrians. Frame appearance is not proof continuous real recording. A frame index `media/frames.csv` records positions 0,2,4 seconds. Duration six seconds. No real filming date inferred.

7. `timeline.csv`: machine-readable fictional events with original offset, UTC and `kind` (capture/publication/event/claim) to prevent collapsing distinct time types. `search-corpus.json`: 6 local snippets in RU/EN with ids, title, text, date, domain; built-in fallback for query design, no promise to emulate Google ranking.
   `api-response.json`: original synthetic API JSON for local Python exercise, records equivalent to clean payments, no keys.

## Correct final boundaries

Four separate claims: (a) vehicle opening May17 contradicted by corpus B01+B02, high confidence within corpus; (b) image taken today May17 contradicted by its earlier archive appearance, exact photo time unknown; (c) winner is specifically SYN-101 for C17, not every Mayak company; (d) full 12m paid by cutoff unsupported, only 5m settled in provided ledger. No conclusion of fraud, owner identity, political motive, or worldwide truth. P02/P03 copies not independent. Choose location A with moderate confidence (synthetic map), time window limited, no exact geolocation outside exercise. Capstone 900–1400 words plus evidence log with >=8 source items and 2 alternative explanations.

## Responsible teaching

All required work local/no accounts/no paid APIs. Optional live examples use public documentation/official APIs and require own policy/terms/legal assessment, respect rate limits, no auth bypass. EU GDPR scope explicit; not universal law. Terms, copyright and minimization remain relevant. Robots is not authorization. Do not train tracing private individuals or sensitive targets. Claims/observations/inferences always separated. No absolute AI detector or metadata truth guarantees. Date external service notes 2026-11-03; distinguish HTTP/read docs from tested service functionality.
