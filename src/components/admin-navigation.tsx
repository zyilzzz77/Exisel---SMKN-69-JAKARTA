"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./student-navigation.module.css";

const adminNavigationItems = [
  {
    id: "attendance",
    href: "/admin/dashboard",
    label: "Kehadiran",
  },
  {
    id: "community",
    href: "/admin/community",
    label: "Community",
  },
  {
    id: "reports",
    href: "/admin/laporan",
    label: "Laporan",
  },
  {
    id: "catalog",
    href: "/ekstrakurikuler",
    label: "Katalog ekskul",
  },
] as const;

type AdminNavigationProps = {
  activeItem?: "attendance" | "community" | "reports" | "catalog";
  className?: string;
};

export function AdminNavigation({ activeItem, className }: AdminNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="admin-header-navigation-menu"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup menu admin" : "Buka menu admin"}
        className={`mobile-menu-toggle ${isOpen ? "mobile-menu-toggle-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <nav
        className={`${styles.nav} ${className ?? ""} admin-desktop-nav ${isOpen ? "admin-mobile-menu-open" : ""}`}
        aria-label="Navigasi admin"
        id="admin-header-navigation-menu"
      >
        {adminNavigationItems.map((item) => {
          const isActive = item.id === activeItem;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`${styles.link} ${isActive ? styles.active : ""}`}
              href={item.href}
              key={item.id}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
