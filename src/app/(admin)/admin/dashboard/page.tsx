import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { adminLogoutAction } from "@/actions/auth";
import { AdminNavigation } from "@/components/admin-navigation";
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

const programPresentation: Record<
  string,
  {
    tone: "blue" | "navy" | "orange" | "pink" | "white" | "lavender";
    logo?: string;
  }
> = {
  PMR: { tone: "blue", logo: "/logo-pmr.webp" },
  "English Club": { tone: "pink", logo: "/logo-english-club.webp" },
  Nihon: { tone: "white", logo: "/logo-nihon.webp" },
  Basket: { tone: "lavender", logo: "/logo-basket.webp" },
  ITC: { tone: "navy", logo: "/logo-itc.webp" },
  Paskibra: { tone: "blue", logo: "/logo-paskibra.webp" },
  Pramuka: { tone: "orange", logo: "/logo-pramuka.webp" },
  Futsal: { tone: "white", logo: "/logo-futsal.webp" },
};

const programToneClasses = {
  blue: styles.programBlue,
  navy: styles.programNavy,
  orange: styles.programOrange,
  pink: styles.programPink,
  white: styles.programWhite,
  lavender: styles.programLavender,
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

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

  const todayPrograms = data.extracurriculars.filter(
    (program) => program.schedules.length > 0,
  );

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#attendance-table">
        Lewati ke tabel kehadiran
      </a>

      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        Portal monitoring admin & guru
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
              <small>Monitoring kehadiran</small>
            </span>
          </Link>

          <AdminNavigation activeItem="attendance" className={styles.navigation} />

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
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Monitoring harian / {data.formattedDate}</p>
            <h1>
              Kehadiran <span>terpantau.</span>
            </h1>
            <p>
              Lihat siswa yang hadir, izin beserta alasannya, tidak hadir
              otomatis, dan yang belum mengisi untuk jadwal hari ini.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.reportCta} href="/admin/laporan">
                Cek laporan Excel <span aria-hidden="true">→</span>
              </Link>
              {todayPrograms.length > 0 && (
                <a className={styles.secondaryLink} href="#active-agendas">
                  Lihat agenda ekskul <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>
          </div>

          <div className={styles.heroPoster} aria-label="Ringkasan monitoring harian">
            <div className={styles.posterTop}>
              <span>SMK Negeri 69 Jakarta</span>
              <strong>Live Monitoring</strong>
            </div>
            <div className={styles.posterMain}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} aria-hidden="true" /> Live Presensi
              </span>
              <strong>{data.stats.scheduled}</strong>
              <p>Siswa Terjadwal Hari Ini</p>
              <div className={styles.posterDetails}>
                <span>Hadir: {data.stats.present}</span>
                <span>Izin: {data.stats.excused}</span>
                <span>Absen: {data.stats.absent}</span>
              </div>
            </div>
            <div className={styles.posterBottom}>
              <span>Pantau status & cetak laporan</span>
              <Link href="/admin/laporan" aria-label="Ke halaman laporan">
                ↗
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.stats} aria-label="Ringkasan statistik kehadiran">
          <article>
            <span className={styles.statIndex}>01</span>
            <div>
              <p>Terjadwal</p>
              <strong>{data.stats.scheduled}</strong>
            </div>
          </article>
          <article className={styles.presentStat}>
            <span className={styles.statIndex}>02</span>
            <div>
              <p>Siswa hadir</p>
              <strong>{data.stats.present}</strong>
            </div>
          </article>
          <article className={styles.excusedStat}>
            <span className={styles.statIndex}>03</span>
            <div>
              <p>Siswa izin</p>
              <strong>{data.stats.excused}</strong>
            </div>
          </article>
          <article className={styles.absentStat}>
            <span className={styles.statIndex}>04</span>
            <div>
              <p>Tidak hadir</p>
              <strong>{data.stats.absent}</strong>
            </div>
          </article>
          <article className={styles.missingStat}>
            <span className={styles.statIndex}>05</span>
            <div>
              <p>Belum mengisi</p>
              <strong>{data.stats.missing}</strong>
            </div>
          </article>
        </section>

        {todayPrograms.length > 0 && (
          <section
            className={styles.agendaSection}
            id="active-agendas"
            aria-labelledby="active-agendas-title"
          >
            <div className={styles.agendaSectionHeading}>
              <div>
                <p className={styles.eyebrow}>Agenda hari ini</p>
                <h2 id="active-agendas-title">Ekstrakurikuler aktif</h2>
              </div>
              <span>{todayPrograms.length} ekskul terjadwal</span>
            </div>

            <div className={styles.agendaGrid}>
              {todayPrograms.map((program) => {
                const presentation = programPresentation[program.name] ?? {
                  tone: "blue",
                };
                const toneClass =
                  programToneClasses[presentation.tone] ?? styles.programBlue;
                const programRows = data.rows.filter(
                  (r) => r.extracurricularName === program.name,
                );
                const presentCount = programRows.filter(
                  (r) => r.status === "PRESENT",
                ).length;
                const totalCount = programRows.length;

                return (
                  <article
                    className={`${styles.agendaCard} ${toneClass}`}
                    key={program.id}
                  >
                    <div className={styles.agendaCardHeader}>
                      {presentation.logo ? (
                        <span className={styles.agendaLogo}>
                          <Image
                            alt={`Logo ${program.name}`}
                            height={72}
                            src={presentation.logo}
                            width={72}
                          />
                        </span>
                      ) : (
                        <span className={styles.agendaBadge}>Ekskul</span>
                      )}
                      <span className={styles.agendaBadge}>
                        {totalCount > 0
                          ? `${presentCount}/${totalCount} hadir`
                          : "Jadwal aktif"}
                      </span>
                    </div>

                    <h3>{program.name}</h3>
                    <p>
                      Hari ini terjadwal latihan · Presensi dibuka untuk siswa
                      terdaftar.
                    </p>

                    <div className={styles.agendaActions}>
                      <Link
                        className={styles.generateBtn}
                        href={`/admin/esktrakulikuler/${slugify(program.name)}`}
                      >
                        Generate kode presensi <span aria-hidden="true">→</span>
                      </Link>
                      <Link
                        className={styles.filterBtn}
                        href={`/admin/dashboard?ekskul=${encodeURIComponent(
                          program.id,
                        )}#attendance-table`}
                      >
                        Filter presensi siswa <span aria-hidden="true">↓</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

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
