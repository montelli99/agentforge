import { Buffer } from "node:buffer";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { inspectPackageZipArchive } from "./providers/marketplace/archiveInspector.js";
import { LocalPackageProvider } from "./providers/marketplace/localPackageProvider.js";
import type { PackageManifest } from "./core/types/package.js";

interface ZipFixtureEntry {
  path: string;
  data?: string;
  mode?: number;
  declaredUncompressedBytes?: number;
  zip64Extra?: boolean;
  dataDescriptor?: boolean;
  deflate?: boolean;
}

function fixtureCrc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeStoredZip(files: ZipFixtureEntry[]): Buffer {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, "utf-8");
    const data = Buffer.from(file.data ?? "fixture", "utf-8");
    const compressed = file.deflate ? deflateRawSync(data) : data;
    const checksum = fixtureCrc32(data);
    const uncompressedBytes = file.declaredUncompressedBytes ?? data.length;
    const flags = 0x0800 | (file.dataDescriptor ? 0x0008 : 0);
    const extra = file.zip64Extra ? Buffer.from([1, 0, 0, 0]) : Buffer.alloc(0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(file.deflate ? 8 : 0, 8);
    local.writeUInt32LE(file.dataDescriptor ? 0 : compressed.length, 18);
    local.writeUInt32LE(file.dataDescriptor ? 0 : uncompressedBytes, 22);
    local.writeUInt32LE(file.dataDescriptor ? 0 : checksum, 14);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    localRecords.push(local, name, extra, compressed);
    if (file.dataDescriptor) {
      const descriptor = Buffer.alloc(16);
      descriptor.writeUInt32LE(0x08074b50, 0);
      descriptor.writeUInt32LE(checksum, 4);
      descriptor.writeUInt32LE(compressed.length, 8);
      descriptor.writeUInt32LE(uncompressedBytes, 12);
      localRecords.push(descriptor);
    }

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(file.deflate ? 8 : 0, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(uncompressedBytes, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(((file.mode ?? 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralRecords.push(central, name, extra);
    localOffset += local.length + name.length + extra.length + compressed.length + (file.dataDescriptor ? 16 : 0);
  }

  const centralBytes = Buffer.concat(centralRecords);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localRecords, centralBytes, eocd]);
}

const manifest: PackageManifest = {
  schemaVersion: "1.0.0",
  name: "fixture",
  version: "1.0.0",
  publisher: { id: "fixture-publisher", name: "Fixture Publisher" },
  description: "Archive inspection fixture",
  license: "UNLICENSED",
  agentforgeVersion: "*",
  capabilities: [{ id: "cap-fixture", name: "Fixture", description: "Test capability", type: "tool" }],
  permissions: {},
};

describe("marketplace ZIP archive inspection", () => {
  it("accepts a bounded ZIP whose files match the manifest", () => {
    const archive = makeStoredZip([{ path: "manifest.json" }, { path: "tools/readme.md" }]);
    const result = new LocalPackageProvider().inspectPackageArchive({
      ...manifest,
      files: ["manifest.json", "tools/readme.md"],
      sizeBytes: archive.length,
    }, archive);

    expect(result.valid).toBe(true);
    expect(result.entries.map(entry => entry.path)).toEqual(["manifest.json", "tools/readme.md"]);
  });

  it.each([
    ["parent traversal", [{ path: "../escape.txt" }], "Unsafe ZIP entry path"],
    ["absolute path", [{ path: "/rooted.txt" }], "Unsafe ZIP entry path"],
    ["duplicate case-folded path", [{ path: "Readme.md" }, { path: "README.md" }], "Duplicate ZIP entry path"],
    ["Unix symbolic link", [{ path: "link", data: "../../outside", mode: 0o120777 }], "Symbolic links are not accepted"],
    ["executable mode", [{ path: "run.sh", mode: 0o100755 }], "Executable file permissions are not accepted"],
    ["forbidden binary", [{ path: "payload.exe" }], "Forbidden executable or binary file"],
    ["oversized expanded entry", [{ path: "large.dat", declaredUncompressedBytes: 101 * 1024 * 1024 }], "expanded-size limit"],
    ["high expansion ratio", [{ path: "compressed.dat", declaredUncompressedBytes: 2_000_000 }], "compression ratio"],
  ] as const)("rejects %s", (_label, entries, expectedError) => {
    const result = inspectPackageZipArchive(makeStoredZip([...entries]));
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain(expectedError);
  });

  it("rejects manifest/archive file mismatches and malformed central headers", () => {
    const provider = new LocalPackageProvider();
    const archive = makeStoredZip([{ path: "actual.txt" }]);
    const mismatch = provider.inspectPackageArchive({ ...manifest, files: ["missing.txt"] }, archive);
    expect(mismatch.valid).toBe(false);
    expect(mismatch.errors.join("\n")).toContain("Manifest file is missing from archive");
    expect(mismatch.errors.join("\n")).toContain("Archive contains an undeclared file");

    const malformed = Buffer.from(archive);
    malformed.writeUInt32LE(0, 0);
    expect(inspectPackageZipArchive(malformed).valid).toBe(false);
  });

  it("rejects duplicate manifest file paths even when case differs", () => {
    const result = new LocalPackageProvider().inspectPackageArchive({
      ...manifest,
      files: ["Readme.md", "README.md"],
    }, makeStoredZip([{ path: "README.md" }]));
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("Duplicate package file path");

    const malformed = new LocalPackageProvider().inspectPackageArchive({
      ...manifest,
      files: [17] as unknown as string[],
    }, makeStoredZip([{ path: "README.md" }]));
    expect(malformed.valid).toBe(false);
    expect(malformed.errors.join("\n")).toContain("Package files must be an array of strings");
  });

  it("rejects ZIP64 extras and local/central size disagreement", () => {
    expect(inspectPackageZipArchive(makeStoredZip([{ path: "zip64.txt", zip64Extra: true }])).errors.join("\n"))
      .toContain("ZIP64");

    const mismatched = makeStoredZip([{ path: "size.txt" }]);
    mismatched.writeUInt32LE(99, 18);
    expect(inspectPackageZipArchive(mismatched).errors.join("\n")).toContain("local and central sizes disagree");
  });

  it("rejects overlapping local records and validates data descriptors", () => {
    const overlapping = makeStoredZip([{ path: "one.txt" }, { path: "two.txt" }]);
    const centralOffset = overlapping.readUInt32LE(overlapping.length - 22 + 16);
    const secondCentral = centralOffset + 46 + Buffer.byteLength("one.txt");
    overlapping.writeUInt32LE(0, secondCentral + 42);
    expect(inspectPackageZipArchive(overlapping).errors.join("\n")).toContain("Overlapping ZIP local records");

    const descriptor = makeStoredZip([{ path: "descriptor.txt", dataDescriptor: true }]);
    expect(inspectPackageZipArchive(descriptor).valid).toBe(true);
    const descriptorOffset = descriptor.readUInt32LE(descriptor.length - 22 + 16) - 16;
    descriptor.writeUInt32LE(99, descriptorOffset + 8);
    expect(inspectPackageZipArchive(descriptor).errors.join("\n")).toContain("data descriptor sizes disagree");
  });

  it("inflates bounded deflate content and rejects CRC corruption", () => {
    const deflated = makeStoredZip([{ path: "compressed.txt", data: "A long repeated test string. ".repeat(200), deflate: true }]);
    expect(inspectPackageZipArchive(deflated).valid).toBe(true);

    const corrupt = makeStoredZip([{ path: "bad-crc.txt" }]);
    const dataStart = 30 + Buffer.byteLength("bad-crc.txt");
    corrupt[dataStart] ^= 1;
    expect(inspectPackageZipArchive(corrupt).errors.join("\n")).toContain("CRC verification failed");
  });
});
