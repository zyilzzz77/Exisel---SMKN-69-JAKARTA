"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useTransition } from "react";
import {
  changePasswordAction,
  updateAvatarAction,
  removeAvatarAction,
  type ProfileActionState,
} from "@/actions/profile";
import { AvatarDropdown } from "@/components/avatar-dropdown";
import { StudentHeaderNav } from "@/components/landing-navigation";
import styles from "./profile.module.css";

type EnrollmentInfo = {
  id: string;
  status: "APPROVED" | "PENDING";
  registeredAt: string;
  extracurricular: {
    id: string;
    name: string;
  };
};

type ProfileClientProps = {
  user: {
    id: string;
    name: string;
    email: string;
    nis: string | null;
    className: string | null;
    role: string;
    avatarUrl: string | null;
    mustChangePassword: boolean;
    createdAt: string;
    enrollments: EnrollmentInfo[];
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString));
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<ProfileActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastNotification({
        type: "error",
        message: "Ukuran file maksimal 5 MB.",
      });
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setToastNotification({
        type: "error",
        message: "Tipe file tidak diizinkan. Gunakan JPG, PNG, WEBP, atau GIF.",
      });
      return;
    }

    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setToastNotification({
            type: "error",
            message: data.message || "Gagal mengunggah foto profil.",
          });
          return;
        }
        const result = await updateAvatarAction(data.avatarUrl);
        if (result.success) {
          setAvatarPreview(data.avatarUrl);
          setToastNotification({
            type: "success",
            message: "Foto profil berhasil diperbarui.",
          });
        } else {
          setToastNotification({
            type: "error",
            message: result.error || "Gagal memperbarui foto profil.",
          });
        }
      })
      .catch(() => {
        setToastNotification({
          type: "error",
          message: "Gagal mengunggah foto profil. Coba lagi.",
        });
      })
      .finally(() => {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  function handleRemoveAvatar() {
    setIsUploadingAvatar(true);

    fetch("/api/profile/avatar", { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          setToastNotification({
            type: "error",
            message: "Gagal menghapus foto profil.",
          });
          return;
        }
        const result = await removeAvatarAction();
        if (result.success) {
          setAvatarPreview(null);
          setToastNotification({
            type: "success",
            message: "Foto profil berhasil dihapus.",
          });
        } else {
          setToastNotification({
            type: "error",
            message: result.error || "Gagal menghapus foto profil.",
          });
        }
      })
      .catch(() => {
        setToastNotification({
          type: "error",
          message: "Gagal menghapus foto profil. Coba lagi.",
        });
      })
      .finally(() => {
        setIsUploadingAvatar(false);
      });
  }

  function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ error: "Masukkan password saat ini." });
      return;
    }
    if (!newPassword) {
      setPasswordStatus({ error: "Masukkan password baru." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ error: "Konfirmasi password tidak cocok." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ error: "Password baru minimal 6 karakter." });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordStatus({ error: "Password baru harus berbeda dari password saat ini." });
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction(currentPassword, newPassword);
      setPasswordStatus(result);
      if (result.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#profile-content">
        Lewati ke konten profil
      </a>

      {toastNotification ? (
        <aside
          aria-live="polite"
          className={`${styles.toast} ${
            toastNotification.type === "success"
              ? styles.toastSuccess
              : styles.toastError
          }`}
          role="status"
        >
          <span className={styles.toastIcon} aria-hidden="true">
            {toastNotification.type === "success" ? "✓" : "!"}
          </span>
          <div className={styles.toastBody}>
            <strong>
              {toastNotification.type === "success" ? "Berhasil" : "Gagal"}
            </strong>
            <p>{toastNotification.message}</p>
          </div>
          <button
            aria-label="Tutup notifikasi"
            className={styles.toastCloseBtn}
            onClick={() => setToastNotification(null)}
            type="button"
          >
            ×
          </button>
        </aside>
      ) : null}

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="EXISEL, kembali ke beranda">
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
              <small>Profil siswa</small>
            </span>
          </Link>

          <StudentHeaderNav />

          <div className={styles.accountActions}>
            <AvatarDropdown userName={user.name} initials={initials(user.name)} avatarUrl={user.avatarUrl} />
          </div>
        </div>
      </header>

      <div className={styles.shell} id="profile-content">
        {/* Profile Hero Header Card */}
        <section className={styles.heroCard}>
          <div className={styles.heroAvatarWrap}>
            <div className={styles.heroAvatar}>
              {avatarPreview ? (
                <Image
                  alt={user.name}
                  height={112}
                  src={avatarPreview}
                  width={112}
                />
              ) : (
                <span className={styles.heroAvatarInitials}>{initials(user.name)}</span>
              )}
            </div>
            <button
              className={styles.avatarTriggerBtn}
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              title="Ganti foto profil"
              type="button"
            >
              {isUploadingAvatar ? "Mengunggah..." : "Ganti"}
            </button>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.hiddenFileInput}
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <div className={styles.heroDetails}>
            <div className={styles.heroBadgeRow}>
              <span className={styles.heroRoleBadge}>
                {user.role === "ADMIN" ? "Administrator" : "Siswa Aktif"}
              </span>
              {user.className ? (
                <span className={styles.heroClassBadge}>{user.className}</span>
              ) : null}
            </div>
            <h1 className={styles.heroName}>{user.name}</h1>
            <p className={styles.heroEmail}>{user.email}</p>
            <div className={styles.heroMeta}>
              {user.nis ? (
                <span className={styles.heroMetaItem}>
                  <strong>NIS:</strong> {user.nis}
                </span>
              ) : null}
              <span className={styles.heroMetaItem}>
                <strong>Terdaftar sejak:</strong> {formatDate(user.createdAt)}
              </span>
            </div>
          </div>

          {avatarPreview ? (
            <div className={styles.heroActions}>
              <button
                className={styles.btnRemoveAvatar}
                disabled={isUploadingAvatar}
                onClick={handleRemoveAvatar}
                type="button"
              >
                Hapus Foto
              </button>
            </div>
          ) : null}
        </section>

        {/* 2-Column Grid for Details and Settings */}
        <div className={styles.profileGrid}>
          {/* Left Column: Info & Ekskul */}
          <div className={styles.gridCol}>
            {/* Identity Info Card */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>📋</div>
                <div>
                  <h2 className={styles.cardTitle}>Data Identitas</h2>
                  <p className={styles.cardDesc}>Informasi akun siswa SMKN 69 Jakarta</p>
                </div>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Nama Lengkap</span>
                  <span className={styles.infoValue}>{user.name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email Akun</span>
                  <span className={styles.infoValue}>{user.email}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>NIS</span>
                  <span className={styles.infoValue}>{user.nis || "—"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Kelas</span>
                  <span className={styles.infoValue}>{user.className || "Belum ditentukan"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Status Pengguna</span>
                  <span className={styles.infoBadgeGreen}>Aktif</span>
                </div>
              </div>
            </section>

            {/* Extracurriculars Enrolled Card */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>🏆</div>
                <div>
                  <h2 className={styles.cardTitle}>Ekstrakurikuler Saya</h2>
                  <p className={styles.cardDesc}>Ekskul yang kamu ikuti semester ini</p>
                </div>
              </div>

              {user.enrollments.length > 0 ? (
                <div className={styles.enrollmentList}>
                  {user.enrollments.map((item) => (
                    <div className={styles.enrollmentItem} key={item.id}>
                      <div className={styles.enrollmentIcon}>⚡</div>
                      <div className={styles.enrollmentDetails}>
                        <strong>{item.extracurricular.name}</strong>
                        <small>Terdaftar: {formatDate(item.registeredAt)}</small>
                      </div>
                      <span
                        className={
                          item.status === "APPROVED"
                            ? styles.statusApproved
                            : styles.statusPending
                        }
                      >
                        {item.status === "APPROVED" ? "Terverifikasi" : "Menunggu"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyEskul}>
                  <p>Kamu belum terdaftar di ekstrakurikuler manapun.</p>
                  <Link className={styles.btnExplore} href="/ekstrakulikuler">
                    Jelajahi Ekskul →
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Security / Password */}
          <div className={styles.gridCol}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>🔒</div>
                <div>
                  <h2 className={styles.cardTitle}>Keamanan & Password</h2>
                  <p className={styles.cardDesc}>Perbarui kata sandi akunmu secara berkala</p>
                </div>
              </div>

              {user.mustChangePassword ? (
                <div className={styles.warnNotice}>
                  <strong>Perhatian:</strong> Akunmu disarankan untuk mengganti kata sandi default.
                </div>
              ) : null}

              <form className={styles.passwordForm} onSubmit={handleSubmitPassword}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="current-password">
                    Password Saat Ini
                  </label>
                  <input
                    autoComplete="current-password"
                    className={styles.fieldInput}
                    id="current-password"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="new-password">
                    Password Baru
                  </label>
                  <input
                    autoComplete="new-password"
                    className={styles.fieldInput}
                    id="new-password"
                    maxLength={128}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="confirm-password">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    autoComplete="new-password"
                    className={styles.fieldInput}
                    id="confirm-password"
                    maxLength={128}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                  />
                </div>

                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      checked={showPassword}
                      className={styles.checkbox}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      type="checkbox"
                    />
                    <span>Tampilkan karakter password</span>
                  </label>
                </div>

                {passwordStatus?.success ? (
                  <div className={`${styles.alert} ${styles.alertSuccess}`}>
                    <span className={styles.alertIcon}>✓</span> {passwordStatus.message}
                  </div>
                ) : null}
                {passwordStatus?.error ? (
                  <div className={`${styles.alert} ${styles.alertError}`}>
                    <span className={styles.alertIcon}>⚠️</span> {passwordStatus.error}
                  </div>
                ) : null}

                <button
                  className={styles.btnSubmit}
                  disabled={
                    isPending ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  type="submit"
                >
                  {isPending ? "Menyimpan..." : "Simpan Password Baru →"}
                </button>
              </form>
            </section>

            {/* Quick Tips / Info Box */}
            <section className={styles.tipsCard}>
              <h3 className={styles.tipsTitle}>💡 Tips Keamanan Akun</h3>
              <ul className={styles.tipsList}>
                <li>Gunakan kombinasi huruf kapital, angka, dan simbol.</li>
                <li>Jangan bagikan password akun EXISEL kepada siapapun.</li>
                <li>Pastikan selalu logout setelah menggunakan komputer umum di lab sekolah.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong>EXISEL</strong>
            <p>Sistem Informasi & Manajemen Ekstrakurikuler SMKN 69 Jakarta</p>
          </div>
          <span className={styles.footerCopy}>© 2026 SMK Negeri 69 Jakarta. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

