import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { adminLogoutAction } from "@/actions/auth";
import { getAdminAttendanceDashboard } from "@/lib/attendance/dal";
import styles from "./admin-dashboard.module.css";

export const metadata: Metadata = {
  title: "Monitoring Kehadiran — EXISEL",
  description: "Dashboard admin dan guru untuk memantau kehadiran siswa.",
};

const statusLabels = {
  PRESENT: "Hadir",
  EXCUSED: "Izin",
  ABSENT: "Tidak hadir",
  MISSING: "Belum mengisi",
} as const;

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatSubmittedAt(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(".", ":");
}

export default async function AdminAttendanceDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    tanggal?: string | string[];
    ekskul?: string | string[];
    status?: string | string[];
    q?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const data = await getAdminAttendanceDashboard({
    date: getFirst(query.tanggal),
    extracurricularId: getFirst(query.ekskul),
    status: getFirst(query.status),
    search: getFirst(query.q),
  });
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#attendance-table">
        Lewati ke tabel kehadiran
      </a>

      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        Portal monitoring admin & guru
        <span className={styles.announcementNote}>PostgreSQL aktif</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/admin/dashboard">
            <span className={styles.brandLogo}>
              <Image
                alt="Logo SMK Negeri 69 Jakarta"
                height={948}
                priority
                src="/logo-smkn69.png"
                width={758}
              />
            </span>
            <span>
              <strong>EXISEL</strong>
              <small>Monitoring kehadiran</small>
            </span>
          </Link>

          <nav className={styles.navigation} aria-label="Navigasi admin">
            <Link className={styles.activeNav} href="/admin/dashboard">
              Kehadiran
            </Link>
            <Link href="/admin/laporan">Laporan</Link>
            <Link href="/ekstrakurikuler">Katalog ekskul</Link>
          </nav>

          <div className={styles.accountActions}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(data.admin.name)}
            </span>
            <div className={styles.accountCopy}>
              <strong>{data.admin.name}</strong>
              <span>Admin / Guru</span>
            </div>
            <form action={adminLogoutAction}>
              <button className={styles.logoutButton} type="submit">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={`${styles.hero} ${styles.soloHero}`}>
          <div>
            <p className={styles.eyebrow}>Monitoring harian / {data.formattedDate}</p>
            <h1>
              Kehadiran <span>terpantau.</span>
            </h1>
            <p>
              Lihat siswa yang hadir, izin beserta alasannya, tidak hadir
              otomatis, dan yang belum mengisi untuk jadwal hari ini.
            </p>
            <Link className={styles.reportCta} href="/admin/laporan">
              Cek laporan Excel <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className={styles.monitoringSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Daftar siswa</p>
              <h2>Status kehadiran</h2>
            </div>
            <span>{data.rows.length} hasil ditampilkan</span>
          </div>

          <form className={styles.filters} action="/admin/dashboard" method="get">
            <label>
              <span>Tanggal</span>
              <input defaultValue={data.dateKey} name="tanggal" type="date" />
            </label>
            <label>
              <span>Ekstrakurikuler</span>
              <select defaultValue={data.selectedExtracurricularId} name="ekskul">
                <option value="ALL">Semua ekskul</option>
                {data.extracurriculars.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select defaultValue={data.selectedStatus} name="status">
                <option value="ALL">Semua status</option>
                <option value="PRESENT">Hadir</option>
                <option value="EXCUSED">Izin</option>
                <option value="ABSENT">Tidak hadir</option>
                <option value="MISSING">Belum mengisi</option>
              </select>
            </label>
            <label className={styles.searchField}>
              <span>Cari siswa / kelas</span>
              <input
                defaultValue={data.search}
                maxLength={80}
                name="q"
                placeholder="Nama, NIS, kelas..."
                type="search"
              />
            </label>
            <button type="submit">Terapkan filter →</button>
          </form>

          <div className={styles.tableFrame} id="attendance-table">
            {data.rows.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Siswa</th>
                    <th scope="col">Kelas</th>
                    <th scope="col">Ekskul</th>
                    <th scope="col">Status</th>
                    <th scope="col">Alasan izin</th>
                    <th scope="col">Submit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.userId}-${row.extracurricularId}`}>
                      <td>
                        <strong>{row.studentName}</strong>
                        <span>NIS {row.nis ?? "—"}</span>
                      </td>
                      <td>{row.className ?? "—"}</td>
                      <td>{row.extracurricularName}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            row.status === "PRESENT"
                              ? styles.presentBadge
                              : row.status === "EXCUSED"
                                ? styles.excusedBadge
                                : row.status === "ABSENT"
                                  ? styles.absentBadge
                                  : styles.missingBadge
                          }`}
                        >
                          {statusLabels[row.status]}
                        </span>
                      </td>
                      <td className={styles.reasonCell}>{row.reason ?? "—"}</td>
                      <td>
                        {row.status === "ABSENT"
                          ? "Otomatis"
                          : formatSubmittedAt(row.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyTable}>
                <span aria-hidden="true">?</span>
                <div>
                  <strong>Belum ada data yang cocok.</strong>
                  <p>Ubah tanggal atau filter untuk melihat data lainnya.</p>
                </div>
                <Link href="/admin/dashboard">Reset filter →</Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL / ADMIN</strong>
          <p>Monitoring kehadiran ekstrakurikuler siswa.</p>
          <span>© 2026 SMKN 69 Jakarta</span>
        </div>
      </footer>
    </main>
  );
}
