# Rights and provenance

## Original material

Course text, synthetic company/payment/post records, the map and scene diagrams, JPEG illustrations, six-second video and logo were created for Evidence First OSINT. They are licensed CC BY 4.0. The images were drawn programmatically; they are not photographs of real subjects. The video is an assembly of synthetic frames. See [dataset provenance](docs/assets/case/README.md) and its [SHA-256 manifest](docs/assets/case/manifest.json).

The case generator uses system fonts only when rendering labels. Font binaries are not distributed. Rebuilding on another system may change pixels and hashes. The website uses local system fonts and does not fetch web fonts.

## External research references

The repository contains links, original commentary and short attributed quotations identifying comparison resources in [research/landscape.md](research/landscape.md) and [research/evidence/observations.json](research/evidence/observations.json). Those excerpts retain their original copyright; the content license does not relicense them. Full external pages, books, screenshots, map tiles, photographs and registry exports are not bundled.

## Site dependencies

- [MkDocs](https://github.com/mkdocs/mkdocs/blob/master/LICENSE): BSD-2-Clause.
- [Material for MkDocs](https://github.com/squidfunk/mkdocs-material/blob/master/LICENSE): MIT; its packaged dependencies and icons retain their notices.
- [Pillow](https://github.com/python-pillow/Pillow/blob/main/LICENSE): HPND; used for fixture generation and inspection, not required for the learner's manual route.
- [Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/): MIT; used for quality checks.
- [FFmpeg](https://ffmpeg.org/legal.html): licensing depends on build configuration. Used as a local generation/checking tool, not distributed in this repository.

Dependency packages are obtained during installation; their own license files remain authoritative. The rendered site includes packaged assets from MkDocs Material. Its MIT notice is retained below.

## Material for MkDocs notice

Copyright (c) 2016-2025 Martin Donath <martin.donath@squidfunk.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
