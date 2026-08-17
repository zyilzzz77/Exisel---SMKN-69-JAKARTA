/**
 * Tipe bersama layer kamera EXISEL (Subagent 5 — Mobile Media Engineer).
 * Rencana: plans/plans_exisel_qr_camera_8_subagents.md §23-31, §34-38.
 */

/**
 * State machine kamera (plan §35).
 * - idle: kamera belum diminta / sudah dihentikan.
 * - requesting: getUserMedia sedang berjalan (tidak boleh dipanggil ulang).
 * - active: stream terpasang dan video dimainkan.
 * - denied: izin kamera diblokir user/kebijakan browser.
 * - unavailable: kamera/API tidak tersedia di perangkat atau browser.
 * - error: kegagalan lain (konteks tidak aman, kamera sibuk, tak terduga).
 */
export type CameraState = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

/**
 * Kategori hasil klasifikasi error getUserMedia (plan §28).
 * Semua kegagalan HARUS dipetakan ke salah satu kode ini;
 * jangan melabeli semua kegagalan sebagai permission denied.
 */
export type CameraErrorCode =
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "BUSY"
  | "OVERCONSTRAINED"
  | "UNSUPPORTED"
  | "INSECURE_CONTEXT"
  | "UNKNOWN";

/**
 * Salinan teks panduan yang siap ditampilkan UI.
 * Teks harus grounded (sesuai kondisi sebenarnya) dan tanpa emoji.
 */
export interface CameraErrorCopy {
  title: string;
  description: string;
}
