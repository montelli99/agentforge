import { Buffer } from "node:buffer";
import { inflateRawSync } from "node:zlib";

export interface InspectedArchiveEntry {
  path: string;
  compressedBytes: number;
  uncompressedBytes: number;
  directory: boolean;
}

export interface ArchiveInspection {
  valid: boolean;
  errors: string[];
  entries: InspectedArchiveEntry[];
  compressedBytes: number;
  uncompressedBytes: number;
}

const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_ENTRY_COUNT = 2_000;
const MAX_ENTRY_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1_000;
const MAX_EOCD_SEARCH_BYTES = 22 + 65_535;
const FORBIDDEN_BINARY_EXTENSIONS = new Set([".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".ps1", ".vbs"]);
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function safeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0") || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  return normalized.split("/").every(segment => segment !== "" && segment !== "." && segment !== ".."
    && !segment.endsWith(".") && !segment.endsWith(" ")
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment));
}

function decodeName(bytes: Buffer, flags: number): string | undefined {
  try {
    if (flags & 0x0800) return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (bytes.some(byte => byte > 0x7f)) return undefined;
    return bytes.toString("ascii");
  } catch {
    return undefined;
  }
}

function invalid(errors: string[]): ArchiveInspection {
  return { valid: false, errors, entries: [], compressedBytes: 0, uncompressedBytes: 0 };
}

function hasMalformedOrZip64Extra(bytes: Buffer, start: number, length: number): boolean {
  const end = start + length;
  if (end > bytes.byteLength) return true;
  let cursor = start;
  while (cursor < end) {
    if (cursor + 4 > end) return true;
    const id = bytes.readUInt16LE(cursor);
    const size = bytes.readUInt16LE(cursor + 2);
    if (cursor + 4 + size > end || id === 0x0001) return true;
    cursor += 4 + size;
  }
  return cursor !== end;
}

/**
 * Inspects ZIP metadata and verifies bounded file contents in memory without writing files.
 * ZIP64, multi-disk archives, encryption, special files, and ambiguous names fail closed.
 */
export function inspectPackageZipArchive(input: Uint8Array): ArchiveInspection {
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.byteLength < 22) return invalid(["Archive is too small to contain a ZIP end record."]);
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) return invalid(["Archive exceeds the " + MAX_ARCHIVE_BYTES + "-byte limit."]);

  const searchStart = Math.max(0, bytes.byteLength - MAX_EOCD_SEARCH_BYTES);
  let eocdOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= searchStart; offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) return invalid(["ZIP end-of-central-directory record was not found."]);

  const diskNumber = bytes.readUInt16LE(eocdOffset + 4);
  const centralDisk = bytes.readUInt16LE(eocdOffset + 6);
  const diskEntryCount = bytes.readUInt16LE(eocdOffset + 8);
  const entryCount = bytes.readUInt16LE(eocdOffset + 10);
  const centralSize = bytes.readUInt32LE(eocdOffset + 12);
  const centralOffset = bytes.readUInt32LE(eocdOffset + 16);
  const commentLength = bytes.readUInt16LE(eocdOffset + 20);
  if (eocdOffset + 22 + commentLength !== bytes.byteLength) return invalid(["ZIP end record has an invalid comment length or trailing data."]);
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntryCount !== entryCount) {
    return invalid(["Multi-disk ZIP archives are not supported."]);
  }
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    return invalid(["ZIP64 archives are not supported by the bounded package inspector."]);
  }
  if (entryCount === 0 || entryCount > MAX_ENTRY_COUNT) {
    return invalid(["Archive entry count must be between 1 and " + MAX_ENTRY_COUNT + "."]);
  }
  if (centralOffset + centralSize !== eocdOffset || centralOffset > bytes.byteLength) {
    return invalid(["ZIP central directory bounds are invalid."]);
  }

  const errors: string[] = [];
  const entries: InspectedArchiveEntry[] = [];
  const localSpans: Array<{ start: number; end: number; path: string }> = [];
  const names = new Set<string>();
  let cursor = centralOffset;
  let totalUncompressedBytes = 0;

  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > eocdOffset || bytes.readUInt32LE(cursor) !== 0x02014b50) {
      return invalid(["ZIP central directory contains a malformed entry header."]);
    }
    const versionMadeBy = bytes.readUInt16LE(cursor + 4);
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const expectedCrc = bytes.readUInt32LE(cursor + 16);
    const compressedBytes = bytes.readUInt32LE(cursor + 20);
    const uncompressedBytes = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const entryCommentLength = bytes.readUInt16LE(cursor + 32);
    const startDisk = bytes.readUInt16LE(cursor + 34);
    const externalAttributes = bytes.readUInt32LE(cursor + 38);
    const localHeaderOffset = bytes.readUInt32LE(cursor + 42);
    const endOfEntry = cursor + 46 + nameLength + extraLength + entryCommentLength;
    if (endOfEntry > eocdOffset || startDisk !== 0) return invalid(["ZIP entry metadata extends beyond the central directory or references another disk."]);
    if (hasMalformedOrZip64Extra(bytes, cursor + 46 + nameLength, extraLength)) {
      errors.push("Malformed ZIP extras or ZIP64 entries are not accepted.");
    }
    if (flags & 0x0001) errors.push("Encrypted ZIP entries are not accepted.");
    if (method !== 0 && method !== 8) errors.push("Unsupported ZIP compression method " + method + ".");
    if (compressedBytes === 0 && uncompressedBytes > 0) errors.push("ZIP entry has data but declares a zero compressed size.");
    if (uncompressedBytes > MAX_ENTRY_UNCOMPRESSED_BYTES) errors.push("ZIP entry exceeds the " + MAX_ENTRY_UNCOMPRESSED_BYTES + "-byte expanded-size limit.");
    if (compressedBytes > 0 && uncompressedBytes > 1_000_000 && uncompressedBytes / compressedBytes > MAX_COMPRESSION_RATIO) {
      errors.push("ZIP entry compression ratio exceeds " + MAX_COMPRESSION_RATIO + ":1.");
    }

    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = decodeName(nameBytes, flags);
    if (!name) {
      errors.push("ZIP entry names must be valid UTF-8 or ASCII.");
      cursor = endOfEntry;
      continue;
    }
    const directory = name.endsWith("/");
    const normalizedName = directory ? name.slice(0, -1) : name;
    if (!safeRelativePath(normalizedName)) errors.push("Unsafe ZIP entry path: " + name);
    const normalizedKey = normalizedName.replaceAll("\\", "/").toLowerCase();
    if (names.has(normalizedKey)) errors.push("Duplicate ZIP entry path: " + name);
    names.add(normalizedKey);
    const extension = normalizedName.slice(normalizedName.lastIndexOf(".")).toLowerCase();
    if (!directory && FORBIDDEN_BINARY_EXTENSIONS.has(extension)) errors.push("Forbidden executable or binary file in archive: " + name);

    const hostSystem = versionMadeBy >>> 8;
    const unixMode = externalAttributes >>> 16;
    if (hostSystem === 3) {
      const fileType = unixMode & 0xf000;
      if (fileType === 0xa000) errors.push("Symbolic links are not accepted in package archives: " + name);
      else if (fileType !== 0 && fileType !== 0x8000 && fileType !== 0x4000) errors.push("Special filesystem objects are not accepted in package archives: " + name);
      if (unixMode & 0o111) errors.push("Executable file permissions are not accepted in package archives: " + name);
      if (directory && fileType !== 0 && fileType !== 0x4000) errors.push("Directory path has a non-directory file type: " + name);
      if (!directory && fileType === 0x4000) errors.push("File path has a directory file type: " + name);
    }

    if (localHeaderOffset + 30 > centralOffset || bytes.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      errors.push("ZIP local header is invalid for: " + name);
    } else {
      const localFlags = bytes.readUInt16LE(localHeaderOffset + 6);
      const localMethod = bytes.readUInt16LE(localHeaderOffset + 8);
      const localCrc = bytes.readUInt32LE(localHeaderOffset + 14);
      const localNameLength = bytes.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataOffset + compressedBytes;
      const localName = bytes.subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLength);
      if (localHeaderOffset + 30 + localNameLength + localExtraLength > centralOffset
        || hasMalformedOrZip64Extra(bytes, localHeaderOffset + 30 + localNameLength, localExtraLength)) {
        errors.push("Malformed local ZIP extra data for: " + name);
      }
      const localCompressedBytes = bytes.readUInt32LE(localHeaderOffset + 18);
      const localUncompressedBytes = bytes.readUInt32LE(localHeaderOffset + 22);
      if (localFlags !== flags || localMethod !== method || !localName.equals(nameBytes)) {
        errors.push("ZIP local and central headers disagree for: " + name);
      }
      if (!(flags & 0x0008) && (localCompressedBytes !== compressedBytes || localUncompressedBytes !== uncompressedBytes)) {
        errors.push("ZIP local and central sizes disagree for: " + name);
      }
      if (!(flags & 0x0008) && localCrc !== expectedCrc) errors.push("ZIP local and central CRC values disagree for: " + name);
      if (dataOffset > centralOffset || dataEnd > centralOffset) errors.push("ZIP compressed data exceeds archive bounds for: " + name);
      let spanEnd = dataEnd;
      if (flags & 0x0008) {
        let descriptorOffset = dataEnd;
        if (descriptorOffset + 4 <= centralOffset && bytes.readUInt32LE(descriptorOffset) === 0x08074b50) descriptorOffset += 4;
        if (descriptorOffset + 12 > centralOffset) {
          errors.push("ZIP data descriptor exceeds archive bounds for: " + name);
        } else {
          const descriptorCrc = bytes.readUInt32LE(descriptorOffset);
          const descriptorCompressed = bytes.readUInt32LE(descriptorOffset + 4);
          const descriptorUncompressed = bytes.readUInt32LE(descriptorOffset + 8);
          if (descriptorCrc !== expectedCrc) errors.push("ZIP data descriptor CRC disagrees with the central directory for: " + name);
          if (descriptorCompressed !== compressedBytes || descriptorUncompressed !== uncompressedBytes) {
            errors.push("ZIP data descriptor sizes disagree with the central directory for: " + name);
          }
          spanEnd = descriptorOffset + 12;
        }
      }
      localSpans.push({ start: localHeaderOffset, end: spanEnd, path: name });

      if (dataOffset <= centralOffset && dataEnd <= centralOffset && compressedBytes <= bytes.byteLength
        && totalUncompressedBytes + uncompressedBytes <= MAX_TOTAL_UNCOMPRESSED_BYTES
        && uncompressedBytes <= MAX_ENTRY_UNCOMPRESSED_BYTES && (method === 0 || method === 8)) {
        try {
          const compressedData = bytes.subarray(dataOffset, dataEnd);
          const content = method === 0
            ? compressedData
            : inflateRawSync(compressedData, { maxOutputLength: MAX_ENTRY_UNCOMPRESSED_BYTES });
          if (content.byteLength !== uncompressedBytes) errors.push("ZIP entry expanded size disagrees with its declaration: " + name);
          if (crc32(content) !== expectedCrc) errors.push("ZIP entry CRC verification failed: " + name);
        } catch {
          errors.push("ZIP entry content is malformed or exceeds the bounded expansion limit: " + name);
        }
      }
    }

    totalUncompressedBytes += uncompressedBytes;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      errors.push("Archive expanded size exceeds the " + MAX_TOTAL_UNCOMPRESSED_BYTES + "-byte total limit.");
    }
    entries.push({ path: normalizedName, compressedBytes, uncompressedBytes, directory });
    cursor = endOfEntry;
  }

  if (cursor !== centralOffset + centralSize) errors.push("ZIP central-directory entry count or size does not match its end record.");
  localSpans.sort((left, right) => left.start - right.start);
  for (let index = 1; index < localSpans.length; index++) {
    if (localSpans[index].start < localSpans[index - 1].end) {
      errors.push("Overlapping ZIP local records are not accepted: " + localSpans[index - 1].path + " and " + localSpans[index].path);
    }
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    entries,
    compressedBytes: bytes.byteLength,
    uncompressedBytes: totalUncompressedBytes,
  };
}
