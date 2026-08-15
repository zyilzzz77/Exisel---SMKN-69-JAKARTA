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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(".", ":");
}

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
      <header className={styles.attendanceLiveHeader}>
        <div className={styles.attendanceLiveStatus}>
          <span className={styles.attendanceLiveDot} aria-hidden="true" />
          <span>Live</span>
        </div>
        <strong>
          {data ? `${data.present} / ${data.total} hadir` : "Memuat..."}
        </strong>
      </header>

      {error ? <p className={styles.attendanceLiveError}>{error}</p> : null}

      {data && data.records.length > 0 ? (
        <div className={styles.attendanceLiveTableWrap}>
          <table className={styles.attendanceLiveTable}>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Kelas</th>
                <th scope="col">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => (
                <tr key={record.id}>
                  <td className={styles.attendanceLiveName}>
                    {record.studentName}
                  </td>
                  <td>
                    <span className={styles.attendanceLiveClass}>
                      {record.className ?? "-"}
                    </span>
                  </td>
                  <td className={styles.attendanceLiveTime}>
                    {formatTime(record.checkedInAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.attendanceLiveEmpty}>
          <strong>Belum ada yang hadir</strong>
          <span>
            Belum ada siswa yang tercatat hadir lewat QR untuk {programName}.
          </span>
        </div>
      )}

      <footer className={styles.attendanceLiveFooter}>
        <span>Pembaruan otomatis setiap 5 detik</span>
      </footer>
    </div>
  );
}
