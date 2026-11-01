# Third-party notices

ZotSight is copyright (C) 2026 Napreth. ZotSight's own code is licensed under GNU AGPL version 3 or, at your option, any later version (`AGPL-3.0-or-later`; see `LICENSE`). Third-party components retain their own notices and license terms as listed below.

The companion `ZotSight-0.1.0-source.zip`, provided alongside the install ZIP, contains the corresponding ZotSight sources, native processor sources, model weights, and build instructions. See `BUILDING.md` and `vendor/sources.json` for the exact revisions and archive hashes.

| Component | Source revision | License |
| --- | --- | --- |
| Zotero document-worker | [8fb70af4](https://github.com/zotero/document-worker/tree/8fb70af4000873561c82b2f4eb88be190efb9979) | AGPL-3.0 |
| Zotero reader SDT renderer | [5802d14a](https://github.com/zotero/reader/tree/5802d14a76552e10000124d2431e352e92054f01) | AGPL-3.0 |
| Zotero structured-document-text | [7963c11f](https://github.com/zotero/structured-document-text/tree/7963c11faac4595be3bbe86b7574704a22c67bed) | Included as a submodule of Zotero document-worker under its AGPL distribution |
| Zotero PDF.js fork | [f4d05cae](https://github.com/zotero/pdf.js/tree/f4d05caed86bd38f6ccd2171dbbd5cb832d72912) | Apache-2.0 |
| Microsoft ONNX Runtime 1.27.0 | [Source](https://github.com/microsoft/onnxruntime/tree/v1.27.0) | MIT; additional notices in `licenses/onnxruntime/` |

The native worker and assets were extracted without modification from the official Zotero 10.0.6 desktop distribution. The renderer's imports were adapted for ZotSight; the upstream original is included in the source archive. ZotSight supplies the Obsidian integration, local worker transport, cache, source-coordinate mapping, and reading controls.

ZotSight uses fflate 0.8.2 (MIT) for ZIP compression. Its license is retained under `licenses/`. The worker also bundles dom-serializer, domelementtype, domhandler, domutils, entities, fastest-levenshtein, fflate, htmlparser2, and pako. Their license texts are retained under `licenses/`. PDF.js font, CMap, JPEG 2000, and JBIG2 notices are retained under `licenses/pdfjs/`.

## Local read aloud

The local voice provider, speech controller, SDT sentence builder and supporting helpers are adapted from the Zotero reader revision listed above. The untouched upstream files are included in `vendor/upstream-sources/reader/`; integration copies are under `vendor/zotero-reader/common/`. ZotSight supplies UI and PDF/reflow highlighting, minimal host/type adapters, and browser speech-error reporting.

Sentence segmentation uses sentencex-ts 0.1.13-ts (MIT); language detection uses eld 2.0.2 (Apache-2.0). Their source distributions are included under `vendor/upstream-sources/tts-libraries/`, and license texts are under `licenses/`. The upstream debounce helper derives from Lodash; its MIT notice is retained in `licenses/lodash/`.

## Document translation

The built-in document translation module is copyright (C) 2026 Napreth, AGPL-3.0-or-later. Python tools are installed separately in their own environments and retain their original licenses. Direct dependencies include pylatexenc 2.11 (MIT), PyMuPDF 1.26.7 / 1.25.2 (AGPL-3.0 or commercial), lxml 6.0.2 (BSD with additional libxml2/libxslt notices), BabelDOC 0.6.4 (AGPL-3.0), and PDFMathTranslate at revision 6e982e2c33ddecd225b8a34af3a61c597f223c77 (AGPL-3.0). Optional classic LaTeXML is distributed under NIST/public-domain notices. The dependency manager can download official latexml-oxide releases (https://github.com/dginev/latexml-oxide); these are not included in the plugin archive, and their licenses and third-party notices are retained alongside the extracted program. Optional portable TeX Live is downloaded from the official CTAN installer and retains its distribution licenses. Validated Python package versions are fixed in `modules/document-translation/backend/requirements-*.lock`.

Optional portable Python is downloaded from the official Python Windows embeddable distribution, with matching pip/venv components from the Python NuGet package. Their bundled licenses are retained in the installation directory. Optional uv is downloaded from official astral-sh/uv releases. Optional pipx is installed through pip into the selected base Python environment and retains its distribution notices. These executables are not included in the plugin archive.

TeX, OCR, model and font resources retain their original notices. The no-key protocol adapters are independent implementations informed by [Translate for Zotero](https://github.com/windingwind/zotero-pdf-translate/tree/2e3d77ddbf3157d8813c61c828957386ab802bdb). Provider access terms are separate from this software license.
