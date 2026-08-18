/**
 * Tipe bersama layer kamera EXISEL.
 * Sumber kontrak: plans/plans_android_camera_root_cause_fix.md §Phase 4.
 */

/**
 * State machine tunggal kamera.
 * - idle: kamera belum diminta / sudah dihentikan.
 * - requesting: getUserMedia sedang berjalan (tidak boleh dipanggil ulang).
 * - active: stream terpasang dan video dimainkan.
 * - denied: izin kamera diblokir user/kebijakan situs.
 * - blocked: kebijakan browser/OS memblokir (Permission-Policy/OS-level).
 * - unavailable: kamera atau API tidak tersedia.
 * - busy: kamera sedang dipakai aplikasi/tab lain.
 * - timeout: getUserMedia menggantung melewati batas waktu (popup izin tidak muncul).
 * - error: kegagalan lain yang tak terklasifikasi.
 */
export type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "blocked"
  | "unavailable"
  | "busy"
  | "timeout"
  | "error";

/**
 * Kategori hasil klasifikasi error kamera.
 * Semua kegagalan HARUS dipetakan ke salah satu kode ini;
 * jangan melabeli semua kegagalan sebagai permission denied.
 */
export type CameraErrorCode =
  | "PERMISSION_DENIED"
  | "POLICY_BLOCKED"
  | "CAMERA_NOT_FOUND"
  | "CAMERA_BUSY"
  | "OVERCONSTRAINED"
  | "INSECURE_CONTEXT"
  | "MEDIA_DEVICES_UNAVAILABLE"
  | "CAMERA_PERMISSION_TIMEOUT"
  | "UNKNOWN_CAMERA_ERROR";

/**
 * Salinan teks panduan yang siap ditampilkan UI.
 * Teks harus grounded (sesuai kondisi sebenarnya) dan tanpa emoji.
 */
export interface CameraErrorCopy {
  title: string;
  description: string;
}
