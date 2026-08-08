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
  return (
    <nav className={`${styles.nav} ${className ?? ""}`} aria-label="Navigasi admin">
      {adminNavigationItems.map((item) => {
        const isActive = item.id === activeItem;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`${styles.link} ${isActive ? styles.active : ""}`}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
