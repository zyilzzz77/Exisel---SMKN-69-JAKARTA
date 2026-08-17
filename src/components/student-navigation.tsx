import Link from "next/link";
import styles from "./student-navigation.module.css";

const studentNavigationItems = [
  {
    id: "dashboard",
    href: "/dashboard#dashboard-content",
    label: "Dashboard",
  },
  {
    id: "schedule",
    href: "/dashboard#jadwal",
    label: "Jadwal",
  },
  {
    id: "competitions",
    href: "/lomba",
    label: "Lomba",
  },
  {
    id: "community",
    href: "/community",
    label: "Community",
  },
  {
    id: "attendance",
    href: "/kehadiran",
    label: "Kehadiran",
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
  {
    id: "community",
    href: "/community",
    label: "Community",
  },
] as const;

type NavigationItemId =
  | (typeof studentNavigationItems)[number]["id"]
  | (typeof landingNavigationItems)[number]["id"];

type StudentNavigationProps = {
  activeItem?: NavigationItemId;
  ariaLabel?: string;
  className: string;
  id?: string;
  onNavigate?: () => void;
  variant?: "landing" | "student";
};

export function StudentNavigation({
  activeItem,
  ariaLabel = "Navigasi siswa",
  className,
  id,
  onNavigate,
  variant = "student",
}: StudentNavigationProps) {
  const navigationItems =
    variant === "landing" ? landingNavigationItems : studentNavigationItems;

  return (
    <nav
      className={`${className} ${styles.nav}`}
      aria-label={ariaLabel}
      id={id}
    >
      {navigationItems.map((item) => {
        const isActive = item.id === activeItem;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`${styles.link} ${isActive ? styles.active : ""}`}
            href={item.href}
            key={item.id}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
