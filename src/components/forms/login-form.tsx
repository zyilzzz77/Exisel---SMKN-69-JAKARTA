"use client";

import { useActionState, useId, useRef, useState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";
import styles from "@/app/(auth)/login/login.module.css";

const initialLoginState: LoginState = {
  status: "idle",
  message: "",
};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastTouchToggleAt = useRef(0);
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialLoginState,
  );
  const emailHintId = useId();
  const emailErrorId = useId();
  const passwordHintId = useId();
  const passwordErrorId = useId();

  function togglePassword() {
    setShowPassword((current) => !current);
    window.requestAnimationFrame(() => {
      const input = passwordInputRef.current;
      if (!input) return;

      input.focus({ preventScroll: true });
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }

  return (
    <form className={styles.form} action={formAction}>
      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="email">Email</label>
          <span>Akun e-Learning</span>
        </div>
        <div className={styles.inputFrame}>
          <span className={styles.inputIndex} aria-hidden="true">
            01
          </span>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nama.siswa@gmail.com"
            maxLength={254}
            aria-describedby={state.errors?.email ? emailErrorId : emailHintId}
            aria-invalid={Boolean(state.errors?.email)}
            required
          />
        </div>
        {state.errors?.email ? (
          <p className={styles.fieldError} id={emailErrorId}>
            {state.errors.email[0]}
          </p>
        ) : (
          <p className={styles.fieldHint} id={emailHintId}>
            Gunakan Email Yang Tercatat Yang Didata Guru.
          </p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="password">Password</label>
          <span>Rahasia, ya.</span>
        </div>
        <div className={`${styles.inputFrame} ${styles.passwordFrame}`}>
          <span className={styles.inputIndex} aria-hidden="true">
            02
          </span>
          <input
            ref={passwordInputRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password sekolah"
            minLength={6}
            maxLength={128}
            aria-describedby={
              state.errors?.password ? passwordErrorId : passwordHintId
            }
            aria-invalid={Boolean(state.errors?.password)}
            required
          />
          <button
            aria-controls="password"
            className={styles.passwordToggle}
            type="button"
            onClick={() => {
              if (Date.now() - lastTouchToggleAt.current < 600) return;
              togglePassword();
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "touch" && event.pointerType !== "pen") return;

              event.preventDefault();
              lastTouchToggleAt.current = Date.now();
              togglePassword();
            }}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            <span
              className={`${styles.eyeIcon} ${
                showPassword ? styles.eyeOpen : styles.eyeClosed
              }`}
              aria-hidden="true"
            />
            <span className={styles.srOnly}>
              {showPassword ? "Sembunyikan password" : "Tampilkan password"}
            </span>
          </button>
        </div>
        {state.errors?.password ? (
          <p className={styles.fieldError} id={passwordErrorId}>
            {state.errors.password[0]}
          </p>
        ) : (
          <p className={styles.fieldHint} id={passwordHintId}>
            Gunakan password yang diberikan.
          </p>
        )}
      </div>

      {state.message ? (
        <div
          className={`${styles.formMessage} ${
            state.status !== "idle" ? styles.formMessageError : ""
          }`}
          role={state.status === "idle" ? "status" : "alert"}
          aria-live="polite"
        >
          <strong>
            {state.status === "blocked"
              ? "Akses ditunda."
              : state.status === "unavailable"
                ? "Layanan belum tersambung."
                : "Belum pas."}
          </strong>
          <span>{state.message}</span>
        </div>
      ) : null}

      <button className={styles.submitButton} type="submit" disabled={pending}>
        <span>{pending ? "Memeriksa data..." : "Masuk ke EXISEL"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
