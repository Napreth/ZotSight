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

The worker also bundles dom-serializer, domelementtype, domhandler, domutils, entities, fastest-levenshtein, fflate, htmlparser2, and pako. Their license texts are retained under `licenses/`. PDF.js font, CMap, JPEG 2000, and JBIG2 notices are retained under `licenses/pdfjs/`.
