# Search operators, with limits

[Русский](search.md)

Documentation reviewed **2026-11-03**. Search completeness and ranking were not tested. Save the engine, language, region, timestamp, exact query and selected URLs.

- `"bridge inspection"`: an exact phrase can miss inflections and translations.
- `site:example.org bridge`: restrict to a domain; this is not a complete inventory of indexed pages.
- `site:example.org filetype:pdf procurement`: find a format, not a guarantee of authority.
- `"Mayak" -film`: exclude a term; also run the broader query to avoid discarding useful evidence.
- Google: `bridge after:2025-05-01 before:2025-06-01`. Engine dates are not event dates.
- Bing: `"north crossing" OR "northern bridge"`; write `OR` and `NOT` in uppercase.
- Bing: `bridge language:en`; also search in the source language with local terminology.

The example domain is illustrative. Replace it with an appropriate permitted source; no discovery is promised. Avoid putting sensitive personal data in search queries.

Start broad, add one constraint at a time, open the primary page, and preserve its exact passage. A search snippet is neither the whole source nor proof that it remains current. Translate concepts, not just words. Record failed searches with their limits: “not found” is not “does not exist.”

For page history, [Wayback Machine](https://web.archive.org/) may help. Capture time, publication time and event time differ; missing captures do not prove absence. Use the [local training corpus](../assets/case/README.md) if an external service is unavailable. It is not a search-engine emulator. Do not rely on the retired `cache:` workflow.

Sources: [Google](https://support.google.com/websearch/answer/2466433), [Google site operator limits](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site), [Bing](https://support.microsoft.com/en-us/topic/advanced-search-options-b92e25f1-0085-4271-bdf9-14aaea720930).
