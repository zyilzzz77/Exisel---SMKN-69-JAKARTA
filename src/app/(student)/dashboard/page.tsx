import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { StudentHeaderNav } from "@/components/landing-navigation";
import { TypewriterGreeting } from "@/components/typewriter-greeting";
import { getStudentDashboard } from "@/lib/auth/dal";
import {
  getJakartaDateKey,
  getSchoolDay,
  getSchoolWeekRange,
  shiftSchoolDateKey,
  toDatabaseDate,
} from "@/lib/school-date";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard Siswa — EXISEL",
  description: "Pantau pilihan, jadwal, dan status ekstrakurikuler siswa.",
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

const statusLabels = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Terdaftar",
  REJECTED: "Tidak disetujui",
} as const;

const schoolWeekDays = [
  { day: "MONDAY", label: "Senin" },
  { day: "TUESDAY", label: "Selasa" },
  { day: "WEDNESDAY", label: "Rabu" },
  { day: "THURSDAY", label: "Kamis" },
  { day: "FRIDAY", label: "Jumat" },
] as const;

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

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatWeekRange(startDateKey: string, endDateKey: string) {
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
  const year = toDatabaseDate(endDateKey).getUTCFullYear();

  return `${dateFormatter.format(toDatabaseDate(startDateKey))} – ${dateFormatter.format(
    toDatabaseDate(endDateKey),
  )} ${year}`;
}

export default async function DashboardPage() {
  const { user, extracurriculars } = await getStudentDashboard();
  const firstName = user.name.split(/\s+/).filter(Boolean)[0] || "Siswa";
  const approvedEnrollments = user.enrollments.filter(
    (enrollment) => enrollment.status === "APPROVED",
  );
  const fallbackEnrollment = approvedEnrollments[0] ?? user.enrollments[0];
  const jakartaDateKey = getJakartaDateKey();
  const todayDay = getSchoolDay(jakartaDateKey);
  const todayEnrollment = approvedEnrollments.find(
    (enrollment) =>
      enrollment.extracurricular.schedules.some(
        (schedule) => schedule.day === todayDay,
      ),
  );
  const todaySchedule = todayEnrollment?.extracurricular.schedules.find(
    (schedule) => schedule.day === todayDay,
  );
  const activeEnrollment = todayEnrollment ?? fallbackEnrollment;
  const todayAttendance = todayEnrollment?.extracurricular.attendances[0];
  const { mondayDateKey, fridayDateKey, isAfterFriday } =
    getSchoolWeekRange(jakartaDateKey);
  const weekDays = schoolWeekDays.map((weekDay, index) => {
    const dateKey = shiftSchoolDateKey(mondayDateKey, index);
    const events = approvedEnrollments.flatMap((enrollment) =>
      enrollment.extracurricular.schedules
        .filter((schedule) => schedule.day === weekDay.day)
        .map((schedule) => ({
          extracurricularId: enrollment.extracurricular.id,
          extracurricularName: enrollment.extracurricular.name,
          schedule,
        })),
    );

    return {
      ...weekDay,
      dateKey,
      dateNumber: Number(dateKey.slice(8, 10)),
      isToday: dateKey === jakartaDateKey,
      events,
    };
  });
  const weeklyScheduleCount = weekDays.reduce(
    (total, weekDay) => total + weekDay.events.length,
    0,
  );
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#dashboard-content">
        Lewati ke konten dashboard
      </a>

      <div className={styles.announcement} role="status">
        <span className={styles.liveDot} aria-hidden="true" />
        Pendaftaran semester ganjil sedang dibuka
        <span className={styles.announcementNote}>Pilih ekskulmu sekarang</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="EXISEL, kembali ke beranda">
            <span className={styles.brandLogo}>
              <Image
                src="/logo-smkn69.webp"
                alt="Logo SMK Negeri 69 Jakarta"
                width={758}
                height={948}
                priority
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>EXISEL</strong>
              <small>Dashboard siswa</small>
            </span>
          </Link>

          <StudentHeaderNav activeItem="dashboard" />

          <div className={styles.accountActions}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <ConfirmLogoutButton className={styles.logoutButton} />
          </div>
        </div>
      </header>

      <div className={styles.shell} id="dashboard-content">
        <section className={styles.hero} aria-labelledby="welcome-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Dashboard siswa / {user.className || "Kelas"}</p>
            <TypewriterGreeting id="welcome-title" name={firstName} />
            <p>
              Kelola pilihan ekskul, cek jadwal latihan, dan pantau statusmu
              dari satu tempat.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/ekstrakulikuler">
                Jelajahi ekskul <span aria-hidden="true">→</span>
              </Link>
              <a className={styles.textLink} href="#jadwal">
                Lihat jadwalmu <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className={styles.heroPoster} aria-label="Status pendaftaran semester ini">
            <div className={styles.posterTop}>
              <span>Semester ganjil</span>
              <strong>2026 / 2027</strong>
            </div>
            <div className={styles.posterMain}>
              <span className={styles.openBadge}>Pendaftaran dibuka</span>
              <strong>{extracurriculars.length}</strong>
              <p>Ekskul siap kamu jelajahi.</p>
            </div>
            <div className={styles.posterBottom}>
              <span>Pilih sesuai minat</span>
              <span aria-hidden="true">↗</span>
            </div>
          </div>
        </section>

        <section className={styles.stats} aria-label="Ringkasan dashboard">
          <article>
            <span className={styles.statIndex}>01</span>
            <div>
              <p>Pilihanmu</p>
              <strong>{activeEnrollment?.extracurricular.name || "Belum ada"}</strong>
            </div>
          </article>
          <article>
            <span className={styles.statIndex}>02</span>
            <div>
              <p>Status</p>
              <strong>
                {activeEnrollment
                  ? statusLabels[activeEnrollment.status]
                  : "Siap memilih"}
              </strong>
            </div>
          </article>
          <article>
            <span className={styles.statIndex}>03</span>
            <div>
              <p>Jadwal aktif</p>
              <strong>{weeklyScheduleCount} sesi</strong>
            </div>
          </article>
        </section>

        <section className={styles.overviewGrid}>
          <article className={styles.registrationCard} aria-labelledby="registration-title">
            <div className={styles.sectionLabel}>
              <span>01 / STATUSMU</span>
              <span className={activeEnrollment ? styles.statusBlue : styles.statusOrange}>
                {activeEnrollment ? "Aktif" : "Belum memilih"}
              </span>
            </div>

            {activeEnrollment ? (
              <div className={styles.registrationContent}>
                <p className={styles.cardEyebrow}>Ekskul pilihan</p>
                <h2 id="registration-title">{activeEnrollment.extracurricular.name}</h2>
                <p>
                  Status pendaftaranmu: <strong>{statusLabels[activeEnrollment.status]}</strong>.
                </p>
                {todayEnrollment && todaySchedule ? (
                  <div className={styles.attendanceStatus}>
                    <p>
                      Hari ini: <strong>{todayEnrollment.extracurricular.name}</strong>, pukul{" "}
                      {formatTime(todaySchedule.startTime)}.
                    </p>
                    <Link
                      href={`/kehadiran?ekskul=${encodeURIComponent(
                        todayEnrollment.extracurricular.id,
                      )}`}
                      className={styles.secondaryButton}
                    >
                      {todayAttendance ? "Lihat kehadiran" : "Isi kehadiran"}{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ) : (
                  <a href="#jadwal" className={styles.secondaryButton}>
                    {isAfterFriday ? "Cek jadwal minggu depan" : "Cek jadwal minggu ini"}{" "}
                    <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
            ) : (
              <div className={styles.registrationContent}>
                <p className={styles.cardEyebrow}>Mulai langkah pertamamu</p>
                <h2 id="registration-title">Kamu belum memilih ekskul.</h2>
                <p>
                  Ada {extracurriculars.length} kegiatan yang bisa kamu bandingkan berdasarkan
                  minat, jadwal, dan kuota.
                </p>
                <Link href="/ekstrakurikuler" className={styles.secondaryButton}>
                  Pilih sekarang <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </article>

          <article className={styles.scheduleCard} id="jadwal" aria-labelledby="schedule-title">
            <div className={styles.sectionLabel}>
              <span>02 / JADWAL</span>
              <span>{formatWeekRange(mondayDateKey, fridayDateKey)}</span>
            </div>
            <div className={styles.scheduleContent}>
              <div className={styles.scheduleHeading}>
                <div>
                  <p className={styles.cardEyebrow}>Senin sampai Jumat</p>
                  <h2 id="schedule-title">
                    {isAfterFriday ? "Agenda ekskul minggu depan" : "Agenda ekskul minggu ini"}
                  </h2>
                </div>
                <span>{weeklyScheduleCount} agenda</span>
              </div>

              <div
                className={styles.weekCalendar}
                aria-label={
                  isAfterFriday ? "Kalender ekskul minggu depan" : "Kalender ekskul minggu ini"
                }
              >
                {weekDays.map((weekDay) => (
                  <article
                    className={`${styles.weekDay} ${weekDay.events.length > 0 ? styles.weekDayActive : ""
                      } ${weekDay.isToday ? styles.weekDayToday : ""}`}
                    key={weekDay.dateKey}
                    aria-current={weekDay.isToday ? "date" : undefined}
                  >
                    <span>{weekDay.label}</span>
                    <strong>{weekDay.dateNumber}</strong>
                    <small>
                      {weekDay.events.length > 0
                        ? `${weekDay.events.length} ekskul`
                        : "Kosong"}
                    </small>
                  </article>
                ))}
              </div>

              {weeklyScheduleCount > 0 ? (
                <div className={styles.weekAgendaList}>
                  {weekDays.flatMap((weekDay) =>
                    weekDay.events.map((event) => (
                      <article
                        className={styles.weekAgendaItem}
                        key={`${weekDay.dateKey}-${event.extracurricularId}-${event.schedule.id}`}
                      >
                        <time dateTime={weekDay.dateKey}>
                          <strong>{weekDay.label}</strong>
                          <span>{weekDay.dateNumber}</span>
                        </time>
                        <div>
                          <h3>{event.extracurricularName}</h3>
                          <p>
                            {formatTime(event.schedule.startTime)}–
                            {formatTime(event.schedule.endTime)} · {event.schedule.location}
                          </p>
                        </div>
                        {weekDay.isToday ? (
                          <span className={styles.todayBadge}>Hari ini</span>
                        ) : null}
                      </article>
                    )),
                  )}
                </div>
              ) : (
                <p className={styles.emptyWeek}>
                  Belum ada jadwal Senin–Jumat dari ekskul yang kamu ikuti.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className={styles.programSection} id="pilihan" aria-labelledby="program-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Pilihan buatmu</p>
              <h2 id="program-title">Mulai dari yang bikin penasaran.</h2>
            </div>
            <Link href="/ekstrakurikuler" className={styles.allProgramsLink}>
              Lihat semua {extracurriculars.length} ekskul <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.programGrid}>
            {extracurriculars.slice(0, 3).map((program, index) => {
              const schedule = program.schedules[0];
              const presentation = programPresentation[program.name] ?? {
                tone: "white" as const,
              };
              const remainingSeats = Math.max(
                program.capacity - program._count.enrollments,
                0,
              );

              return (
                <Link
                  className={`${styles.programCard} ${programToneClasses[presentation.tone]}`}
                  href={`/eskul/${slugify(program.name)}`}
                  key={program.id}
                  aria-label={`Lihat detail ekskul ${program.name}`}
                >
                  <div className={styles.programTop}>
                    <span>0{index + 1}</span>
                    <span className={styles.seatBadge}>{remainingSeats} kursi</span>
                  </div>
                  <div
                    className={`${styles.programBody} ${presentation.logo ? styles.programBodyWithLogo : ""
                      }`}
                  >
                    <div className={styles.programCopy}>
                      <h3>{program.name}</h3>
                      <p>{program.description}</p>
                    </div>
                    {presentation.logo ? (
                      <span className={styles.programLogo} aria-hidden="true">
                        <Image
                          src={presentation.logo}
                          alt=""
                          width={320}
                          height={320}
                          sizes="(max-width: 760px) 92px, (max-width: 1080px) 104px, 112px"
                        />
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.programMeta}>
                    <p>
                      <span>Jadwal</span>
                      <strong>
                        {schedule
                          ? `${dayLabels[schedule.day]}, ${formatTime(schedule.startTime)}`
                          : "Segera hadir"}
                      </strong>
                    </p>
                    <span className={styles.programArrow} aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.accountSection} id="akun" aria-labelledby="account-title">
          <div className={styles.accountIntro}>
            <span className={styles.largeAvatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <div>
              <p className={styles.eyebrow}>03 / PROFIL SISWA</p>
              <h2 id="account-title">{user.name}</h2>
              <p>{user.className || "Kelas belum tercatat"} · SMKN 69 Jakarta</p>
            </div>
          </div>
          <dl className={styles.accountData}>
            <div>
              <dt>Email akun</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Keamanan</dt>
              <dd>{user.mustChangePassword ? "Password awal aktif" : "Password diperbarui"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL</strong>
          <p>Temukan ekskulmu. Tumbuh bareng.</p>
          <span>© 2026 SMKN 69 Jakarta</span>
        </div>
      </footer>
    </main>
  );
}
