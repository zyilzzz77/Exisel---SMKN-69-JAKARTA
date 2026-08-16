import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getActiveSessionUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function avatarUploadDir() {
  const root = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  return path.join(root, "avatars");
}

export async function POST(request: Request) {
  const user = await getActiveSessionUser("STUDENT");
  if (!user) {
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

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      { message: "Ukuran file maksimal 5 MB." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json(
      { message: "Tipe file tidak diizinkan. Gunakan JPG, PNG, WEBP, atau GIF." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "gif";
  const storedName = `${randomUUID()}.${ext}`;
  const directory = avatarUploadDir();

  try {
    await mkdir(directory, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(directory, storedName), buffer);
  } catch (error) {
    console.error("Gagal menyimpan avatar:", error);
    return NextResponse.json(
      { message: "File belum dapat disimpan. Coba lagi." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const avatarUrl = `/uploads/avatars/${storedName}`;

  return NextResponse.json(
    { avatarUrl },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const user = await getActiveSessionUser("STUDENT");
  if (!user) {
    return NextResponse.json(
      { message: "Tidak terautentikasi." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (user.avatarUrl && user.avatarUrl.startsWith("/uploads/avatars/")) {
    const filename = path.basename(user.avatarUrl);
    const filePath = path.join(avatarUploadDir(), filename);
    try {
      await unlink(filePath);
    } catch {
      // File might not exist, ignore
    }
  }

  return NextResponse.json(
    { message: "Avatar dihapus." },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
