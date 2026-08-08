import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { AttendanceForm } from "@/components/forms/attendance-form";
import { StudentNavigation } from "@/components/student-navigation";
import { TypewriterHeading } from "@/components/typewriter-heading";
import { getStudentAttendanceData } from "@/lib/attendance/dal";
import styles from "./attendance.module.css";

export const metadata: Metadata = {
  title: "Kehadiran Ekskul — EXISEL",
  description: "Isi status hadir atau izin untuk kegiatan ekstrakurikuler hari ini.",
};

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
    .format(value)
    .replace(".", ":");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ ekskul?: string | string[] }>;
}) {
  const query = await searchParams;
  const data = await getStudentAttendanceData(getFirst(query.ekskul));
  const selectedProgram = data.selectedProgram;
  const schedule = selectedProgram?.schedules[0];

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#attendance-content">
        Lewati ke form kehadiran
      </a>

      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        <span className={styles.announcementText}>
          Kehadiran ekskul / {data.formattedDate}
        </span>
        <span className={styles.announcementNote}>Waktu Jakarta</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard" aria-label="EXISEL dashboard">
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
              <small>Kehadiran siswa</small>
            </span>
          </Link>

          <StudentNavigation
            activeItem="attendance"
            className={styles.navigation}
          />

          <div className={styles.accountActions}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(data.user.name)}
            </span>
            <ConfirmLogoutButton className={styles.logoutButton} />
          </div>
        </div>
      </header>

      <div className={styles.shell} id="attendance-content">
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Presensi mandiri / Hari kegiatan</p>
            <TypewriterHeading
              highlightText="Jujur & tepat."
              mainText="Isi kehadiran."
            />
          </div>
          <div className={styles.heroNote}>
            <span aria-hidden="true">01</span>
            <p>
              Nama dan kelasmu sudah terisi otomatis. Pilih Hadir atau Izin;
              alasan wajib ditulis jika izin. Absensi hanya bisa dikirim satu kali.
            </p>
          </div>
        </section>

        {data.eligiblePrograms.length > 1 ? (
          <nav className={styles.programTabs} aria-label="Pilih ekskul hari ini">
            {data.eligiblePrograms.map((program) => (
              <Link
                className={program.id === selectedProgram?.id ? styles.activeTab : ""}
                href={`/kehadiran?ekskul=${encodeURIComponent(program.id)}`}
                key={program.id}
              >
                {program.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {selectedProgram && schedule ? (
          <section className={styles.attendanceGrid}>
            <AttendanceForm
              className={data.user.className ?? "Kelas belum tercatat"}
              existingAttendance={selectedProgram.attendance}
              attendanceSessionActive={Boolean(selectedProgram.attendanceCodeExpiresAt)}
              extracurricularId={selectedProgram.id}
              extracurricularName={selectedProgram.name}
              key={`${selectedProgram.id}-${selectedProgram.attendance?.status ?? "new"}`}
              studentName={data.user.name}
            />

            <aside className={styles.scheduleCard}>
              <div className={styles.scheduleTop}>
                <span>Jadwal hari ini</span>
                <strong>{selectedProgram.attendance ? "Sudah diisi" : "Belum diisi"}</strong>
              </div>
              <p className={styles.cardEyebrow}>{data.formattedDate}</p>
              <h2>{selectedProgram.name}</h2>
              <p>{selectedProgram.description}</p>

              <dl className={styles.scheduleData}>
                <div>
                  <dt>Waktu</dt>
                  <dd>
                    {formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}
                  </dd>
                </div>
                <div>
                  <dt>Lokasi</dt>
                  <dd>{schedule.location}</dd>
                </div>
                <div>
                  <dt>Status terakhir</dt>
                  <dd>
                    {selectedProgram.attendance?.status === "PRESENT"
                      ? "Hadir"
                      : selectedProgram.attendance?.status === "EXCUSED"
                        ? "Izin"
                        : selectedProgram.attendance?.status === "ABSENT"
                          ? "Tidak hadir"
                          : "Belum mengisi"}
                  </dd>
                </div>
              </dl>

              <div className={styles.adminNotice}>
                <span aria-hidden="true">✓</span>
                <p>
                  Setelah submit, data langsung tersedia untuk admin/guru dan
                  tidak dapat diubah.
                </p>
              </div>
            </aside>
          </section>
        ) : (
          <section className={styles.emptyState}>
            <span aria-hidden="true">00</span>
            <div>
              <p className={styles.eyebrow}>Tidak ada form aktif</p>
              <h2>Tidak ada jadwal ekskulmu hari ini.</h2>
              <p>
                Form kehadiran hanya terbuka pada hari yang sesuai dengan jadwal
                ekskul terdaftarmu.
              </p>
            </div>
            <Link href="/dashboard">Kembali ke dashboard →</Link>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL</strong>
          <p>Kehadiran tercatat. Kegiatan terpantau.</p>
          <span>© 2026 SMKN 69 Jakarta</span>
        </div>
      </footer>
    </main>
  );
}
