import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import {
  MAX_ATTACHMENT_SIZE,
  attachmentMimeForFile,
  attachmentUploadDir,
  isAllowedFilename,
} from "@/lib/community/attachments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getActiveSessionUser("ADMIN");
  if (!admin) {
    return NextResponse.json(
      { message: "Tidak terautentikasi." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "File tidak ditemukan." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { message: "File kosong." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { message: "Ukuran file maksimal 15 MB." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isAllowedFilename(file.name)) {
    return NextResponse.json(
      {
        message:
          "Tipe file tidak diizinkan. Gunakan gambar (PNG/JPG/GIF/WEBP), PDF, atau video (MP4/WEBM/MOV).",
      },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  const mime = attachmentMimeForFile(file.name);
  if (!mime) {
    return NextResponse.json(
      { message: "Tipe file tidak diizinkan." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  const extension = path.extname(file.name).toLowerCase().replace(".", "");
  const storedName = `${randomUUID()}.${extension}`;
  const directory = attachmentUploadDir();

  try {
    await mkdir(directory, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(directory, storedName), buffer);
  } catch (error) {
    console.error("Gagal menyimpan lampiran:", error);
    return NextResponse.json(
      { message: "File belum dapat disimpan. Coba lagi." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { path: storedName, name: file.name, size: file.size, mime },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
