"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/actions/auth";
import styles from "./confirm-logout-button.module.css";

export type ConfirmLogoutButtonHandle = {
  openDialog: () => void;
};

type ConfirmLogoutButtonProps = {
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  /** Aksi konfirmasi keluar; default: logout siswa. */
  action?: (formData: FormData) => void | Promise<void>;
  /** Deskripsi dialog konfirmasi; default: teks siswa. */
  description?: string;
};

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${styles.actionButton} ${styles.confirmButton}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "Sedang keluar..." : "Ya, keluar"}
      <span aria-hidden="true">→</span>
    </button>
  );
}

export const ConfirmLogoutButton = forwardRef<
  ConfirmLogoutButtonHandle,
  ConfirmLogoutButtonProps
>(function ConfirmLogoutButton(
  {
    className,
    ariaLabel,
    children,
    action = logoutAction,
    description = "Kamu perlu masuk kembali untuk melihat jadwal, pendaftaran, dan kehadiran ekskulmu.",
  },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialogRef.current?.close();
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ openDialog }), [openDialog]);

  return (
    <>
      {className ? (
        <button
          className={className}
          onClick={openDialog}
          type="button"
          aria-label={ariaLabel}
        >
          {children ?? (
            <>
              Keluar <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
      ) : null}

      <dialog
        aria-describedby="logout-dialog-description"
        aria-labelledby="logout-dialog-title"
        className={styles.dialog}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <div className={styles.modalCard}>
          <div className={styles.modalTop}>
            <span>Konfirmasi akun</span>
            <span className={styles.warningIcon} aria-hidden="true">
              !
            </span>
          </div>

          <div className={styles.modalContent}>
            <p className={styles.eyebrow}>Sebelum kamu pergi</p>
            <h2 id="logout-dialog-title">Yakin mau keluar?</h2>
            <p id="logout-dialog-description" className={styles.description}>
              {description}
            </p>

            <div className={styles.actions}>
              <button
                autoFocus
                className={`${styles.actionButton} ${styles.cancelButton}`}
                onClick={closeDialog}
                type="button"
              >
                Batal
              </button>

              <form action={action}>
                <LogoutSubmitButton />
              </form>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
});
