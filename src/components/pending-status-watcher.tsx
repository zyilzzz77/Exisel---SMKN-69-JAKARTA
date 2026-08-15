"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(auth)/status-page.module.css";

const CHECK_INTERVAL_MS = 8_000;

const STATUS_DESTINATIONS: Record<string, string> = {
  INCOMPLETE: "/register/student",
  APPROVED: "/dashboard",
  REJECTED: "/rejected",
  SUSPENDED: "/suspended",
};

export function PendingStatusWatcher() {
  const router = useRouter();
  const checkingRef = useRef(false);
  const [connectionState, setConnectionState] = useState<
    "checking" | "connected" | "offline"
  >("checking");

  const checkStatus = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const response = await fetch("/api/me", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error("STATUS_UNAVAILABLE");

      const result = (await response.json()) as {
        user?: { role?: string; status?: string };
      };
      const user = result.user;

      if (!user || user.role !== "STUDENT") {
        router.replace("/login");
        return;
      }

      const destination = user.status
        ? STATUS_DESTINATIONS[user.status]
        : undefined;

      if (destination) {
        router.replace(destination);
        router.refresh();
        return;
      }

      setConnectionState("connected");
    } catch {
      setConnectionState("offline");
    } finally {
      checkingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkStatus(), 0);
    const interval = window.setInterval(() => void checkStatus(), CHECK_INTERVAL_MS);
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void checkStatus();
    };

    window.addEventListener("focus", checkStatus);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener("focus", checkStatus);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [checkStatus]);

  return (
    <div className={styles.liveStatus} aria-live="polite">
      <span
        className={`${styles.liveDot} ${
          connectionState === "offline" ? styles.liveDotOffline : ""
        }`}
      />
      <span>
        {connectionState === "checking"
          ? "Menghubungkan pemantauan status..."
          : connectionState === "offline"
            ? "Koneksi terputus. Pemeriksaan akan dicoba lagi otomatis."
            : "Status dipantau otomatis — halaman akan berpindah setelah admin mengambil keputusan."}
      </span>
    </div>
  );
}
