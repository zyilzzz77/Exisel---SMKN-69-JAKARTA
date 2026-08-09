"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import schoolLogo from "../../public/logo-smkn69-transparent.png";
import styles from "./app-intro.module.css";

const INTRO_DURATION_MS = 3000;

export function AppIntro() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    let animationFrame = 0;
    let finishTimer = 0;

    const finishIntro = () => {
      root.classList.remove("exisel-intro-locked");
      root.dataset.exiselIntroComplete = "true";
      window.dispatchEvent(new Event("exisel:intro-complete"));
      setIsVisible(false);
    };

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
