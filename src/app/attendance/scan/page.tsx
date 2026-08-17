import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AttendanceScanView } from "@/components/attendance/attendance-scan-view";

export const metadata: Metadata = {
  title: "Absensi QR — EXISEL",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendanceScanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    (host ? `http://${host}` : "http://localhost:3000");
  const url = new URL("/attendance/scan", baseUrl);
  for (const key of ["v", "e", "d", "t", "s"]) {
    const value = params[key];
    if (typeof value === "string" && value) url.searchParams.set(key, value);
  }

  const payload = url.toString();

  if (!url.searchParams.get("e") || !url.searchParams.get("s")) {
    redirect("/attendance/error?code=QR_INVALID");
  }

  // Deep-link dari Google Lens dibuka lewat GET, jadi halaman ini hanya boleh
  // me-bootstrap tampilan scan tanpa mutasi apa pun (plan §19). Pre-validasi
  // user sengaja TIDAK dilakukan di sini: validasi sesi, QR, dan pembuatan
  // intent saat user belum login semuanya terjadi di POST /api/attendance/scan
  // yang dikirim sekali oleh scan view. Dengan begitu QR tidak pernah terbuang
  // untuk user yang login namun belum valid — POST yang membuat
  // AttendanceIntent lalu mengarahkan ke /login -> /attendance/resume.
  return <AttendanceScanView payload={payload} />;
}
