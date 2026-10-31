# Building ZotSight

The install ZIP and companion source ZIP are released together. The source ZIP includes the shipped native worker assets as well as their pinned upstream sources and model weights. It contains no user documents or reading caches.

To build the plugin from the source ZIP, use Node.js 22 or newer:

```sh
npm ci
npm test
npm run package
```

The results are `dist/ZotSight-0.1.0.zip` and `dist/ZotSight-0.1.0-source.zip`. Install the complete `zotsight` folder, including `vendor/` and `licenses/`.

## Native processor

`vendor/zotero-document-worker/` contains the unmodified runtime shipped in Zotero 10.0.6. `vendor/sources.json` identifies the exact upstream revisions and source archive hashes. The corresponding source is arranged under `vendor/upstream-sources/document-worker/`, with `pdf.js/` and `structured-document-text/` in their expected submodule locations. The original reader renderer is under `vendor/upstream-sources/reader/`; ZotSight's adapted copy is `vendor/zotero-reader/renderer.ts`.

To modify and rebuild the document worker, use a system with Node.js, Bash, and rsync:

```sh
cd vendor/upstream-sources/document-worker
npm ci
npm run build
```

Copy the contents of its `build/` directory into `vendor/zotero-document-worker/`, preserving the `COPYING` notice, and rebuild ZotSight. No ZotSight patches are applied to the native worker. The upstream scripts copy the ONNX models and ONNX Runtime WASM into the build output. The model weights are included in the upstream source tree.

`python scripts/prepare-zotero-sources.py` can fetch the same pinned source and license notices again. It omits upstream test PDFs and demo documents; all source and build files used by the distributed processor are retained. Dependency versions and integrity values are recorded in the upstream package lock.

## Document translation and local speech

The translation module is built into `main.js`. Its Python helpers and pinned dependency lists ship under `modules/document-translation/backend/`; Python environments and jobs are created at runtime and are excluded from distribution archives. Backend tests can be run with an environment containing the base dependencies:

```sh
python -m unittest discover -s modules/document-translation/backend -p "test_*.py"
```

Local speech uses the pinned Zotero reader sources together with sentencex-ts and eld. The source archive includes the upstream voice/segmentation code, the adapted host copies, both library source distributions and their licenses. No cloud TTS engine or voice model is required.
