import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompetitionFilter } from "@/components/competition-filter";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { StudentHeaderNav } from "@/components/landing-navigation";
import { getPublicExtracurricularData } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/database/prisma";
import { getJakartaDateKey } from "@/lib/school-date";
import styles from "./lomba.module.css";

export const metadata: Metadata = {
  title: "Info Lomba Ekstrakurikuler — EXISEL",
  description: "Temukan informasi lomba terbaru dari setiap ekstrakurikuler SMKN 69 Jakarta.",
};

type CompetitionPageProps = {
  searchParams: Promise<{ ekskul?: string | string[] }>;
};

const programLogos: Record<string, string> = {
  PMR: "/logo-pmr.webp",
  "English Club": "/logo-english-club.webp",
  Nihon: "/logo-nihon.webp",
  Basket: "/logo-basket.webp",
  ITC: "/logo-itc.webp",
  Paskibra: "/logo-paskibra.webp",
  Pramuka: "/logo-pramuka.webp",
  Futsal: "/logo-futsal.webp",
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(value);
}

export default async function CompetitionPage({ searchParams }: CompetitionPageProps) {
  const [{ user, extracurriculars }, competitions, params] = await Promise.all([
    getPublicExtracurricularData(),
    getPrisma().competition.findMany({
      where: {
        isPublished: true,
        extracurricular: { isActive: true },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      include: {
        extracurricular: { select: { id: true, name: true } },
      },
    }),
    searchParams,
  ]);

  const requestedSlug = typeof params.ekskul === "string" ? params.ekskul : "semua";
  const selectedProgram = extracurriculars.find(
    (program) => slugify(program.name) === requestedSlug,
  );
  const today = getJakartaDateKey();
  const filteredCompetitions = competitions.filter(
    (competition) => !selectedProgram || competition.extracurricularId === selectedProgram.id,
  );
  const upcoming = filteredCompetitions.filter(
    (competition) => dateKey(competition.eventDate) >= today,
  );
  const completed = filteredCompetitions
    .filter((competition) => dateKey(competition.eventDate) < today)
    .sort((left, right) => right.eventDate.valueOf() - left.eventDate.valueOf());
  const totalUpcoming = competitions.filter(
    (competition) => dateKey(competition.eventDate) >= today,
  ).length;
  const representedPrograms = new Set(competitions.map((item) => item.extracurricularId)).size;

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#competition-list">
        Lewati ke daftar lomba
      </a>

      <div className={styles.announcement} role="status">
        <span className={styles.liveDot} aria-hidden="true" />
        Info lomba diperbarui langsung oleh admin & pembina ekskul
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard">
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
              <small>Pusat info lomba</small>
            </span>
          </Link>

          <StudentHeaderNav activeItem="competitions" />

          <div className={styles.accountActions}>
            {user ? (
              <>
                <span className={styles.avatar} aria-hidden="true">{initials(user.name)}</span>
                <ConfirmLogoutButton className={styles.logoutButton} />
              </>
            ) : (
              <Link className={styles.logoutButton} href="/login">
                Masuk <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Lomba ekskul / SMKN 69 Jakarta</p>
          <h1>
            Kesempatan datang. <span>Kamu siap menang?</span>
          </h1>
          <p>
            Pantau lomba terbaru dari setiap ekskul, cek batas pendaftaran, lalu
            siapkan tim terbaikmu.
          </p>
        </div>
        <div className={styles.heroCard} aria-label="Ringkasan info lomba">
          <span>Update aktif</span>
          <strong>{totalUpcoming}</strong>
          <p>Lomba mendatang</p>
          <div>
            <small>{representedPrograms} ekskul punya info</small>
            <small>{competitions.length} total publikasi</small>
          </div>
        </div>
      </section>

      <section className={styles.filterSection} aria-label="Filter lomba berdasarkan ekskul">
        <div>
          <p className={styles.eyebrow}>Saring informasi</p>
          <h2>Ekskul mana yang kamu cari?</h2>
        </div>
        <CompetitionFilter
          className={styles.filterSelect}
          programs={extracurriculars.map((program) => ({
            name: program.name,
            slug: slugify(program.name),
          }))}
          selectedSlug={selectedProgram ? slugify(selectedProgram.name) : "semua"}
        />
      </section>

      <div className={styles.content} id="competition-list">
        <section className={styles.competitionSection} aria-labelledby="upcoming-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Peluang berikutnya</p>
              <h2 id="upcoming-title">Lomba mendatang</h2>
            </div>
            <span>{upcoming.length.toString().padStart(2, "0")} agenda</span>
          </div>

          {upcoming.length > 0 ? (
            <div className={styles.competitionGrid}>
              {upcoming.map((competition, index) => {
                const deadlineClosed =
                  competition.registrationDeadline &&
                  dateKey(competition.registrationDeadline) < today;
                const logo = programLogos[competition.extracurricular.name];
                return (
                  <article className={styles.competitionCard} key={competition.id}>
                    <div className={styles.cardTop}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span className={deadlineClosed ? styles.closedBadge : styles.openBadge}>
                        {deadlineClosed ? "Pendaftaran tutup" : "Akan datang"}
                      </span>
                    </div>
                    <div className={styles.programIdentity}>
                      {logo ? <Image alt={`Logo ${competition.extracurricular.name}`} height={54} src={logo} width={54} /> : null}
                      <div>
                        <small>Ekskul</small>
                        <strong>{competition.extracurricular.name}</strong>
                      </div>
                    </div>
                    <h3>{competition.title}</h3>
                    <p className={styles.description}>{competition.description}</p>
                    <dl className={styles.details}>
                      <div><dt>Tanggal</dt><dd>{formatDate(competition.eventDate)}</dd></div>
                      <div><dt>Lokasi</dt><dd>{competition.location ?? "Segera diumumkan"}</dd></div>
                      <div><dt>Tingkat</dt><dd>{competition.level ?? "Terbuka"}</dd></div>
                      <div><dt>Batas daftar</dt><dd>{competition.registrationDeadline ? formatDate(competition.registrationDeadline) : "Hubungi pembina"}</dd></div>
                    </dl>
                    <div className={styles.cardFooter}>
                      <span>{competition.organizer ?? "Info resmi pembina"}</span>
                      {competition.registrationUrl && !deadlineClosed ? (
                        <a href={competition.registrationUrl} rel="noreferrer" target="_blank">Daftar lomba ↗</a>
                      ) : (
                        <Link href={`/eskul/${slugify(competition.extracurricular.name)}`}>Lihat ekskul →</Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span>Belum ada agenda baru</span>
              <h3>{selectedProgram ? `${selectedProgram.name} belum menerbitkan lomba mendatang.` : "Info lomba baru sedang disiapkan."}</h3>
              <p>Cek kembali nanti atau tanyakan kesempatan berikutnya kepada pembina ekskul.</p>
              <Link href="/community">Pantau Community →</Link>
            </div>
          )}
        </section>

        {completed.length > 0 ? (
          <section className={styles.pastSection} aria-labelledby="past-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Arsip kesempatan</p>
                <h2 id="past-title">Lomba selesai</h2>
              </div>
            </div>
            <div className={styles.pastList}>
              {completed.map((competition) => (
                <article key={competition.id}>
                  <span>{formatDate(competition.eventDate)}</span>
                  <div>
                    <h3>{competition.title}</h3>
                    <p>{competition.extracurricular.name} · {competition.level ?? "Umum"}</p>
                  </div>
                  <Link href={`/eskul/${slugify(competition.extracurricular.name)}`}>Lihat profil →</Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
