"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminLogoutAction } from "@/actions/auth";
import {
  ConfirmLogoutButton,
  type ConfirmLogoutButtonHandle,
} from "@/components/confirm-logout-button";
import styles from "./avatar-dropdown.module.css";

type AvatarDropdownProps = {
  userName: string;
  initials: string;
  avatarUrl?: string | null;
  variant?: "student" | "admin";
  roleLabel?: string;
};

export function AvatarDropdown({
  userName,
  initials: initialsText,
  avatarUrl,
  variant = "student",
  roleLabel = "Admin / Guru",
}: AvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<ConfirmLogoutButtonHandle>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const profilItemRef = useRef<HTMLAnchorElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openLogoutDialog = useCallback(() => {
    // Tunggu dropdown menutup dan dialog konfirmasi di-render dulu.
    // rAF ganda: satu untuk commit re-render, satu lagi sebelum dialog dibuka.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => logoutRef.current?.openDialog());
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const navItems: (HTMLAnchorElement | HTMLButtonElement)[] = [
        ...menuItemsRef.current.filter(
          (item): item is HTMLButtonElement => Boolean(item),
        ),
        ...(variant === "student" && profilItemRef.current
          ? [profilItemRef.current]
          : []),
      ];
      const currentIndex = navItems.indexOf(
        document.activeElement as HTMLAnchorElement | HTMLButtonElement,
      );

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          break;
        case "ArrowDown":
          event.preventDefault();
          if (currentIndex < navItems.length - 1) {
            navItems[currentIndex + 1]?.focus();
          } else {
            navItems[0]?.focus();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (currentIndex > 0) {
            navItems[currentIndex - 1]?.focus();
          } else {
            navItems[navItems.length - 1]?.focus();
          }
          break;
        case "Home":
          event.preventDefault();
          navItems[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          navItems[navItems.length - 1]?.focus();
          break;
        case "Tab":
          close();
          break;
      }
    },
    [close, variant],
  );

  // Focus first item when menu opens
  useEffect(() => {
    if (!isOpen) return;
    // Sedikit delay supaya DOM dropdown selesai di-render dulu
    requestAnimationFrame(() => {
      menuItemsRef.current[0]?.focus();
    });
  }, [isOpen]);

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button
        ref={buttonRef}
        className={
          variant === "admin"
            ? `${styles.avatarButton} ${styles.avatarButtonAdmin}`
            : styles.avatarButton
        }
        onClick={toggle}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menu akun ${userName}`}
      >
        <span className={styles.avatar} aria-hidden="true">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className={styles.avatarImage} src={avatarUrl} />
          ) : (
            initialsText
          )}
        </span>
        <span className={styles.userName}>{userName}</span>
        <span className={styles.chevron} aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-label="Menu akun"
          onKeyDown={handleKeyDown}
        >
          {variant === "student" ? (
            <Link
              ref={(el) => {
                profilItemRef.current = el;
              }}
              className={styles.menuItem}
              href="/profile"
              role="menuitem"
              tabIndex={-1}
              onClick={close}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                ↗
              </span>
              Profil
            </Link>
          ) : (
            <div className={styles.menuHeader}>
              <span className={styles.chevron} aria-hidden="true">
                ▲
              </span>
              <p className={styles.menuUserName}>{userName}</p>
              <p className={styles.menuRole}>{roleLabel}</p>
            </div>
          )}

          <button
            ref={(el) => {
              menuItemsRef.current[0] = el;
            }}
            className={`${styles.menuItem} ${styles.logoutItem}`}
            role="menuitem"
            tabIndex={-1}
            type="button"
            onClick={() => {
              close();
              openLogoutDialog();
            }}
          >
            <span className={styles.menuIcon} aria-hidden="true">
              ⏻
            </span>
            Keluar
          </button>
        </div>
      )}

      <ConfirmLogoutButton
        ref={logoutRef}
        action={variant === "admin" ? adminLogoutAction : undefined}
        description={
          variant === "admin"
            ? "Setelah keluar, kamu perlu masuk kembali untuk membuka halaman admin dan guru."
            : undefined
        }
      />
    </div>
  );
}
