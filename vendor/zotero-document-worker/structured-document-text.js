"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// structured-document-text/src/read.js
var read_exports = {};
__export(read_exports, {
  SDT_PACK_VERSION: () => SDT_PACK_VERSION,
  SDT_SCHEMA_VERSION: () => SDT_SCHEMA_VERSION,
  getLogicalBlockText: () => getLogicalBlockText,
  openStructuredDocumentTextPack: () => openStructuredDocumentTextPack
});
module.exports = __toCommonJS(read_exports);

// structured-document-text/src/pack/bytes.js
function toUint8Array(bytes) {
  if (ArrayBuffer.isView(bytes)) {
    return isUint8Array(bytes) && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  if (isArrayBuffer(bytes)) {
    return new Uint8Array(bytes);
  }
  throw new TypeError("Expected Uint8Array or ArrayBuffer");
}
function isByteBuffer(bytes) {
  return isArrayBuffer(bytes) || ArrayBuffer.isView(bytes);
}
function isArrayBuffer(bytes) {
  return Object.prototype.toString.call(bytes) === "[object ArrayBuffer]";
}
function isUint8Array(bytes) {
  return Object.prototype.toString.call(bytes) === "[object Uint8Array]";
}
function readU32LE(bytes, offset) {
  return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216 >>> 0;
}
function decodeU32Array(bytes, offset, length) {
  let values = new Array(length);
  for (let i = 0; i < length; i++) {
    values[i] = readU32LE(bytes, offset + i * 4);
  }
  return values;
}

// structured-document-text/src/pack/chunk.js
var OFFSET_BYTES = 4;
function getBlockBytesFromContentChunk(chunkBytes, blockCount, localBlockIndex) {
  chunkBytes = toUint8Array(chunkBytes);
  validateBlockCount(blockCount);
  if (!Number.isInteger(localBlockIndex) || localBlockIndex < 0 || localBlockIndex >= blockCount) {
    throw new RangeError(`Invalid local block index: ${localBlockIndex}`);
  }
  let headerByteLength = blockCount * OFFSET_BYTES;
  if (chunkBytes.byteLength < headerByteLength) {
    throw new Error("Invalid SDTPack content chunk offset table");
  }
  let start = readU32LE(chunkBytes, localBlockIndex * OFFSET_BYTES);
  let end = localBlockIndex + 1 < blockCount ? readU32LE(chunkBytes, (localBlockIndex + 1) * OFFSET_BYTES) : chunkBytes.byteLength - headerByteLength;
  if (start > end || headerByteLength + end > chunkBytes.byteLength) {
    throw new Error("Invalid SDTPack content chunk block range");
  }
  return chunkBytes.subarray(headerByteLength + start, headerByteLength + end);
}
function validateBlockCount(blockCount) {
  if (!Number.isInteger(blockCount) || blockCount < 0) {
    throw new RangeError(`Invalid SDTPack content chunk block count: ${blockCount}`);
  }
}

// structured-document-text/src/range.js
function getContentRangeBlockSpan(contentRange, topLevelBlockCount) {
  if (!isContentRange(contentRange) || !Number.isInteger(topLevelBlockCount) || topLevelBlockCount < 0) {
    return null;
  }
  const start = contentRange[0];
  const end = contentRange[1];
  const startIndex = getBoundaryTopLevelIndex(start, topLevelBlockCount);
  if (startIndex === null) {
    return null;
  }
  if (sameBoundary(start, end)) {
    return { startIndex, endIndexExclusive: startIndex };
  }
  const endIndexExclusive = getBoundaryEndIndexExclusive(end, topLevelBlockCount);
  if (endIndexExclusive === null) {
    return null;
  }
  return {
    startIndex,
    endIndexExclusive: Math.max(startIndex, endIndexExclusive)
  };
}
function isContentRange(value) {
  return Array.isArray(value) && value.length === 2 && isContentBoundary(value[0]) && isContentBoundary(value[1]);
}
function isContentBoundary(value) {
  return Array.isArray(value) && value.length > 0 && value.every((index) => Number.isInteger(index) && index >= 0);
}
function refKey(ref) {
  return Array.isArray(ref) ? ref.join(",") : "";
}
function sameBoundary(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]);
}
function getBoundaryTopLevelIndex(boundary, topLevelBlockCount) {
  if (!isContentBoundary(boundary)) {
    return null;
  }
  const index = boundary[0];
  if (index > topLevelBlockCount) {
    return null;
  }
  return index;
}
function getBoundaryEndIndexExclusive(boundary, topLevelBlockCount) {
  const index = getBoundaryTopLevelIndex(boundary, topLevelBlockCount);
  if (index === null) {
    return null;
  }
  if (index === topLevelBlockCount) {
    return topLevelBlockCount;
  }
  return boundary.length === 1 ? index : index + 1;
}

// structured-document-text/src/version.js
var SDT_PACK_VERSION = 1;
var SDT_SCHEMA_VERSION = "1.2.0";

// structured-document-text/src/pack/format.js
var MAGIC = Uint8Array.of(137, 83, 68, 84, 13, 10, 26, 10);
var HEADER_SIZE = 16;
var INDEX_FIXED_SIZE = 8;
var U32_BYTES = 4;
function readHeader(bytes) {
  bytes = toUint8Array(bytes);
  if (bytes.byteLength < HEADER_SIZE) {
    throw new Error("Invalid SDTPack: file too small");
  }
  assertMagic(bytes, 0, MAGIC);
  let packVersion = bytes[8];
  if (packVersion !== SDT_PACK_VERSION) {
    throw new Error(`Unsupported SDTPack version: ${packVersion}`);
  }
  let header = {
    packVersion,
    schemaVersion: `${bytes[9]}.${bytes[10]}.${bytes[11]}`,
    indexLength: readU32LE(bytes, 12)
  };
  if (header.indexLength < INDEX_FIXED_SIZE + U32_BYTES * 2) {
    throw new Error("Invalid SDTPack index length");
  }
  if ((header.indexLength - INDEX_FIXED_SIZE) % (U32_BYTES * 2) !== 0) {
    throw new Error("Invalid SDTPack index length");
  }
  return header;
}
function decodeIndex(bytes) {
  bytes = toUint8Array(bytes);
  if (bytes.byteLength < INDEX_FIXED_SIZE + U32_BYTES * 2) {
    throw new Error("Invalid SDTPack index");
  }
  if ((bytes.byteLength - INDEX_FIXED_SIZE) % (U32_BYTES * 2) !== 0) {
    throw new Error("Invalid SDTPack index length");
  }
  let metadataLength = readU32LE(bytes, 0);
  let catalogLength = readU32LE(bytes, 4);
  let entryCount = (bytes.byteLength - INDEX_FIXED_SIZE) / (U32_BYTES * 2);
  let chunkByteOffsets = decodeU32Array(bytes, INDEX_FIXED_SIZE, entryCount);
  let chunkBlockStarts = decodeU32Array(bytes, INDEX_FIXED_SIZE + entryCount * U32_BYTES, entryCount);
  let index = { metadataLength, catalogLength, chunkByteOffsets, chunkBlockStarts };
  validateIndexShape(index);
  return index;
}
function validatePackLayout(header, index, fileLength) {
  let contentEnd = getContentStart(header, index) + index.chunkByteOffsets[index.chunkByteOffsets.length - 1];
  if (contentEnd !== fileLength) {
    throw new Error("Invalid SDTPack layout outside file");
  }
}
function getMetadataRange(header, index) {
  return {
    offset: HEADER_SIZE + header.indexLength,
    length: index.metadataLength
  };
}
function getCatalogRange(header, index) {
  return {
    offset: HEADER_SIZE + header.indexLength + index.metadataLength,
    length: index.catalogLength
  };
}
function getContentStart(header, index) {
  return HEADER_SIZE + header.indexLength + index.metadataLength + index.catalogLength;
}
function findChunkIndex(chunkBlockStarts, blockIndex) {
  if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= chunkBlockStarts[chunkBlockStarts.length - 1]) {
    return -1;
  }
  let lo = 0;
  let hi = chunkBlockStarts.length - 2;
  while (lo <= hi) {
    let mid = lo + hi >>> 1;
    if (blockIndex < chunkBlockStarts[mid]) {
      hi = mid - 1;
    } else if (blockIndex >= chunkBlockStarts[mid + 1]) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return -1;
}
function validateIndexShape(index) {
  let {
    metadataLength,
    catalogLength,
    chunkByteOffsets,
    chunkBlockStarts
  } = index;
  if (!Number.isInteger(metadataLength) || metadataLength <= 0) {
    throw new Error("Invalid SDTPack metadata length");
  }
  if (!Number.isInteger(catalogLength) || catalogLength <= 0) {
    throw new Error("Invalid SDTPack catalog length");
  }
  if (!Array.isArray(chunkByteOffsets) || !Array.isArray(chunkBlockStarts)) {
    throw new Error("Invalid SDTPack chunk index shape");
  }
  if (chunkByteOffsets.length !== chunkBlockStarts.length || chunkByteOffsets.length === 0) {
    throw new Error("Invalid SDTPack chunk index shape");
  }
  if (chunkByteOffsets[0] !== 0) {
    throw new Error("Invalid SDTPack first chunk offset");
  }
  if (chunkBlockStarts[0] !== 0) {
    throw new Error("Invalid SDTPack chunk block bounds");
  }
  if (chunkByteOffsets.length > 1) {
    assertStrictlyIncreasing(chunkByteOffsets, "chunkByteOffsets");
    assertStrictlyIncreasing(chunkBlockStarts, "chunkBlockStarts");
  }
}
function assertStrictlyIncreasing(values, name) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) {
      throw new Error(`Invalid SDTPack ${name}`);
    }
  }
}
function assertMagic(bytes, offset, magic) {
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) {
      throw new Error("Invalid SDTPack magic");
    }
  }
}

// structured-document-text/src/pack/reader.js
var TEXT_DECODER = new TextDecoder();
var FRONT_MATTER_READ_BYTES = 64 * 1024;
function openStructuredDocumentTextPack(input, options = {}) {
  return StructuredDocumentTextPackReader.open(input, options);
}
var StructuredDocumentTextPackReader = class _StructuredDocumentTextPackReader {
  static async open(input, options = {}) {
    let source = normalizeByteSource(input);
    let inflate = normalizeInflate(options.inflate);
    if (source.byteLength < HEADER_SIZE) {
      throw new Error("Invalid SDTPack: file too small");
    }
    let frontMatterBytes = await readExactly(
      source,
      0,
      Math.min(source.byteLength, FRONT_MATTER_READ_BYTES)
    );
    let header = readHeader(frontMatterBytes);
    if (HEADER_SIZE + header.indexLength > source.byteLength) {
      throw new Error("Invalid SDTPack index bounds");
    }
    let indexEnd = HEADER_SIZE + header.indexLength;
    let indexBytes = indexEnd <= frontMatterBytes.byteLength ? frontMatterBytes.subarray(HEADER_SIZE, indexEnd) : await readExactly(source, HEADER_SIZE, header.indexLength);
    let index = decodeIndex(indexBytes);
    validatePackLayout(header, index, source.byteLength);
    return new _StructuredDocumentTextPackReader(source, header, index, inflate, frontMatterBytes);
  }
  constructor(source, header, index, inflate, frontMatterBytes) {
    this.source = source;
    this.header = header;
    this.index = index;
    this._inflate = inflate;
    this._frontMatterBytes = frontMatterBytes;
    this._metadataPromise = null;
    this._catalogPromise = null;
  }
  async getMetadata() {
    if (!this._metadataPromise) {
      this._metadataPromise = this._readJsonRange(getMetadataRange(this.header, this.index));
    }
    return this._metadataPromise;
  }
  async getCatalog() {
    if (!this._catalogPromise) {
      this._catalogPromise = this._readJsonRange(getCatalogRange(this.header, this.index));
    }
    return this._catalogPromise;
  }
  getTopLevelBlockCount() {
    return this.index.chunkBlockStarts[this.index.chunkBlockStarts.length - 1];
  }
  async getBlock(ref) {
    if (!Array.isArray(ref) || !Number.isInteger(ref[0])) {
      return null;
    }
    let block = await this._getTopLevelBlock(ref[0]);
    if (!block) {
      return null;
    }
    let node = block;
    for (let i = 1; i < ref.length; i++) {
      let index = ref[i];
      if (!Number.isInteger(index) || !node || !Array.isArray(node.content)) {
        return null;
      }
      node = node.content[index];
      if (!node || typeof node !== "object") {
        return null;
      }
    }
    return node;
  }
  async getBlocks(startBlock, endBlock) {
    if (!Number.isInteger(startBlock) || !Number.isInteger(endBlock) || startBlock > endBlock) {
      return [];
    }
    let totalTopLevelBlocks = this.index.chunkBlockStarts[this.index.chunkBlockStarts.length - 1];
    startBlock = Math.max(0, startBlock);
    endBlock = Math.min(totalTopLevelBlocks - 1, endBlock);
    if (startBlock > endBlock) {
      return [];
    }
    let chunkStart = findChunkIndex(this.index.chunkBlockStarts, startBlock);
    let chunkEnd = findChunkIndex(this.index.chunkBlockStarts, endBlock);
    if (chunkStart === -1 || chunkEnd === -1) {
      return [];
    }
    let contentStart = getContentStart(this.header, this.index);
    let compressedStart = this.index.chunkByteOffsets[chunkStart];
    let compressedEnd = this.index.chunkByteOffsets[chunkEnd + 1];
    let compressedBytes = await this._readRange(
      contentStart + compressedStart,
      compressedEnd - compressedStart
    );
    let blocks = [];
    for (let chunkIndex = chunkStart; chunkIndex <= chunkEnd; chunkIndex++) {
      let chunkOffset = this.index.chunkByteOffsets[chunkIndex] - compressedStart;
      let nextChunkOffset = this.index.chunkByteOffsets[chunkIndex + 1] - compressedStart;
      let chunkBytes = this._inflate(compressedBytes.subarray(chunkOffset, nextChunkOffset));
      let firstBlock = this.index.chunkBlockStarts[chunkIndex];
      let blockCount = this.index.chunkBlockStarts[chunkIndex + 1] - firstBlock;
      let localStart = Math.max(startBlock - firstBlock, 0);
      let localEnd = Math.min(endBlock - firstBlock, blockCount - 1);
      for (let local = localStart; local <= localEnd; local++) {
        blocks.push(parseJsonBytes(getBlockBytesFromContentChunk(chunkBytes, blockCount, local)));
      }
    }
    return blocks;
  }
  async getPageBlocks(pageIndex) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) {
      return [];
    }
    let catalog = await this.getCatalog();
    let pages = Array.isArray(catalog?.pages) ? catalog.pages : [];
    let page = pages[pageIndex];
    let totalTopLevelBlocks = this.getTopLevelBlockCount();
    let span = getContentRangeBlockSpan(page?.contentRange, totalTopLevelBlocks);
    if (!span || span.startIndex >= span.endIndexExclusive) {
      return [];
    }
    return this.getBlocks(span.startIndex, span.endIndexExclusive - 1);
  }
  async materialize() {
    let metadata = await this.getMetadata();
    let catalog = await this.getCatalog();
    let content = [];
    let contentLength = this.index.chunkByteOffsets[this.index.chunkByteOffsets.length - 1];
    let compressedContent = contentLength ? await this._readRange(getContentStart(this.header, this.index), contentLength) : new Uint8Array(0);
    for (let chunkIndex = 0; chunkIndex < this.index.chunkByteOffsets.length - 1; chunkIndex++) {
      let chunkOffset = this.index.chunkByteOffsets[chunkIndex];
      let nextChunkOffset = this.index.chunkByteOffsets[chunkIndex + 1];
      let chunkBytes = this._inflate(compressedContent.subarray(chunkOffset, nextChunkOffset));
      let blockCount = this._getChunkBlockCount(chunkIndex);
      for (let local = 0; local < blockCount; local++) {
        content.push(parseJsonBytes(getBlockBytesFromContentChunk(chunkBytes, blockCount, local)));
      }
    }
    return {
      schemaVersion: this.header.schemaVersion,
      metadata,
      catalog,
      content
    };
  }
  async _getTopLevelBlock(blockIndex) {
    let chunkIndex = findChunkIndex(this.index.chunkBlockStarts, blockIndex);
    if (chunkIndex === -1) {
      return null;
    }
    let chunkBytes = await this._readInflatedChunk(chunkIndex);
    let localBlockIndex = blockIndex - this.index.chunkBlockStarts[chunkIndex];
    return parseJsonBytes(getBlockBytesFromContentChunk(
      chunkBytes,
      this._getChunkBlockCount(chunkIndex),
      localBlockIndex
    ));
  }
  async _readInflatedChunk(chunkIndex) {
    let contentStart = getContentStart(this.header, this.index);
    let offset = this.index.chunkByteOffsets[chunkIndex];
    let nextOffset = this.index.chunkByteOffsets[chunkIndex + 1];
    if (offset > nextOffset) {
      throw new Error("Invalid SDTPack chunk bounds");
    }
    return this._inflate(await this._readRange(contentStart + offset, nextOffset - offset));
  }
  _getChunkBlockCount(chunkIndex) {
    return this.index.chunkBlockStarts[chunkIndex + 1] - this.index.chunkBlockStarts[chunkIndex];
  }
  async _readRange(offset, length) {
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > this.source.byteLength) {
      throw new Error("Invalid SDTPack read range");
    }
    if (offset + length <= this._frontMatterBytes.byteLength) {
      return this._frontMatterBytes.subarray(offset, offset + length);
    }
    return readExactly(this.source, offset, length);
  }
  async _readJsonRange({ offset, length }) {
    return parseJsonBytes(this._inflate(await this._readRange(offset, length)));
  }
};
async function readExactly(source, offset, length) {
  let bytes = toUint8Array(await source.read(offset, length));
  if (bytes.byteLength !== length) {
    throw new Error("Short SDTPack read");
  }
  return bytes;
}
function normalizeByteSource(input) {
  if (isByteBuffer(input)) {
    let bytes = toUint8Array(input);
    return {
      byteLength: bytes.byteLength,
      async read(offset, length) {
        return bytes.subarray(offset, offset + length);
      }
    };
  }
  if (input && Number.isInteger(input.byteLength) && input.byteLength >= 0 && typeof input.read === "function") {
    return input;
  }
  throw new TypeError("Expected ArrayBuffer, Uint8Array, or byte source");
}
function normalizeInflate(inflate) {
  if (typeof inflate !== "function") {
    throw new TypeError("Expected SDTPack raw DEFLATE inflate function");
  }
  return (bytes) => toUint8Array(inflate(toUint8Array(bytes)));
}
function parseJsonBytes(bytes) {
  return JSON.parse(TEXT_DECODER.decode(bytes));
}

// structured-document-text/src/pdf/constants.js
var HEADER_LAST_IS_SOFT_HYPHEN = 1 << 0;
var HEADER_DIR_RTL = 1 << 3;

// structured-document-text/src/pdf/decode.js
function parseTextMap(textMap) {
  if (typeof textMap !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(textMap);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// structured-document-text/src/text.js
function getNestedBlockPlainText(node) {
  if (node.text !== void 0) return node.text;
  if (!node.content) return "";
  let hasChildBlock = node.content.some((child) => child.text === void 0);
  if (!hasChildBlock) {
    let result = "";
    for (let child of node.content) {
      if (child.text !== void 0) result += child.text;
    }
    return result;
  }
  let parts = [];
  for (let child of node.content) {
    if (child.text !== void 0) continue;
    let text = getNestedBlockPlainText(child);
    if (text) parts.push(text);
  }
  return parts.join("\n");
}

// structured-document-text/src/parts.js
function getNodeByRef(structure, ref) {
  if (!Array.isArray(ref)) {
    return null;
  }
  let node = { content: structure?.content };
  for (const index of ref) {
    if (!Number.isInteger(index) || !Array.isArray(node?.content)) {
      return null;
    }
    node = node.content[index];
    if (!node || typeof node !== "object") {
      return null;
    }
  }
  return node;
}
function getFirstTextNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (typeof node.text === "string") {
    return node;
  }
  if (!Array.isArray(node.content)) {
    return null;
  }
  for (const child of node.content) {
    const textNode = getFirstTextNode(child);
    if (textNode) {
      return textNode;
    }
  }
  return null;
}
function getLastTextNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (typeof node.text === "string") {
    return node;
  }
  if (!Array.isArray(node.content)) {
    return null;
  }
  for (let i = node.content.length - 1; i >= 0; i--) {
    const textNode = getLastTextNode(node.content[i]);
    if (textNode) {
      return textNode;
    }
  }
  return null;
}
function textNodeEndsWithSoftHyphen(node) {
  const runs = parseTextMap(node?.anchor?.textMap);
  const lastRun = runs.at(-1);
  return Array.isArray(lastRun) && (lastRun[0] & HEADER_LAST_IS_SOFT_HYPHEN) !== 0;
}
function shouldDropHardHyphenAtPartBoundary(prevBlock, nextBlock) {
  const lastNode = getLastTextNode(prevBlock);
  const firstNode = getFirstTextNode(nextBlock);
  const firstChar = firstNode?.text?.charAt(0);
  return typeof lastNode?.text === "string" && lastNode.text.endsWith("-") && firstChar >= "a" && firstChar <= "z";
}
function getPartRoot(structure, ref) {
  let currentRef = Array.isArray(ref) ? [...ref] : null;
  const seen = /* @__PURE__ */ new Set();
  while (currentRef) {
    const key = refKey(currentRef);
    if (seen.has(key)) {
      return currentRef;
    }
    seen.add(key);
    const node = getNodeByRef(structure, currentRef);
    if (!Array.isArray(node?.previousPart)) {
      return currentRef;
    }
    currentRef = [...node.previousPart];
  }
  return null;
}
function getPartChain(structure, ref, options = {}) {
  const include = typeof options.include === "function" ? options.include : null;
  const root = getPartRoot(structure, ref);
  if (!Array.isArray(root)) {
    return [];
  }
  const chain = [];
  const seen = /* @__PURE__ */ new Set();
  let currentRef = [...root];
  while (currentRef) {
    const key = refKey(currentRef);
    if (seen.has(key)) {
      break;
    }
    seen.add(key);
    const node = getNodeByRef(structure, currentRef);
    if (!node) {
      break;
    }
    if (include && !include(currentRef, node)) {
      break;
    }
    chain.push({ ref: currentRef, block: node });
    if (!Array.isArray(node.nextPart)) {
      break;
    }
    currentRef = [...node.nextPart];
  }
  return chain;
}
function getPartBoundarySeparator(prevBlock, nextBlock) {
  const lastNode = getLastTextNode(prevBlock);
  const firstNode = getFirstTextNode(nextBlock);
  if (!lastNode || !firstNode) {
    return "";
  }
  if (/\s$/.test(lastNode.text) || /^\s/.test(firstNode.text)) {
    return "";
  }
  if (textNodeEndsWithSoftHyphen(lastNode)) {
    return "";
  }
  if (/[\p{L}\p{N}]$/u.test(lastNode.text) && /^[\p{L}\p{N}]/u.test(firstNode.text)) {
    return " ";
  }
  return "";
}
function getLogicalBlockText(structure, ref, options = {}) {
  const chain = getPartChain(structure, ref, options);
  if (!chain.length) {
    const block = getNodeByRef(structure, ref);
    return block ? getNestedBlockPlainText(block) : "";
  }
  let text = "";
  for (let i = 0; i < chain.length; i++) {
    const blockText = getNestedBlockPlainText(chain[i].block);
    if (i > 0) {
      if (shouldDropHardHyphenAtPartBoundary(chain[i - 1].block, chain[i].block) && text.endsWith("-")) {
        text = text.slice(0, -1);
      }
      text += getPartBoundarySeparator(chain[i - 1].block, chain[i].block);
    }
    text += blockText;
  }
  return text;
}
