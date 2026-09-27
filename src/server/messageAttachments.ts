import crypto from "node:crypto";
import type { MessageAttachment } from "../core/types/workspace.js";

const mimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain"]);
/** Inline local attachments stay inside the existing durable message snapshot. */
export function parseMessageAttachments(input: unknown): MessageAttachment[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 4) throw new Error("Attach at most four files.");
  let total = 0;
  return input.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid attachment.");
    const value = item as Record<string, unknown>;
    if (typeof value.filename !== "string" || !value.filename.trim() || value.filename.length > 200 ||
        typeof value.mimeType !== "string" || !mimeTypes.has(value.mimeType) ||
        typeof value.base64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64)) {
      throw new Error("Use PNG, JPEG, WebP, PDF, or plain text files.");
    }
    const bytes = Buffer.from(value.base64, "base64");
    total += bytes.length;
    if (!bytes.length || bytes.length > 2 * 1024 * 1024 || total > 4 * 1024 * 1024) throw new Error("Each file must be under 2 MiB; total attachments under 4 MiB.");
    const mime = value.mimeType;
    const valid = mime === "text/plain" ||
      (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
      (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
      (mime === "image/webp" && bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP") ||
      (mime === "application/pdf" && bytes.toString("ascii",0,5) === "%PDF-");
    if (!valid) throw new Error("Attachment content does not match its file type.");
    return { id: crypto.randomUUID(), filename: value.filename.replace(/[\\/\x00-\x1f]/g, "_"), mimeType: mime,
      sizeBytes: bytes.length, url: `data:${mime};base64,${bytes.toString("base64")}`, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
  });
}
