import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { adminLogoutAction } from "@/actions/auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { getAdminAttendanceReports } from "@/lib/attendance/dal";
import styles from "../dashboard/admin-dashboard.module.css";

export const metadata: Metadata = {
  title: "Laporan Kehadiran — EXISEL",
  description:
    "Analisis keaktifan siswa dan laporan Excel kehadiran per ekstrakurikuler.",
};

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

function formatPercentage(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function activityClass(level: string) {
  if (level === "Sangat aktif") return styles.veryActiveBadge;
  if (level === "Aktif") return styles.activeBadge;
  if (level === "Perlu ditingkatkan") return styles.improveBadge;
  return styles.attentionBadge;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function AdminAttendanceReports({
  searchParams,
}: {
  searchParams: Promise<{ ekskul?: string | string[] }>;
}) {
  const query = await searchParams;
  const data = await getAdminAttendanceReports(getFirst(query.ekskul));
  const selectedProgramName =
    data.selectedExtracurricularId === "ALL"
      ? "Semua ekskul"
      : data.extracurriculars.find(
          (program) => program.id === data.selectedExtracurricularId,
        )?.name ?? "Ekskul terpilih";

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#activity-table">
        Lewati ke analisis siswa
      </a>

      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        Portal laporan admin & guru
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
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
            <span>
              <strong>EXISEL</strong>
              <small>Laporan kehadiran</small>
            </span>
          </Link>

          <AdminNavigation activeItem="reports" className={styles.navigation} />

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
                Keluar ↗
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={`${styles.hero} ${styles.reportHero}`}>
          <div>
            <p className={styles.eyebrow}>Laporan historis / sampai hari ini</p>
            <h1>
              Data yang <span>bermakna.</span>
            </h1>
            <p>
              Pantau tingkat keaktifan siswa dan unduh laporan Excel lengkap
              untuk setiap ekstrakurikuler.
            </p>
          </div>
        </section>

        <section
          className={styles.analyticsSection}
          aria-labelledby="analytics-title"
        >
          <div className={styles.analyticsHeading}>
            <div>
              <p className={styles.eyebrow}>Analisis kehadiran</p>
              <h2 id="analytics-title">Keaktifan siswa per ekskul.</h2>
              <p>
                Jumlah hadir dan tingkat keaktifan dihitung dari seluruh agenda
                sejak siswa resmi bergabung.
              </p>
            </div>
            <span className={styles.analyticsScope}>{selectedProgramName}</span>
          </div>

          <form
            className={`${styles.filters} ${styles.reportFilters}`}
            action="/admin/laporan"
            method="get"
          >
            <label>
              <span>Analisis ekstrakurikuler</span>
              <select
                defaultValue={data.selectedExtracurricularId}
                name="ekskul"
              >
                <option value="ALL">Semua ekskul</option>
                {data.extracurriculars.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Tampilkan analisis →</button>
          </form>

          <div className={styles.analyticsKpis}>
            <article>
              <span>Keanggotaan</span>
              <strong>{data.analytics.summary.memberships}</strong>
              <small>anggota aktif</small>
            </article>
            <article>
              <span>Agenda terlaksana</span>
              <strong>{data.analytics.summary.agenda}</strong>
              <small>sesi ekskul</small>
            </article>
            <article>
              <span>Jumlah hadir</span>
              <strong>{data.analytics.summary.present}</strong>
              <small>catatan hadir</small>
            </article>
            <article className={styles.rateKpi}>
              <span>Tingkat kehadiran</span>
              <strong>
                {formatPercentage(data.analytics.summary.attendanceRate)}
              </strong>
              <small>hadir ÷ total agenda anggota</small>
            </article>
          </div>

          <div className={styles.exportPanel}>
            <div className={styles.exportIntro}>
              <span aria-hidden="true">XLSX</span>
              <div>
                <h3>Download laporan per ekskul</h3>
                <p>
                  Setiap file berisi ringkasan, daftar anggota, status setiap
                  tanggal agenda, tingkat keaktifan, dan detail alasan izin.
                </p>
              </div>
            </div>
            <div className={styles.exportGrid}>
              {data.analytics.programs.map((program) => (
                <article className={styles.exportCard} key={program.id}>
                  <div>
                    <span>
                      {program.members} anggota · {program.agenda} agenda
                    </span>
                    <h4>{program.name}</h4>
                    <p>
                      {program.present} hadir ·{" "}
                      {formatPercentage(program.attendanceRate)} kehadiran
                    </p>
                  </div>
                  <a
                    aria-label={`Download laporan Excel ${program.name}`}
                    href={`/admin/kehadiran/export?ekskul=${encodeURIComponent(
                      program.id,
                    )}`}
                  >
                    Download Excel <span aria-hidden="true">↓</span>
                  </a>
                  <Link
                    className={styles.generateCodeLink}
                    href={`/admin/esktrakulikuler/${slugify(program.name)}`}
                  >
                    Generate kode <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.activityPanel} id="activity-table">
            <div className={styles.activityHeader}>
              <div>
                <p className={styles.eyebrow}>Peringkat keaktifan</p>
                <h3>Analisis per siswa</h3>
              </div>
              <span>{data.analytics.students.length} siswa ditampilkan</span>
            </div>

            {data.analytics.students.length > 0 ? (
              <div className={styles.activityTableFrame}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Siswa</th>
                      <th scope="col">Ekskul</th>
                      <th scope="col">Hadir</th>
                      <th scope="col">Izin</th>
                      <th scope="col">Tidak hadir</th>
                      <th scope="col">Kehadiran</th>
                      <th scope="col">Keaktifan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analytics.students.map((row) => (
                      <tr key={`${row.userId}-${row.extracurricularId}`}>
                        <td>
                          <strong>{row.studentName}</strong>
                          <span>{row.className ?? "Kelas belum tercatat"}</span>
                        </td>
                        <td>{row.extracurricularName}</td>
                        <td>{row.present}</td>
                        <td>{row.excused}</td>
                        <td>{row.absent}</td>
                        <td>
                          <strong>{formatPercentage(row.attendanceRate)}</strong>
                          <span>{row.totalAgenda} agenda</span>
                        </td>
                        <td>
                          <span
                            className={`${styles.activityBadge} ${activityClass(
                              row.activityLevel,
                            )}`}
                          >
                            {row.activityLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.analyticsEmpty}>
                Belum ada anggota atau agenda yang dapat dianalisis.
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL / LAPORAN</strong>
          <p>Analisis dan arsip kehadiran ekstrakurikuler siswa.</p>
          <span>© 2026 SMKN 69 Jakarta</span>
        </div>
      </footer>
    </main>
  );
}
