# Photo and video verification checklist

[Русский](media-checklist.md)

**Before searching:** define whether you are checking the scene, location, time, author or caption. Confirm that access, saving and reuse are permitted. Avoid uploading sensitive material to external services without a proper basis. Preserve the source URL, post ID, access timestamp, context, original file and hash; work on a copy.

**Images:** describe observable details before identifying them. Search the full image and distinctive crops using permitted reverse-search services; coverage varies. Find earlier appearances and compare geometry, cropping and stable details. Read EXIF locally: metadata is editable, missing GPS is inconclusive, and a time without an offset is not UTC. Test more than one location candidate.

**Video:** preserve duration and frame positions. Inspect scene changes as well as regularly spaced frames. Search each relevant scene separately. Note cuts, time jumps, audio changes and overlays without assuming malicious intent. Clip position and frame rate do not establish recording time; a few frames do not prove continuity.

**Before reporting:** separate visible content from the caption. Check that corroborating sources are independent. Record contradictions and unknowns. Give distinct confidence assessments for location, time and scene content.

AI detectors are not binary truth machines. [C2PA](https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) can help assess asserted provenance and editing history, not factual truth. Missing credentials do not prove fabrication.

Free local practice uses [original synthetic images and frames](../assets/case/README.md). Optional tools: [ExifTool](https://exiftool.org/), [FFmpeg](https://ffmpeg.org/ffmpeg.html); reverse-search alternatives include Google Lens and Bing Visual Search. Documentation reviewed 2026-11-03; live service completeness was not tested.
