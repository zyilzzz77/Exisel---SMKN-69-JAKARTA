/**
 * Entry point lib kamera EXISEL.
 * Kontrak tunggal untuk scanner attendance (plan Phase 4):
 * state machine, error codes, klasifikasi DOMException, copy UI,
 * dan controller/hook getUserMedia.
 */
export { cameraErrorCopy, classifyCameraError, stateForCameraError } from "./errors";
export type { CameraErrorCopy, CameraErrorCode, CameraState } from "./types";
export {
  createCameraController,
  emitCameraDiagnostic,
  FALLBACK_CONSTRAINTS,
  PERMISSION_TIMEOUT_MS,
  PRIMARY_CONSTRAINTS,
  primaryConstraints,
  useCamera,
  VIDEO_READY_TIMEOUT_MS,
} from "./use-camera";
export type {
  CameraController,
  CameraControllerOptions,
  UseCameraResult,
} from "./use-camera";
