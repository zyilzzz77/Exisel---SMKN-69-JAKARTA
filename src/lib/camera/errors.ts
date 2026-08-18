import type { CameraErrorCopy, CameraErrorCode } from "./types";

/**
 * Memetakan error getUserMedia ke kategori yang deterministik.
 * Sumber kontrak: plans/plans_android_camera_root_cause_fix.md §Phase 4
 * (DOMException mapping) dan §RC-A..H (root-cause classification).
 *
 * Prinsip penting: web app tidak bisa memaksa Chrome menampilkan prompt
 * ulang setelah user memilih Block. Chrome langsung melempar NotAllowedError
 * (atau bahkan menggantung) tanpa prompt baru. Karena itu kegagalan harus
 * diklasifikasi secara presisi supaya UI menampilkan langkah pemulihan yang
 * benar, bukan sekadar menyuruh user mencoba lagi tanpa hasil.
 */
export function classifyCameraError(err: unknown): CameraErrorCode {
  const name = extractErrorName(err);

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "PERMISSION_DENIED";

    case "SecurityError":
      return "POLICY_BLOCKED";

    case "NotFoundError":
    case "DevicesNotFoundError":
      return "CAMERA_NOT_FOUND";

    case "NotReadableError":
    case "TrackStartError":
    case "AbortError": {
      // Chrome memakai AbortError saat kamera sedang dipakai tab/aplikasi
      // lain ("device change during capture"). Kategorikan sebagai busy.
      return "CAMERA_BUSY";
    }

    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError": {
      // Kode ini hanya bisa muncul dari attempt pertama
      // (facingMode ideal). Controller langsung melakukan fallback ke
      // { video: true }, sehingga jika kode ini sampai ke handler error,
      // fallback tersebut juga sudah gagal.
      return "OVERCONSTRAINED";
    }

    case "TimeoutError":
      // Timeout buatan kami (getUserMedia menggantung > batas waktu,
      // khas Android saat popup izin tidak muncul).
      return "CAMERA_PERMISSION_TIMEOUT";

    default:
      return "UNKNOWN_CAMERA_ERROR";
  }
}

/**
 * Memetakan CameraErrorCode → state machine.
 */
export function stateForCameraError(
  code: CameraErrorCode,
): "denied" | "blocked" | "unavailable" | "busy" | "timeout" | "error" {
  if (code === "PERMISSION_DENIED") return "denied";
  if (code === "POLICY_BLOCKED" || code === "INSECURE_CONTEXT") return "blocked";
  if (
    code === "CAMERA_NOT_FOUND" ||
    code === "MEDIA_DEVICES_UNAVAILABLE"
  ) {
    return "unavailable";
  }
  if (code === "CAMERA_BUSY") return "busy";
  if (code === "CAMERA_PERMISSION_TIMEOUT") return "timeout";
  return "error";
}

/**
 * Teks panduan berbahasa Indonesia, grounded, tanpa emoji.
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
          "Izinkan kamera untuk situs Exisel melalui pengaturan situs Chrome, " +
          "lalu kembali dan tekan \u201cCoba Lagi\u201d.\n" +
          "1. Ketuk ikon izin (gambar kamera/gembok) di address bar Chrome, tepat di sebelah kiri alamat situs.\n" +
          '2. Pilih "Izin" (Permissions).\n' +
          '3. Ubah "Kamera" menjadi "Izinkan" (Allow).\n' +
          "4. Kembali ke halaman ini.\n" +
          '5. Tekan tombol "Coba Lagi".\n' +
          "Jika langkah di atas tidak membantu, izin bisa juga diblokir di tingkat sistem: " +
          "buka Pengaturan Android \u2192 Aplikasi \u2192 Chrome \u2192 Izin \u2192 Kamera \u2192 Izinkan. " +
          "Setelah itu tidak perlu memuat ulang halaman, cukup tekan tombol coba lagi.",
      };

    case "POLICY_BLOCKED":
      return {
        title: "Kamera diblokir kebijakan keamanan",
        description:
          "Browser menolak akses kamera karena kebijakan keamanan halaman. " +
          "Pastikan halaman dibuka langsung di https://exisel.web.id (bukan lewat " +
          "frame/aplikasi lain), lalu tekan tombol coba lagi. " +
          "Jika masih muncul, beri tahu admin sekolah.",
      };

    case "CAMERA_NOT_FOUND":
      return {
        title: "Tidak ada kamera yang terdeteksi",
        description:
          "Perangkat ini tidak memiliki kamera yang dapat digunakan oleh browser. " +
          "Jika perangkat memiliki kamera eksternal, sambungkan dahulu lalu tekan tombol coba lagi.",
      };

    case "CAMERA_BUSY":
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

    case "MEDIA_DEVICES_UNAVAILABLE":
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

    case "CAMERA_PERMISSION_TIMEOUT":
      return {
        title: "Izin kamera tidak terjawab",
        description:
          "Popup izin kamera tidak muncul. Buka izinnya manual: ketuk ikon izin " +
          "(gembok/kamera) di address bar Chrome sebelah kiri alamat situs, pilih " +
          "Izin \u2192 Kamera \u2192 Izinkan. Jika tidak ada menu itu, buka " +
          "Pengaturan Android \u2192 Aplikasi \u2192 Chrome \u2192 Izin \u2192 Kamera \u2192 " +
          "Izinkan. Lalu tekan tombol Coba Lagi.",
      };

    case "UNKNOWN_CAMERA_ERROR":
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
