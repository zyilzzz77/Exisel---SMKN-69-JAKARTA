"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/(admin)/admin/esktrakulikuler/[nama_eskul]/admin-eskul.module.css";

type QrResponse = {
  payload: string;
  expiresAt: number;
  rotationMs: number;
  serverNow: number;
  sessionEndsAt: string;
};

export function AttendanceQrDisplay({
  extracurricularId,
  programName,
}: {
  extracurricularId: string;
  programName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockOffsetRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const nextRetryAtRef = useRef(0);
  const [data, setData] = useState<QrResponse | null>(null);
  const [remaining, setRemaining] = useState(4);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (
      refreshInFlightRef.current ||
      Date.now() < nextRetryAtRef.current
    ) {
      return;
    }

    refreshInFlightRef.current = true;
    const requestedAt = Date.now();

    try {
      const response = await fetch(
        `/api/attendance/qr?extracurricularId=${encodeURIComponent(extracurricularId)}&t=${Date.now()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("QR tidak tersedia.");
      const next = (await response.json()) as QrResponse;
      const receivedAt = Date.now();

      // Estimate server time at receipt using half the request round-trip.
      // This keeps mobile countdowns correct even when the device clock differs.
      clockOffsetRef.current =
        next.serverNow + (receivedAt - requestedAt) / 2 - receivedAt;
      const syncedNow = receivedAt + clockOffsetRef.current;

      setData(next);
      setRemaining(
        Math.max(
          1,
          Math.min(
            Math.ceil(next.rotationMs / 1_000),
            Math.ceil((next.expiresAt - syncedNow) / 1_000),
          ),
        ),
      );
      setError("");
      nextRetryAtRef.current = 0;
    } catch {
      setError("QR gagal dimuat. Memuat ulang otomatis...");
      nextRetryAtRef.current = Date.now() + 1_000;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [extracurricularId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [refresh]);

  useEffect(() => {
    if (!data) return;
    const syncedNow = Date.now() + clockOffsetRef.current;
    const nextRotation = window.setTimeout(
      () => void refresh(),
      Math.max(50, data.expiresAt - syncedNow + 30),
    );
    return () => window.clearTimeout(nextRotation);
  }, [data, refresh]);

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [refresh]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, data.payload, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#101010", light: "#ffffff" },
    });
  }, [data]);

  useEffect(() => {
    const update = () => {
      if (!data) return;
      const millisecondsLeft =
        data.expiresAt - (Date.now() + clockOffsetRef.current);

      if (millisecondsLeft <= 0) {
        // Keep the label readable while the new token is in flight. The backend
        // still rejects the expired QR; this only avoids a frozen "0 detik" UI.
        setRemaining(1);
        void refresh();
        return;
      }

      setRemaining(
        Math.max(
          1,
          Math.min(
            Math.ceil(data.rotationMs / 1_000),
            Math.ceil(millisecondsLeft / 1_000),
          ),
        ),
      );
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [data, refresh]);

  return (
    <div className={styles.qrDisplay}>
      <div className={styles.qrCanvasFrame}>
        <canvas aria-label={`QR kehadiran dinamis ${programName}`} ref={canvasRef} />
      </div>
      <div className={styles.qrMeta} aria-live="polite">
        <strong>QR berganti dalam {remaining} detik</strong>
        <span>Token lama langsung kedaluwarsa.</span>
        <div className={styles.qrProgress}>
          <i style={{ width: `${(remaining / 4) * 100}%` }} />
        </div>
        {error ? <small role="alert">{error}</small> : null}
      </div>
    </div>
  );
}
