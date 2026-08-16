"use client";

import { useRef, useState } from "react";
import { LoginForm } from "@/components/forms/login-form";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/auth/TurnstileWidget";
import styles from "@/app/(auth)/login/login.module.css";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function LoginPanel({ googleError }: { googleError?: string | null }) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [googleErrorState, setGoogleErrorState] = useState<string | null>(
    googleError ?? null,
  );
  const [googlePending, setGooglePending] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileConfigured = TURNSTILE_SITE_KEY.length > 0;
  const turnstileVerified = turnstileToken !== null;

  function resetTurnstile() {
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  }

  async function loginWithGoogle() {
    if (!turnstileToken) {
      setGoogleErrorState("Tunggu pemeriksaan keamanan selesai terlebih dahulu.");
      return;
    }

    setGooglePending(true);
    setGoogleErrorState(null);

    try {
      const response = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result.authorizationUrl !== "string") {
        resetTurnstile();
        setGoogleErrorState(
          "Verifikasi keamanan gagal. Silakan coba lagi.",
        );
        return;
      }

      window.location.assign(result.authorizationUrl);
    } catch {
      resetTurnstile();
      setGoogleErrorState("Verifikasi keamanan gagal. Silakan coba lagi.");
    } finally {
      setGooglePending(false);
    }
  }

  const turnstileSlot = turnstileConfigured ? (
    <div className={styles.turnstileWrapper}>
      <TurnstileWidget
        ref={turnstileRef}
        onVerify={(token) => {
          setTurnstileToken(token);
          setGoogleErrorState(null);
        }}
        onExpire={() => setTurnstileToken(null)}
        onError={() => setTurnstileToken(null)}
      />
    </div>
  ) : null;

  return (
    <>
      <div className={styles.oauthPanel}>
        <button
          className={styles.googleButton}
          type="button"
          onClick={loginWithGoogle}
          disabled={turnstileConfigured ? (!turnstileVerified || googlePending) : googlePending}
        >
          <svg
            aria-hidden="true"
            className={styles.googleIcon}
            viewBox="0 0 24 24"
          >
            <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z" />
            <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 6Z" />
          </svg>
          <span>{googlePending ? "Menghubungkan Google..." : "Lanjutkan dengan Google"}</span>
          <span aria-hidden="true">→</span>
        </button>
        <p>
          Google hanya memverifikasi identitas. Akses EXISEL tetap harus
          disetujui admin sekolah.
        </p>
        {googleErrorState ? (
          <div className={styles.oauthError} role="alert">
            <strong>Google Login belum berhasil.</strong>
            <span>{googleErrorState}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.divider}>
        <span>atau masuk dengan akun lama</span>
      </div>

      <LoginForm
        turnstileToken={turnstileToken}
        turnstileConfigured={turnstileConfigured}
        onTurnstileReset={resetTurnstile}
        turnstileSlot={turnstileSlot}
      />
    </>
  );
}