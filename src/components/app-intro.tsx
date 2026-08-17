"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import schoolLogo from "../../public/logo-smkn69-transparent.png";
import styles from "./app-intro.module.css";

const INTRO_DURATION_MS = 3000;

// Flow QR attendance (Google Lens / scanner) melakukan navigasi keras
// berurutan: /attendance/scan -> POST sukses -> window.location.replace
// ke /kehadiran. Overlay intro 3 detik yang diputar di setiap load membuat
// siswa menunggu animasi loading (bahkan dua kali) sebelum melihat hasil
// absennya. Untuk load di halaman fungsional /attendance/* atau yang datang
// dari sana (serta saat intro sudah pernah selesai di dokumen ini), intro
// diselesaikan sebelum paint pertama — konten langsung tampil.
function shouldSkipIntro(): boolean {
  const referrerPath = (() => {
    try {
      return new URL(document.referrer).pathname;
    } catch {
      return "";
    }
  })();
  return (
    document.documentElement.dataset.exiselIntroComplete === "true" ||
    window.location.pathname.startsWith("/attendance/") ||
    referrerPath.includes("/attendance/")
  );
}

export function AppIntro() {
  const [isVisible, setIsVisible] = useState(true);

  // useLayoutEffect menjalankan finalisasi deep-link SEBELUM browser paint,
  // sehingga overlay tidak pernah terlihat berkedip di frame mana pun,
  // sekaligus menjaga markup SSR/klien tetap identik (tanpa mismatch).
  useLayoutEffect(() => {
    const root = document.documentElement;

    const finishIntro = () => {
      root.classList.remove("exisel-intro-locked");
      root.dataset.exiselIntroComplete = "true";
      window.dispatchEvent(new Event("exisel:intro-complete"));
      setIsVisible(false);
    };

    // Deep-link kehadiran langsung menyelesaikan intro tanpa menunggu.
    if (shouldSkipIntro()) {
      finishIntro();
      return;
    }

    let animationFrame = 0;
    let finishTimer = 0;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationFrame = window.requestAnimationFrame(finishIntro);

      return () => window.cancelAnimationFrame(animationFrame);
    }

    root.classList.add("exisel-intro-locked");

    finishTimer = window.setTimeout(finishIntro, INTRO_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(finishTimer);
      root.classList.remove("exisel-intro-locked");
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-label="Memuat EXISEL, Ekstrakurikuler SMKN 69 Jakarta"
      aria-live="polite"
      className={styles.overlay}
      role="status"
    >
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.brandLockup}>
        <div className={styles.logoFrame}>
          <Image
            alt="Logo SMKN 69 Jakarta"
            className={styles.logo}
            priority
            sizes="(max-width: 480px) 72px, 108px"
            src={schoolLogo}
          />
        </div>

        <span className={styles.divider} aria-hidden="true" />

        <div className={styles.copyClip}>
          <div className={styles.copy}>
            <strong>EXISEL</strong>
            <span>
              Ekstrakurikuler
              <br className={styles.mobileSubtitleBreak} />
              SMKN 69 Jakarta
            </span>
          </div>
        </div>

        <span className={styles.progress} aria-hidden="true" />
      </div>
    </div>
  );
}
