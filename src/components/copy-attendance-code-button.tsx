"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/(admin)/admin/esktrakulikuler/[nama_eskul]/admin-eskul.module.css";

type CopyStatus = "idle" | "copied" | "error";

function copyWithTextArea(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.inset = "0 auto auto -9999px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export function CopyAttendanceCodeButton({ code }: { code: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyCode() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else if (!copyWithTextArea(code)) {
        throw new Error("Copy command was rejected.");
      }

      setStatus("copied");
    } catch {
      setStatus("error");
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2200);
  }

  const label =
    status === "copied"
      ? "Kode berhasil disalin"
      : status === "error"
        ? "Gagal menyalin kode, coba lagi"
        : "Salin kode kehadiran";

  return (
    <div className={styles.copyCodeControl}>
      <button
        aria-label={label}
        className={`${styles.copyCodeButton} ${
          status === "copied" ? styles.copyCodeButtonSuccess : ""
        }`}
        onClick={copyCode}
        title={label}
        type="button"
      >
        {status === "copied" ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m5 12 4 4L19 6" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect height="13" rx="1" width="13" x="8" y="8" />
            <path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" />
          </svg>
        )}
      </button>
      <span aria-live="polite" className={styles.copyCodeStatus} role="status">
        {status === "copied" ? "Tersalin!" : status === "error" ? "Gagal menyalin" : ""}
      </span>
    </div>
  );
}
