"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { adminLoginAction, type LoginState } from "@/actions/auth";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/auth/TurnstileWidget";
import styles from "@/app/(admin)/admin/login/admin-login.module.css";

const initialState: LoginState = { status: "idle", message: "" };

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function AdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [state, formAction, pending] = useActionState(
    adminLoginAction,
    initialState,
  );
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const turnstileConfigured = TURNSTILE_SITE_KEY.length > 0;

  // Reset widget Turnstile setelah percobaan login gagal
  const lastStatusRef = useRef(state.status);
  useEffect(() => {
    if (
      lastStatusRef.current !== "idle" &&
      (state.status === "error" || state.status === "captcha" || state.status === "blocked")
    ) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
    lastStatusRef.current = state.status;
  }, [state.status]);

  const canSubmit = !pending && (!turnstileConfigured || turnstileToken !== null);

  return (
    <form className={styles.form} action={formAction}>
      <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="email">Email admin/guru</label>
          <small>Role terverifikasi</small>
        </div>
        <div className={styles.inputFrame}>
          <span className={styles.inputIndex} aria-hidden="true">
            01
          </span>
          <input
            id="email"
            aria-describedby={state.errors?.email ? emailErrorId : undefined}
            aria-invalid={Boolean(state.errors?.email)}
            autoComplete="username"
            inputMode="email"
            maxLength={254}
            name="email"
            placeholder="guru@exisel.local"
            required
            type="email"
          />
        </div>
        {state.errors?.email ? (
          <small className={styles.fieldError} id={emailErrorId}>
            {state.errors.email[0]}
          </small>
        ) : null}
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="password">Password</label>
          <small>Khusus petugas</small>
        </div>
        <div className={`${styles.inputFrame} ${styles.passwordFrame}`}>
          <span className={styles.inputIndex} aria-hidden="true">
            02
          </span>
          <input
            id="password"
            aria-describedby={
              state.errors?.password ? passwordErrorId : undefined
            }
            aria-invalid={Boolean(state.errors?.password)}
            autoComplete="current-password"
            maxLength={128}
            minLength={6}
            name="password"
            placeholder="Masukkan password admin"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-controls="password"
            aria-pressed={showPassword}
            className={styles.passwordToggle}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`${styles.eyeIcon} ${
                showPassword ? styles.eyeOpen : styles.eyeClosed
              }`}
            />
            <span className={styles.srOnly}>
              {showPassword ? "Sembunyikan password" : "Tampilkan password"}
            </span>
          </button>
        </div>
        {state.errors?.password ? (
          <small className={styles.fieldError} id={passwordErrorId}>
            {state.errors.password[0]}
          </small>
        ) : null}
      </div>

      {turnstileConfigured ? (
        <div className={styles.turnstileWrapper}>
          <TurnstileWidget
            ref={turnstileRef}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        </div>
      ) : null}

      {state.message ? (
        <div className={styles.formMessage} role="alert">
          <strong>
            {state.status === "blocked"
              ? "Akses ditunda."
              : state.status === "unavailable"
                ? "Layanan belum tersambung."
                : state.status === "captcha"
                  ? "Pemeriksaan keamanan."
                  : "Login ditolak."}
          </strong>
          <span>{state.message}</span>
        </div>
      ) : null}

      <button
        className={styles.submitButton}
        disabled={!canSubmit}
        type="submit"
      >
        <span>
          {pending
            ? "Memverifikasi role..."
            : !turnstileConfigured || turnstileToken !== null
              ? "Masuk ke monitoring"
              : "Tunggu pemeriksaan keamanan..."}
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
