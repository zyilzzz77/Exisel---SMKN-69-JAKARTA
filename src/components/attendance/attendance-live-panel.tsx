"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/attendance/attendance-admin.module.css";

type RecordRow = {
  id: string;
  studentName: string;
  nis: string | null;
  className: string | null;
  checkedInAt: string;
};

type RecordsPayload = {
  present: number;
  total: number;
  records: RecordRow[];
};

export function AttendanceLivePanel({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [data, setData] = useState<RecordsPayload | null>(null);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const response = await fetch(
          `/api/attendance/session-records?extracurricularId=${encodeURIComponent(programId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("records");
        const payload = (await response.json()) as RecordsPayload;
        if (cancelled) return;
        setData(payload);
        setError("");
      } catch {
        if (!cancelled) setError("Gagal memuat data. Mencoba lagi...");
      } finally {
        inFlightRef.current = false;
      }
    }

    const timer = window.setInterval(() => void poll(), 5_000);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [programId]);

  return (
    <div className={styles.attendanceLivePanel}>
      <header>
        <span>Kehadiran Langsung</span>
        <strong>
          {data ? `${data.present} / ${data.total} hadir` : "Memuat..."}
        </strong>
      </header>
      {error ? <p className={styles.attendanceLiveError}>{error}</p> : null}
      {data && data.records.length > 0 ? (
        <table className={styles.attendanceLiveTable}>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((record) => (
              <tr key={record.id}>
                <td>{record.studentName}</td>
                <td>{record.className ?? "-"}</td>
                <td>
                  {new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                    .format(new Date(record.checkedInAt))
                    .replace(".", ":")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.attendanceLiveEmpty}>
          Belum ada siswa yang hadir melalui QR untuk {programName}.
        </p>
      )}
    </div>
  );
}