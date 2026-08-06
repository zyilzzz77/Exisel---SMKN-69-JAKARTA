import Link from "next/link";
import styles from "./student-navigation.module.css";

const studentNavigationItems = [
  {
    id: "dashboard",
    href: "/dashboard#dashboard-content",
    label: "Dashboard",
  },
  {
    id: "programs",
    href: "/ekstrakurikuler",
    label: "Pilihan ekskul",
  },
  {
    id: "attendance",
    href: "/kehadiran",
    label: "Kehadiran",
  },
  {
    id: "schedule",
    href: "/dashboard#jadwal",
    label: "Jadwal",
  },
  {
    id: "account",
    href: "/dashboard#akun",
    label: "Akun",
  },
] as const;

const landingNavigationItems = [
  {
    id: "about",
    href: "#about",
    label: "About",
  },
  {
    id: "background",
    href: "#background",
    label: "Background",
  },
  {
    id: "explore",
    href: "#pilihan",
    label: "Explore",
  },
] as const;

type NavigationItemId = (typeof studentNavigationItems)[number]["id"];

type StudentNavigationProps = {
  activeItem?: NavigationItemId;
  ariaLabel?: string;
  className: string;
  variant?: "landing" | "student";
};

export function StudentNavigation({
  activeItem,
  ariaLabel = "Navigasi siswa",
  className,
  variant = "student",
}: StudentNavigationProps) {
  const navigationItems =
    variant === "landing" ? landingNavigationItems : studentNavigationItems;

  return (
    <nav className={`${className} ${styles.nav}`} aria-label={ariaLabel}>
      {navigationItems.map((item) => {
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
