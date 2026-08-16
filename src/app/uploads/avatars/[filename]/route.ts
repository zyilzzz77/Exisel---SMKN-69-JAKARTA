import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$/i;

function avatarUploadDir() {
  const root = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  return path.join(root, "avatars");
}

type Params = Promise<{ filename: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { filename } = await params;

  if (!FILENAME_PATTERN.test(filename)) {
    return new Response("File tidak ditemukan.", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const filePath = path.join(avatarUploadDir(), filename);

  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return new Response("File tidak ditemukan.", { status: 404 });
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stats.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
