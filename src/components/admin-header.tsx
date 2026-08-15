"use client";

import Image from "next/image";
import Link from "next/link";
import { adminLogoutAction } from "@/actions/auth";
import {
  AdminNavigation,
  type AdminNavigationItem,
} from "@/components/admin-navigation";
import styles from "./admin-header.module.css";

type AdminHeaderProps = {
  activeItem: AdminNavigationItem;
  adminName: string;
  announcement: string;
  brandSubtitle: string;
  roleLabel?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminHeader({
  activeItem,
  adminName,
  announcement,
  brandSubtitle,
  roleLabel = "Admin / Guru",
}: AdminHeaderProps) {
  return (
    <>
      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        <span className={styles.announcementText}>{announcement}</span>
      </div>

      <header className={styles.header}>
        <div className={styles.inner}>
          <Link className={styles.brand} href="/admin/dashboard">
            <span className={styles.brandLogo}>
              <Image
                alt="Logo SMK Negeri 69 Jakarta"
                height={948}
                priority
                src="/logo-smkn69.webp"
                width={758}
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>EXISEL</strong>
              <small>{brandSubtitle}</small>
            </span>
          </Link>

          <AdminNavigation activeItem={activeItem} className={styles.navigation} />

          <div className={styles.accountActions}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(adminName)}
            </span>
            <div className={styles.accountCopy}>
              <strong>{adminName}</strong>
              <span>{roleLabel}</span>
            </div>
            <form action={adminLogoutAction}>
              <button className={styles.logoutButton} type="submit">
                Keluar ↗
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
