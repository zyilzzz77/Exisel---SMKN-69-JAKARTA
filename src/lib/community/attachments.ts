import "server-only";

import path from "node:path";

export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "mp4",
  "webm",
  "mov",
] as const;

export const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function attachmentUploadDir() {
  const root = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  return path.join(root, "community");
}

export function attachmentExtension(filename: string) {
  return path.extname(filename).toLowerCase().replace(".", "");
}

export function attachmentMimeForFile(filename: string): string | null {
  return EXT_MIME[attachmentExtension(filename)] ?? null;
}

export function isAllowedFilename(filename: string) {
  const ext = attachmentExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function isAllowedMime(mime: string) {
  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("video/")
  );
}

export const ATTACHMENT_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,6}$/i;
