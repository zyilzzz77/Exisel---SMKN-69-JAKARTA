import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { registerExtracurricularAction } from "@/actions/enrollment";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { EnrollmentSubmitButton } from "@/components/forms/enrollment-submit-button";
import { StudentNavigation } from "@/components/student-navigation";
import { getStudentRegistrationData } from "@/lib/auth/dal";
import styles from "./registration.module.css";

export const metadata: Metadata = {
  title: "Daftar Ekstrakurikuler — EXISEL",
  description:
    "Konfirmasi data siswa dan daftar ekstrakurikuler pilihan di EXISEL.",
};

const dayLabels: Record<string, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
};

const statusMessages: Record<
  string,
  { title: string; message: string; tone: "success" | "notice" | "error" }
> = {
  success: {
    title: "Pendaftaran diterima.",
    message: "Kamu resmi terdaftar. Tinggal hadir sesuai jadwal ekskul.",
    tone: "success",
  },
  already: {
    title: "Kamu sudah terdaftar.",
    message: "Tidak perlu mendaftar lagi—langsung hadir sesuai jadwal.",
    tone: "notice",
  },
  full: {
    title: "Kuota ekskul sudah penuh.",
    message: "Pilih ekskul lain yang masih mempunyai kursi tersedia.",
    tone: "notice",
  },
  "missing-nis": {
    title: "NIS belum tersedia.",
    message: "Hubungi admin sekolah agar identitas akunmu dapat dilengkapi.",
    tone: "error",
  },
  unavailable: {
    title: "Pendaftaran belum dapat diproses.",
    message: "Coba lagi beberapa saat atau hubungi admin sekolah.",
    tone: "error",
  },
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
  }).format(value);
}

export default async function ExtracurricularRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    ekskul?: string | string[];
    status?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const selectedId = getFirst(query.ekskul);
  const status = getFirst(query.status);
  const { user, extracurricular, enrollment } =
    await getStudentRegistrationData(selectedId);
  const userInitial = user.name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className={styles.page}>
      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        Pendaftaran ekstrakurikuler siswa
        <span className={styles.announcementNote}>Data akun terisi otomatis</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard" aria-label="EXISEL dashboard">
            <span className={styles.brandLogo}>
              <Image
                alt="Logo SMK Negeri 69 Jakarta"
                height={112}
                priority
                src="/logo-smkn69.png"
                width={88}
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>EXISEL</strong>
              <small>SMKN 69 Jakarta</small>
            </span>
          </Link>

          <StudentNavigation
            activeItem="programs"
            className={styles.nav}
          />

          <div className={styles.accountArea}>
            <span className={styles.avatar} aria-hidden="true">
              {userInitial}
            </span>
            <ConfirmLogoutButton className={styles.logoutButton} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          <Link href="/ekstrakurikuler">Semua ekskul</Link>
          <span aria-hidden="true">/</span>
          <strong>Form pendaftaran</strong>
        </div>

        {!extracurricular ? (
          <section className={styles.emptyState}>
            <span className={styles.emptyNumber}>00</span>
            <div>
              <p className={styles.eyebrow}>Belum ada pilihan</p>
              <h1>Pilih ekskul terlebih dahulu.</h1>
              <p>
                Buka katalog, lalu tekan tombol daftar pada ekskul yang ingin
                kamu ikuti.
              </p>
            </div>
            <Link href="/ekstrakurikuler">
              Lihat semua ekskul <span aria-hidden="true">→</span>
            </Link>
          </section>
        ) : (
          <RegistrationContent
            enrollment={enrollment}
            extracurricular={extracurricular}
            status={status}
            user={user}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL</strong>
          <p>Data terverifikasi dari akun sekolah.</p>
          <span>© 2026 SMKN 69 Jakarta</span>
        </div>
      </footer>
    </div>
  );
}

type RegistrationContentProps = {
  enrollment: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    registeredAt: Date;
  } | null;
  extracurricular: NonNullable<
    Awaited<ReturnType<typeof getStudentRegistrationData>>["extracurricular"]
  >;
  status?: string;
  user: Awaited<ReturnType<typeof getStudentRegistrationData>>["user"];
};

function RegistrationContent({
  enrollment,
  extracurricular,
  status,
  user,
}: RegistrationContentProps) {
  const remainingSeats = Math.max(
    extracurricular.capacity - extracurricular._count.enrollments,
    0,
  );
  const activeEnrollment =
    enrollment?.status === "PENDING" || enrollment?.status === "APPROVED";
  const canSubmit = Boolean(user.nis) && remainingSeats > 0 && !activeEnrollment;
  const registrationAction = registerExtracurricularAction.bind(
    null,
    extracurricular.id,
  );
  const statusMessage = status ? statusMessages[status] : undefined;

  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Formulir siswa / 2026</p>
          <h1>
            Daftar <span>{extracurricular.name}</span>
          </h1>
          <p>
            Periksa data yang terisi otomatis, lalu daftar. Jika kuota masih
            tersedia, kamu langsung diterima dan tinggal hadir sesuai jadwal.
          </p>
        </div>
        <ol className={styles.steps}>
          <li>
            <span>01</span>
            <strong>Pilih ekskul</strong>
            <small>Selesai</small>
          </li>
          <li>
            <span>02</span>
            <strong>Periksa data</strong>
            <small>Sekarang</small>
          </li>
          <li>
            <span>03</span>
            <strong>Langsung diterima</strong>
            <small>Otomatis</small>
          </li>
        </ol>
      </section>

      {statusMessage ? (
        <div
          className={`${styles.statusBanner} ${styles[statusMessage.tone]}`}
          role="status"
        >
          <span aria-hidden="true">!</span>
          <div>
            <strong>{statusMessage.title}</strong>
            <p>{statusMessage.message}</p>
          </div>
        </div>
      ) : null}

      <section className={styles.registrationGrid}>
        <form className={styles.formCard} action={registrationAction}>
          <div className={styles.formHeading}>
            <div>
              <p className={styles.eyebrow}>Identitas pendaftar</p>
              <h2>Data kamu</h2>
            </div>
            <span>Otomatis & terkunci</span>
          </div>

          <div className={styles.fieldGrid}>
            <label>
              <span>Nama lengkap</span>
              <input disabled name="name" value={user.name} readOnly />
              <small>Diambil dari akun siswa aktif.</small>
            </label>

            <label>
              <span>NIS</span>
              <input
                disabled
                inputMode="numeric"
                name="nis"
                value={user.nis ?? "Belum tersedia"}
                readOnly
              />
              <small>Terhubung dengan database sekolah.</small>
            </label>

            <label className={styles.fullField}>
              <span>Ekstrakurikuler yang dipilih</span>
              <input
                disabled
                name="extracurricular"
                value={extracurricular.name}
                readOnly
              />
              <small>Terisi dari tombol daftar pada kartu ekskul.</small>
            </label>
          </div>

          <div className={styles.dataNotice}>
            <span aria-hidden="true">✓</span>
            <p>
              Identitas tidak dapat diedit di formulir ini. Jika ada kesalahan,
              hubungi admin sekolah sebelum mengirim pendaftaran.
            </p>
          </div>

          {activeEnrollment ? (
            <div className={styles.existingEnrollment}>
              <strong>
                Status: {enrollment.status === "APPROVED" ? "Disetujui" : "Menunggu"}
              </strong>
              <p>Kamu sudah mempunyai pendaftaran aktif untuk ekskul ini.</p>
              <Link href="/dashboard">Lihat di dashboard →</Link>
            </div>
          ) : (
            <EnrollmentSubmitButton
              className={styles.submitButton}
              disabled={!canSubmit}
            />
          )}

          {!user.nis ? (
            <p className={styles.blockReason}>Pendaftaran ditutup sampai NIS tersedia.</p>
          ) : remainingSeats === 0 && !activeEnrollment ? (
            <p className={styles.blockReason}>Pendaftaran ditutup karena kuota penuh.</p>
          ) : null}
        </form>

        <aside className={styles.programSummary}>
          <div className={styles.summaryTop}>
            <span>Ekskul pilihan</span>
            <strong>{remainingSeats} kursi tersisa</strong>
          </div>
          <h2>{extracurricular.name}</h2>
          <p>{extracurricular.description}</p>

          <div className={styles.scheduleSummary}>
            {extracurricular.schedules.map((schedule) => (
              <div key={`${schedule.day}-${schedule.location}`}>
                <span>{dayLabels[schedule.day]}</span>
                <strong>
                  {formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}
                </strong>
                <small>{schedule.location}</small>
              </div>
            ))}
          </div>

          <dl className={styles.capacitySummary}>
            <div>
              <dt>Terdaftar</dt>
              <dd>{extracurricular._count.enrollments}</dd>
            </div>
            <div>
              <dt>Kapasitas</dt>
              <dd>{extracurricular.capacity}</dd>
            </div>
          </dl>

          <Link href="/ekstrakurikuler">Ganti pilihan ekskul →</Link>
        </aside>
      </section>
    </>
  );
}
