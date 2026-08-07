"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/(admin)/admin/esktrakulikuler/[nama_eskul]/admin-eskul.module.css";

type QrResponse = {
  payload: string;
  expiresAt: number;
  rotationMs: number;
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
  const [data, setData] = useState<QrResponse | null>(null);
  const [remaining, setRemaining] = useState(4);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/attendance/qr?extracurricularId=${encodeURIComponent(extracurricularId)}&t=${Date.now()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("QR tidak tersedia.");
      const next = (await response.json()) as QrResponse;
      setData(next);
      setError("");
    } catch {
      setError("QR gagal dimuat. Memuat ulang otomatis...");
    }
  }, [extracurricularId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [refresh]);

  useEffect(() => {
    if (!data) return;
    const nextRotation = window.setTimeout(
      () => void refresh(),
      Math.max(50, data.expiresAt - Date.now() + 20),
    );
    return () => window.clearTimeout(nextRotation);
  }, [data, refresh]);

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
      setRemaining(Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1_000)));
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [data]);

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
