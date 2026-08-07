import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { StudentNavigation } from "@/components/student-navigation";
import { getStudentDashboard } from "@/lib/auth/dal";
import styles from "./ekstrakurikuler.module.css";

export const metadata: Metadata = {
  title: "Pilihan Ekstrakurikuler — EXISEL",
  description:
    "Jelajahi seluruh ekstrakurikuler, jadwal, lokasi, dan kuota di EXISEL.",
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

const dayOptions = [
  { value: "ALL", label: "Semua hari" },
  { value: "MONDAY", label: "Senin" },
  { value: "TUESDAY", label: "Selasa" },
  { value: "WEDNESDAY", label: "Rabu" },
  { value: "THURSDAY", label: "Kamis" },
  { value: "FRIDAY", label: "Jumat" },
] as const;

const programPresentation: Record<
  string,
  {
    order: number;
    number: string;
    category: string;
    tone: string;
    logo?: string;
  }
> = {
  PMR: {
    order: 1,
    number: "01",
    category: "Kemanusiaan",
    tone: "blue",
    logo: "/logo-pmr.png",
  },
  "English Club": {
    order: 2,
    number: "02",
    category: "Bahasa",
    tone: "pink",
    logo: "/logo-english-club.png",
  },
  Nihon: {
    order: 3,
    number: "03",
    category: "Bahasa & Budaya",
    tone: "white",
    logo: "/logo-nihon.png",
  },
  Basket: {
    order: 4,
    number: "04",
    category: "Olahraga",
    tone: "lavender",
    logo: "/logo-basket.png",
  },
  ITC: {
    order: 5,
    number: "05",
    category: "Teknologi",
    tone: "navy",
    logo: "/logo-itc.png",
  },
  Paskibra: {
    order: 6,
    number: "06",
    category: "Kepemimpinan",
    tone: "blue",
    logo: "/logo-paskibra.png",
  },
  Pramuka: {
    order: 7,
    number: "07",
    category: "Kepanduan",
    tone: "orange",
    logo: "/logo-pramuka.png",
  },
  Futsal: {
    order: 8,
    number: "08",
    category: "Olahraga",
    tone: "white",
    logo: "/logo-futsal.png",
  },
};

const toneClasses: Record<string, string> = {
  blue: styles.cardBlue,
  navy: styles.cardNavy,
  orange: styles.cardOrange,
  pink: styles.cardPink,
  white: styles.cardWhite,
  lavender: styles.cardLavender,
};

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
  return value.toLowerCase().replaceAll(" ", "-");
}

type ExtracurricularPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    hari?: string | string[];
  }>;
};

export default async function ExtracurricularPage({
  searchParams,
}: ExtracurricularPageProps) {
  const { user, extracurriculars } = await getStudentDashboard();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const requestedDay = typeof params.hari === "string" ? params.hari : "ALL";
  const selectedDay = dayOptions.some((option) => option.value === requestedDay)
    ? requestedDay
    : "ALL";
  const normalizedQuery = query.toLocaleLowerCase("id-ID");
  const enrolledProgramIds = new Set(
    user.enrollments.map((enrollment) => enrollment.extracurricular.id),
  );
  const orderedPrograms = [...extracurriculars].sort(
    (left, right) =>
      (programPresentation[left.name]?.order ?? 99) -
      (programPresentation[right.name]?.order ?? 99),
  );
  const filteredPrograms = orderedPrograms.filter((program) => {
    const presentation = programPresentation[program.name];
    const searchText = [
      program.name,
      program.description,
      presentation?.category,
      ...program.schedules.map((schedule) => schedule.location),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("id-ID");
    const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery);
    const matchesDay =
      selectedDay === "ALL" ||
      program.schedules.some((schedule) => schedule.day === selectedDay);

    return matchesQuery && matchesDay;
  });
  const totalCapacity = extracurriculars.reduce(
    (total, program) => total + program.capacity,
    0,
  );
  const totalAvailableSeats = extracurriculars.reduce(
    (total, program) =>
      total + Math.max(program.capacity - program._count.enrollments, 0),
    0,
  );
  const practiceDays = new Set(
    extracurriculars.flatMap((program) =>
      program.schedules.map((schedule) => schedule.day),
    ),
  ).size;

  function filterHref(day: string) {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set("q", query);
    if (day !== "ALL") nextParams.set("hari", day);
    const queryString = nextParams.toString();
    return queryString ? `/ekstrakurikuler?${queryString}` : "/ekstrakurikuler";
  }

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#daftar-ekskul">
        Lewati ke daftar ekstrakurikuler
      </a>

      <div className={styles.announcement} role="status">
        <span className={styles.liveDot} aria-hidden="true" />
        Pendaftaran semester ganjil sedang dibuka
        <span className={styles.announcementNote}>{totalAvailableSeats} kursi tersedia</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="EXISEL, kembali ke beranda">
            <span className={styles.brandLogo}>
              <Image
                src="/logo-smkn69.png"
                alt="Logo SMK Negeri 69 Jakarta"
                width={758}
                height={948}
                priority
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>EXISEL</strong>
              <small>Pilihan ekskul</small>
            </span>
          </Link>

          <StudentNavigation
            activeItem="programs"
            className={styles.navigation}
          />

          <div className={styles.accountActions}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <ConfirmLogoutButton className={styles.logoutButton} />
          </div>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="catalog-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Eksplorasi / Semester ganjil</p>
          <h1 id="catalog-title">
            Tujuh arena.
            <br />
            <span>Satu pilihanmu.</span>
          </h1>
          <p>
            Bandingkan fokus kegiatan, jadwal, lokasi, dan sisa kuota sebelum
            menentukan ruang terbaik untuk berkembang.
          </p>
        </div>

      </section>

      <section className={styles.stats} aria-label="Ringkasan katalog ekstrakurikuler">
        <article>
          <span>01</span>
          <div>
            <p>Ekskul aktif</p>
            <strong>{extracurriculars.length} pilihan</strong>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <p>Total kapasitas</p>
            <strong>{totalCapacity} siswa</strong>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <p>Hari latihan</p>
            <strong>{practiceDays} hari</strong>
          </div>
        </article>
      </section>

      <section className={styles.catalog} id="daftar-ekskul" aria-labelledby="list-title">
        <div className={styles.catalogHeading}>
          <div>
            <p className={styles.eyebrow}>Cari yang paling pas</p>
            <h2 id="list-title">Semua pilihan ekskul.</h2>
          </div>
          <p>
            Gunakan pencarian atau filter hari untuk mempersempit pilihanmu.
          </p>
        </div>

        <div className={styles.filterPanel}>
          <form className={styles.searchForm} action="/ekstrakurikuler" method="get">
            <label htmlFor="catalog-search">Cari ekskul</label>
            <div className={styles.searchControl}>
              <span aria-hidden="true">⌕</span>
              <input
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Contoh: teknologi, olahraga..."
              />
              {selectedDay !== "ALL" ? (
                <input type="hidden" name="hari" value={selectedDay} />
              ) : null}
              <button type="submit">Cari</button>
            </div>
          </form>

          <div className={styles.dayFilters} aria-label="Filter berdasarkan hari">
            {dayOptions.map((option) => (
              <Link
                className={selectedDay === option.value ? styles.activeFilter : ""}
                href={filterHref(option.value)}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.resultBar} role="status">
          <span>
            Menampilkan <strong>{filteredPrograms.length}</strong> dari {extracurriculars.length} ekskul
          </span>
          {query || selectedDay !== "ALL" ? (
            <Link href="/ekstrakurikuler">Reset filter ×</Link>
          ) : (
            <span>Data diperbarui dari PostgreSQL</span>
          )}
        </div>

        {filteredPrograms.length > 0 ? (
          <div className={styles.programGrid}>
            {filteredPrograms.map((program) => {
              const presentation = programPresentation[program.name] ?? {
                order: 99,
                number: "—",
                category: "Ekstrakurikuler",
                tone: "white",
              };
              const remainingSeats = Math.max(
                program.capacity - program._count.enrollments,
                0,
              );
              const occupancy = Math.min(
                Math.round((program._count.enrollments / program.capacity) * 100),
                100,
              );
              const isEnrolled = enrolledProgramIds.has(program.id);

              return (
                <article
                  className={`${styles.programCard} ${
                    toneClasses[presentation.tone]
                  } ${
                    program.name === "Basket" || program.name === "Futsal"
                      ? styles.equalSportCard
                      : ""
                  }`}
                  id={`ekskul-${slugify(program.name)}`}
                  key={program.id}
                >
                  <Link
                    aria-label={`Lihat detail ${program.name}`}
                    className={styles.cardHitArea}
                    href={`/eskul/${slugify(program.name)}`}
                  />
                  <div className={styles.cardTop}>
                    <span className={styles.programNumber}>{presentation.number}</span>
                    <span className={styles.categoryChip}>{presentation.category}</span>
                  </div>

                  <div
                    className={`${styles.cardBody} ${
                      presentation.logo ? styles.cardBodyWithLogo : ""
                    }`}
                  >
                    <div className={styles.cardCopy}>
                      <h3>
                        <Link href={`/eskul/${slugify(program.name)}`}>
                          {program.name} <span aria-hidden="true">↗</span>
                        </Link>
                      </h3>
                      <p>{program.description}</p>
                    </div>
                    {presentation.logo ? (
                      <div className={styles.programLogo}>
                        <Image
                          alt={`Logo ${program.name}`}
                          height={448}
                          src={presentation.logo}
                          width={448}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.scheduleList}>
                    {program.schedules.map((schedule) => (
                      <div key={`${schedule.day}-${schedule.location}`}>
                        <p>
                          <span>Hari & waktu</span>
                          <strong>
                            {dayLabels[schedule.day]}, {formatTime(schedule.startTime)}–
                            {formatTime(schedule.endTime)}
                          </strong>
                        </p>
                        <p>
                          <span>Lokasi</span>
                          <strong>{schedule.location}</strong>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`${styles.capacityBlock} ${
                      program.name === "ITC" ? styles.itcStatusArea : ""
                    }`}
                  >
                    <div>
                      <span>Kuota terisi</span>
                      <strong>
                        {program._count.enrollments} / {program.capacity}
                      </strong>
                    </div>
                    <div className={styles.capacityTrack} aria-hidden="true">
                      <span style={{ width: `${occupancy}%` }} />
                    </div>
                  </div>

                  <div
                    className={`${styles.cardFooter} ${
                      program.name === "ITC" ? styles.itcStatusArea : ""
                    }`}
                  >
                    {isEnrolled ? (
                      <Link className={styles.enrolledState} href="/dashboard">
                        Pilihanmu <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <span className={styles.openState}>
                        <i aria-hidden="true" /> Pendaftaran dibuka
                      </span>
                    )}
                    <strong>{remainingSeats} kursi tersisa</strong>
                  </div>
                  <Link
                    className={styles.registrationButton}
                    href={`/daftar/eskul?ekskul=${encodeURIComponent(program.id)}`}
                  >
                    {isEnrolled ? "Lihat pendaftaran" : "Daftar ekskul"}
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">?</span>
            <div>
              <h3>Belum menemukan yang cocok.</h3>
              <p>Coba kata kunci lain atau tampilkan kembali semua hari.</p>
            </div>
            <Link href="/ekstrakurikuler">Tampilkan semua</Link>
          </div>
        )}
      </section>

      <section className={styles.bottomCta} aria-labelledby="cta-title">
        <div>
          <p className={styles.eyebrow}>Pilihan ada di tanganmu</p>
          <h2 id="cta-title">Sudah punya kandidat?</h2>
          <p>Kembali ke dashboard untuk melihat status dan jadwal pilihanmu.</p>
        </div>
        <Link href="/dashboard">
          Kembali ke dashboard <span aria-hidden="true">→</span>
        </Link>
      </section>

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
