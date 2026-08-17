import type { CameraErrorCopy, CameraErrorCode } from "./types";

/**
 * Memetakan error getUserMedia ke kategori yang deterministik (plan §28).
 *
 * Prinsip penting (plan §29): web app tidak bisa memaksa Chrome menampilkan
 * prompt ulang setelah user memilih Block. Chrome langsung melempar
 * NotAllowedError tanpa prompt baru. Karena itu kegagalan harus diklasifikasi
 * secara presisi supaya UI menampilkan langkah pemulihan yang benar,
 * bukan sekadar menyuruh user mencoba lagi tanpa hasil.
 */
export function classifyCameraError(err: unknown): CameraErrorCode {
  const name = extractErrorName(err);

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "PERMISSION_DENIED";

    case "NotFoundError":
    case "DevicesNotFoundError":
      return "NOT_FOUND";

    case "NotReadableError":
    case "TrackStartError":
    case "AbortError": {
      // Chrome memakai AbortError saat kamera sedang dipakai tab/aplikasi lain
      // ("device change during capture"). Kategorikan sebagai kamera sibuk.
      return "BUSY";
    }

    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError": {
      // Kode ini hanya bisa muncul dari attempt pertama
      // (facingMode ideal). Controller langsung melakukan fallback ke
      // { video: true }, sehingga jika kode ini sampai ke handler error,
      // fallback tersebut juga sudah gagal.
      return "OVERCONSTRAINED";
    }

    case "SecurityError":
    default:
      return "UNKNOWN";
  }
}

/**
 * Memetakan CameraErrorCode → state machine (plan §35).
 * - PERMISSION_DENIED → "denied"
 * - NOT_FOUND / UNSUPPORTED → "unavailable"
 * - sisanya → "error"
 */
export function stateForCameraError(code: CameraErrorCode): "denied" | "unavailable" | "error" {
  if (code === "PERMISSION_DENIED") return "denied";
  if (code === "NOT_FOUND" || code === "UNSUPPORTED") return "unavailable";
  return "error";
}

/**
 * Teks panduan berbahasa Indonesia, grounded, tanpa emoji (plan §30/§38).
 *
 * PERMISSION_DENIED memuat langkah konkret Chrome Android karena kasus
 * produksi yang terjadi adalah permission yang pernah diblokir dan tidak
 * bisa dipulihkan tanpa panduan yang benar.
 */
export function cameraErrorCopy(code: CameraErrorCode): CameraErrorCopy {
  switch (code) {
    case "PERMISSION_DENIED":
      return {
        title: "Kamera diblokir untuk Exisel",
        description:
          "Akses kamera Exisel sedang diblokir, sehingga kamera tidak bisa dibuka. " +
          "Aktifkan kembali izinnya:\n" +
          "1. Ketuk ikon izin (gambar kamera/gembok) di address bar Chrome, tepat di sebelah kiri alamat situs.\n" +
          '2. Pilih "Izin" (Permissions).\n' +
          '3. Ubah "Kamera" menjadi "Izinkan" (Allow).\n' +
          "4. Kembali ke halaman ini.\n" +
          '5. Tekan tombol "Coba kamera lagi".\n' +
          "Jika masih belum bisa, periksa dari pengaturan Android: Pengaturan > Aplikasi > Chrome > Izin > Kamera > Izinkan. " +
          "Setelah itu tidak perlu memuat ulang halaman, cukup tekan tombol coba lagi.",
      };

    case "NOT_FOUND":
      return {
        title: "Tidak ada kamera yang terdeteksi",
        description:
          "Perangkat ini tidak memiliki kamera yang dapat digunakan oleh browser. " +
          "Jika perangkat memiliki kamera eksternal, sambungkan dahulu lalu tekan tombol coba lagi.",
      };

    case "BUSY":
      return {
        title: "Kamera sedang digunakan aplikasi lain",
        description:
          "Kamera sedang dipakai oleh aplikasi kamera atau video lain, atau oleh tab lain. " +
          "Tutup aplikasi/tab tersebut, lalu tekan tombol coba lagi.",
      };

    case "OVERCONSTRAINED":
      return {
        title: "Kamera tidak mendukung mode yang diminta",
        description:
          "Kamera perangkat tidak dapat digunakan dengan mode yang diminta, " +
          "dan mode cadangan juga gagal. Tutup aplikasi kamera lain, " +
          "lalu tekan tombol coba lagi pada halaman ini.",
      };

    case "UNSUPPORTED":
      return {
        title: "Browser tidak mendukung kamera",
        description:
          "Browser ini tidak mendukung akses kamera (getUserMedia). " +
          "Buka halaman ini melalui Chrome terbaru di perangkat Android Anda.",
      };

    case "INSECURE_CONTEXT":
      return {
        title: "Kamera membutuhkan koneksi aman (HTTPS)",
        description:
          "Akses kamera hanya tersedia melalui HTTPS atau localhost. " +
          "Buka halaman ini kembali melalui alamat https://exisel.web.id.",
      };

    case "UNKNOWN":
      return {
        title: "Kamera gagal dibuka",
        description:
          "Terjadi kendala tak terduga saat membuka kamera. " +
          "Periksa koneksi internet Anda, tutup aplikasi kamera lain, " +
          "lalu tekan tombol coba lagi pada halaman ini.",
      };
  }
}

/** Nama error dari DOMException/Error; string kosong jika tidak ada. */
function extractErrorName(err: unknown): string {
  if (err instanceof DOMException || err instanceof Error) {
    return err.name;
  }
  if (typeof err === "object" && err !== null && "name" in err && typeof err.name === "string") {
    return err.name;
  }
  return "";
}
