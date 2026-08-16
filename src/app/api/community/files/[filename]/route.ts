import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { readSession } from "@/lib/auth/session";
import {
  ATTACHMENT_FILENAME_PATTERN,
  attachmentMimeForFile,
  attachmentUploadDir,
} from "@/lib/community/attachments";
import { getPrisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

type FileParams = Promise<{ filename: string }>;

export async function GET(_request: Request, { params }: { params: FileParams }) {
  const session = await readSession();
  if (!session) {
    return new Response("Tidak terautentikasi.", { status: 401 });
  }

  const user = await getPrisma().user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true },
  });
  if (!user) {
    return new Response("Tidak terautentikasi.", { status: 401 });
  }

  const { filename } = await params;
  if (!ATTACHMENT_FILENAME_PATTERN.test(filename)) {
    return new Response("File tidak ditemukan.", { status: 404 });
  }

  const mime = attachmentMimeForFile(filename) ?? "application/octet-stream";
  const filePath = path.join(attachmentUploadDir(), filename);

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
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
