# Sources for the applied tool track

Checked on **2026-11-03**. This is a record of source reading and actual local execution, not a comparative benchmark or a claim that any product is universally “best”. No live private persons were queried. Tool scope and status are shown on the learner-facing toolkit page.

## Executed media workflow

Actual installed versions: **ExifTool 13.50**, **FFmpeg 8.1**, **FFprobe 8.1**, macOS arm64. The commands in the new media lab were executed against the original synthetic course files. JSON metadata and stream reports were parsed; frames requested at 0, 2 and 4 seconds were extracted and visually reviewed. Commands, outputs and hashes are in [qa-practical-media.json](evidence/qa-practical-media.json). Installation flows and other operating systems were not executed.

- [ExifTool installation](https://exiftool.org/install.html), HTTP 200. Read standalone Perl distribution, macOS package and Windows executable instructions. Windows companion `exiftool_files` directory must be kept with the executable where applicable. Reading the installation instructions is not a test of these installation paths.
- [ExifTool command documentation](https://exiftool.org/exiftool_pod.html), HTTP 200. Read JSON output, group names, duplicate tags and named-field selection. Metadata values remain editable; an absent requested field is not inferred to contain a zero value.
- [FFmpeg n8.1 ffmpeg.texi](https://github.com/FFmpeg/FFmpeg/blob/n8.1/doc/ffmpeg.texi), raw official source HTTP 200. Read seek-position semantics, video frame count and no-overwrite option. No package or fork was substituted for the upstream command.
- [FFmpeg n8.1 ffprobe.texi](https://github.com/FFmpeg/FFmpeg/blob/n8.1/doc/ffprobe.texi), raw official source HTTP 200. Read `show_entries` and output writers.
- Direct requests to [FFmpeg Download](https://ffmpeg.org/download.html), [FFmpeg command manual](https://ffmpeg.org/ffmpeg.html) and [FFprobe manual](https://ffmpeg.org/ffprobe.html) failed with TLS EOF or handshake timeouts in this environment. The download page is retained as the official installation entry point; it was not reported as a successfully inspected download flow. The command reference was verified through the upstream GitHub tag instead.

The actual extracted frames showed a striped barrier at 0 s, no barrier at 2 s, and two drawn pedestrian figures plus a barrier at 4 s. The `TEST / NO CARS` label appears in all three frames; it must not be treated as a unique event appearing only at 2 s. A selected-frame sample does not cover every time in a video.

## Public-profile tools

- [Maigret README](https://github.com/soxoj/maigret/blob/main/README.md), raw official source HTTP 200. The project describes username enumeration, additional page data, reports and recursive search. Upstream marketing claims, AI-generated interpretations, sponsor advertisements and site-count claims were not adopted as verified course outcomes. The dedicated Maigret lab maintains its own version and execution record.
- [Sherlock repository](https://github.com/sherlock-project/sherlock), GitHub API HTTP 200, `archived=false` at time of reading. The README API returned [docs/README.md](https://github.com/sherlock-project/sherlock/blob/master/docs/README.md). Root-level raw `master/README.md` and `v0.16.2/README.md` returned 404; this does not mean the project was unavailable. The existing Sherlock lab and its separate execution record are the basis for the runtime claim, not these metadata calls.

## Additional local analysis tools — documentation only

- [OpenRefine running instructions](https://openrefine.org/docs/manual/running), HTTP 200. Basic work uses a local web server and does not require internet access after installation; reconciliation or enrichment can have separate network behavior.
- [OpenRefine cell editing and clustering](https://openrefine.org/docs/manual/cellediting), HTTP 200. Clustering proposes similar cell values and requires the operator to approve merges; similarity is not evidence of entity identity. The toolkit's small CSV exercise is based on these instructions. No OpenRefine UI execution is claimed.
- [OpenRefine license](https://github.com/OpenRefine/OpenRefine/blob/master/LICENSE.txt), raw source HTTP 200; BSD conditions read.
- [Gephi CSV import](https://docs.gephi.org/desktop/User_Manual/Import/CSV_Format/), HTTP 200. Edge imports require `Source` and `Target`; documented Data Laboratory import steps read. No Gephi UI execution is claimed.
- [Gephi licensing](https://github.com/gephi/gephi/blob/master/COPYING.txt), raw source HTTP 200; main code dual CDDL 1.0 / GPL v3 terms read. Other components can have their own terms.

## Web services and optional infrastructure framework

- [Wayback Machine guide](https://help.archive.org/help/using-the-wayback-machine/), HTTP 200. URL/site search, captures and archival omissions read. No claim of full-text or complete historical coverage.
- [Google image search help](https://support.google.com/websearch/answer/1325808), HTTP 200. Upload, similar images and web-page results read. No external image upload or reverse-image search was performed. The service is not labelled open-source software.
- [ICANN RDAP](https://www.icann.org/en/contracted-parties/registry-operators/resources/registration-data-access-protocol), HTTP 200. Registration-data access read; omitted/redacted registrant data must not be inferred. No live domain lookup added by this work.
- [SpiderFoot README](https://github.com/smicallef/spiderfoot/blob/master/README.md), raw official source HTTP 200. Open-source MIT framework, module choices and integrations read. The list contains free and tiered APIs and modules with different network behavior. Its open-source availability does not make every source free or every execution passive. No installation, scan, effectiveness benchmark or live service availability was tested.

Selection is task-based: profile candidates, file metadata, video frames, tabular data, relationship provenance and archival history. Free/open-source applications are explicitly separated from free web services and optional paid integrations. Documentary reachability is not reported as functional runtime validation.
