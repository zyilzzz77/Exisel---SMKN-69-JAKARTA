import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { PromoVideoPlayer } from "@/components/promo-video-player";
import { StudentNavigation } from "@/components/student-navigation";
import { getPublicExtracurricularData } from "@/lib/auth/dal";
import styles from "./detail.module.css";

type DetailPageProps = {
  params: Promise<{ nama_eskul: string }>;
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

const programDetails: Record<
  string,
  {
    number: string;
    category: string;
    kicker: string;
    headline: string;
    skills: Array<{ number: string; title: string; description: string }>;
  }
> = {
  PMR: {
    number: "01",
    category: "Kemanusiaan",
    kicker: "Siaga · Peduli · Tanggap",
    headline: "Belajar menolong. Bergerak untuk sesama.",
    skills: [
      {
        number: "01",
        title: "Pertolongan pertama",
        description:
          "Kuasai langkah awal yang aman saat menghadapi cedera dan kondisi darurat ringan.",
      },
      {
        number: "02",
        title: "Kesehatan remaja",
        description:
          "Pahami kebiasaan hidup sehat dan cara menyampaikan edukasi yang mudah diterima teman sebaya.",
      },
      {
        number: "03",
        title: "Kesiapsiagaan",
        description:
          "Latih ketenangan, komunikasi, dan kerja tim ketika sekolah membutuhkan respons cepat.",
      },
      {
        number: "04",
        title: "Aksi kemanusiaan",
        description:
          "Terlibat dalam kegiatan sosial sekolah dengan empati, disiplin, dan tanggung jawab.",
      },
    ],
  },
  "English Club": {
    number: "02",
    category: "Bahasa",
    kicker: "Speak · Create · Connect",
    headline: "Berani bicara. Percaya diri mendunia.",
    skills: [],
  },
  Nihon: {
    number: "03",
    category: "Bahasa & Budaya",
    kicker: "Bahasa · Budaya · Kreativitas",
    headline: "Kenali Jepang lewat bahasa dan karya.",
    skills: [],
  },
  Basket: {
    number: "04",
    category: "Olahraga",
    kicker: "Teknik · Tim · Mental",
    headline: "Gerak cepat. Tumbuh kuat bersama tim.",
    skills: [],
  },
  ITC: {
    number: "05",
    category: "Teknologi",
    kicker: "Code · Design · Build",
    headline: "Eksplorasi teknologi. Bangun karya nyata.",
    skills: [],
  },
  Paskibra: {
    number: "06",
    category: "Kepemimpinan",
    kicker: "Disiplin · Kompak · Tangguh",
    headline: "Tegakkan disiplin. Pimpin lewat teladan.",
    skills: [],
  },
  Pramuka: {
    number: "07",
    category: "Kepanduan",
    kicker: "Karakter · Mandiri · Memimpin",
    headline: "Bertumbuh tangguh. Mengabdi untuk negeri.",
    skills: [
      {
        number: "01",
        title: "Pembentukan karakter",
        description:
          "Menanamkan moral, kejujuran, tanggung jawab, dan nilai Trisatya serta Dasa Darma.",
      },
      {
        number: "02",
        title: "Keterampilan & kemandirian",
        description:
          "Berlatih tali-menali, navigasi, P3K, dan survival melalui scoutcraft yang aplikatif.",
      },
      {
        number: "03",
        title: "Kepemimpinan",
        description:
          "Belajar bekerja dalam sangga atau regu, mengambil keputusan, dan memimpin dengan teladan.",
      },
      {
        number: "04",
        title: "Cinta tanah air",
        description:
          "Membangun kepedulian, disiplin, dan semangat pengabdian sebagai bagian dari Gerakan Pramuka.",
      },
    ],
  },
  Futsal: {
    number: "08",
    category: "Olahraga",
    kicker: "Strategi · Stamina · Sportif",
    headline: "Main cerdas. Menang sebagai satu tim.",
    skills: [],
  },
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

const programVideos: Record<
  string,
  {
    src: string;
    poster?: string;
    eyebrow: string;
    headline: string;
    description: string;
    metaItems: Array<{ label: string; value: string }>;
  }
> = {
  Paskibra: {
    src: "/videos/paskibra-promo.mp4",
    poster: "/logo-paskibra.webp",
    eyebrow: "Mengenal Paskibra",
    headline: "Tegakkan disiplin. Pimpin lewat teladan.",
    description:
      "Paskibra SMKN 69 Jakarta mendidik kader muda yang tangguh, berkarakter, dan berjiwa kepemimpinan tinggi melalui keahlian baris-berbaris, variasi formasi, dan kedisiplinan yang solid.",
    metaItems: [
      { label: "Fokus Utama", value: "Kepemimpinan & PBB" },
      { label: "Karakter", value: "Disiplin · Kompak · Tangguh" },
    ],
  },
  PMR: {
    src: "/videos/pmr-promo.mp4",
    poster: "/logo-pmr.webp",
    eyebrow: "Mengenal PMR Wira",
    headline: "Belajar menolong. Bergerak untuk sesama.",
    description:
      "PMR SMKN 69 Jakarta adalah wadah relawan muda yang melatih pertolongan pertama, kesiapsiagaan darurat, dan aksi sosial kemanusiaan dengan empati serta kepedulian nyata.",
    metaItems: [
      { label: "Fokus Utama", value: "Pertolongan Pertama & Kesehatan" },
      { label: "Karakter", value: "Siaga · Peduli · Tanggap" },
    ],
  },
  Basket: {
    src: "/videos/basket-promo.mp4",
    poster: "/logo-basket.webp",
    eyebrow: "Mengenal Basket",
    headline: "Gerak cepat. Tumbuh kuat bersama tim.",
    description:
      "Tim Basket SMKN 69 Jakarta melatih fisik, teknik permainan, strategi lapangan, dan kerja sama tim yang solid untuk meraih prestasi olahraga.",
    metaItems: [
      { label: "Fokus Utama", value: "Teknik Olahraga & Stamina" },
      { label: "Karakter", value: "Sportif · Kerja Tim · Tangguh" },
    ],
  },
  ITC: {
    src: "/videos/itc-promo.mp4",
    poster: "/logo-itc.webp",
    eyebrow: "Mengenal ITC",
    headline: "Eksplorasi teknologi. Bangun karya nyata.",
    description:
      "ITC SMKN 69 Jakarta adalah komunitas penggemar teknologi yang mempelajari pemrograman, desain digital, analisis sistem, dan proyek teknologi aplikatif.",
    metaItems: [
      { label: "Fokus Utama", value: "Coding, Design & Technology" },
      { label: "Karakter", value: "Inovatif · Logis · Solutif" },
    ],
  },
  Pramuka: {
    src: "/videos/pramuka-promo.mp4",
    poster: "/logo-pramuka.webp",
    eyebrow: "Mengenal Pramuka",
    headline: "Bertumbuh tangguh. Mengabdi untuk negeri.",
    description:
      "Gerakan Pramuka SMKN 69 Jakarta membentuk kepribadian yang mandiri, berkarakter, mahir teknik kepramukaan, dan berjiwa kepemimpinan.",
    metaItems: [
      { label: "Fokus Utama", value: "Karakter & Scoutcraft" },
      { label: "Karakter", value: "Mandiri · Memimpin · Berbakti" },
    ],
  },
};

const programDocumentation: Record<
  string,
  {
    src: string;
    alt: string;
    title: string;
    description: string;
    caption: string;
    metaLabel: string;
    metaValue: string;
    width: number;
    height: number;
    landscape?: boolean;
    fourThree?: boolean;
  }
> = {
  PMR: {
    src: "/dokumentasi-pmr-agenda-2025.webp",
    alt: "Kolase dokumentasi agenda PMR SMKN 69 Jakarta pada 20 Oktober 2025",
    title: "Belajar langsung lewat simulasi dan aksi.",
    description:
      "Anggota PMR berlatih tandu, pertolongan pertama, serta simulasi penanganan korban bersama pembina dan teman satu tim.",
    caption:
      "Dokumentasi agenda PMR SMKN 69 Jakarta — Senin, 20 Oktober 2025.",
    metaLabel: "Agenda PMR",
    metaValue: "20 Oktober 2025",
    width: 720,
    height: 1600,
  },
  "English Club": {
    src: "/dokumentasi-english-club.webp",
    alt: "Foto bersama anggota English Club dan guru di ruang kelas SMKN 69 Jakarta",
    title: "Berlatih bersama. Tumbuh lebih percaya diri.",
    description:
      "Anggota English Club membangun keberanian berkomunikasi, kekompakan, dan kreativitas melalui kegiatan belajar yang aktif bersama teman dan guru.",
    caption: "Dokumentasi kegiatan English Club SMKN 69 Jakarta.",
    metaLabel: "English Club",
    metaValue: "Kegiatan bersama",
    width: 1156,
    height: 650,
    landscape: true,
  },
  Nihon: {
    src: "/dokumentasi-nihon.webp",
    alt: "Foto bersama anggota Nihon berkostum karakter Jepang dan guru SMKN 69 Jakarta di area sekolah",
    title: "Mengenal budaya. Menampilkan kreativitas.",
    description:
      "Anggota Nihon mengeksplorasi bahasa dan budaya Jepang melalui karya, kostum karakter, penampilan, serta kegiatan kreatif bersama teman dan guru.",
    caption: "Dokumentasi kegiatan Nihon SMKN 69 Jakarta.",
    metaLabel: "Nihon",
    metaValue: "Kegiatan budaya",
    width: 1156,
    height: 867,
    fourThree: true,
  },
  Basket: {
    src: "/dokumentasi-basket.webp",
    alt: "Foto bersama anggota Basket putra dan putri SMKN 69 Jakarta di lapangan olahraga dalam ruangan",
    title: "Berlatih keras. Bertumbuh sebagai satu tim.",
    description:
      "Anggota Basket mengembangkan teknik, stamina, komunikasi, dan kekompakan melalui latihan serta pertandingan bersama tim putra dan putri.",
    caption: "Dokumentasi kegiatan Basket SMKN 69 Jakarta.",
    metaLabel: "Basket",
    metaValue: "Latihan bersama",
    width: 1280,
    height: 960,
    fourThree: true,
  },
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSlug(value: string) {
  return slugify(decodeURIComponent(value).replaceAll("_", " "));
}

function titleFromSlug(value: string) {
  return decodeURIComponent(value)
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

export async function generateMetadata({
  params,
}: DetailPageProps): Promise<Metadata> {
  const { nama_eskul } = await params;
  const name = titleFromSlug(nama_eskul);

  return {
    title: `${name} — EXISEL`,
    description: `Informasi lengkap, jadwal, dan pendaftaran ${name} di EXISEL.`,
  };
}

export default async function ExtracurricularDetailPage({
  params,
}: DetailPageProps) {
  const { nama_eskul } = await params;
  const { user, extracurriculars } = await getPublicExtracurricularData();
  const requestedSlug = normalizeSlug(nama_eskul);
  const program = extracurriculars.find(
    (item) => slugify(item.name) === requestedSlug,
  );

  if (!program) notFound();

  const presentation = programDetails[program.name] ?? {
    number: "—",
    category: "Ekstrakurikuler",
    kicker: "Belajar · Berkarya · Bertumbuh",
    headline: "Temukan ruang untuk tumbuh bersama.",
    skills: [],
  };
  const skills =
    presentation.skills.length > 0
      ? presentation.skills
      : [
          {
            number: "01",
            title: "Dasar yang kuat",
            description: `Pelajari kemampuan inti ${program.name} melalui latihan yang terarah.`,
          },
          {
            number: "02",
            title: "Kerja tim",
            description:
              "Bangun komunikasi, tanggung jawab, dan kebiasaan saling mendukung.",
          },
          {
            number: "03",
            title: "Karya dan pengalaman",
            description:
              "Terapkan hasil latihan melalui agenda sekolah dan proyek bersama.",
          },
          {
            number: "04",
            title: "Percaya diri",
            description:
              "Kembangkan keberanian untuk mencoba, tampil, dan terus memperbaiki diri.",
          },
        ];
  const enrollment = user?.enrollments?.find(
    (item) => item.extracurricularId === program.id,
  );
  const isEnrolled = Boolean(enrollment);
  const remainingSeats = Math.max(
    program.capacity - program._count.enrollments,
    0,
  );
  const occupancy = Math.min(
    Math.round((program._count.enrollments / program.capacity) * 100),
    100,
  );
  const logo = programLogos[program.name];
  const documentation = programDocumentation[program.name];
  const video = programVideos[program.name];

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#detail-content">
        Lewati ke detail ekskul
      </a>

      <div className={styles.announcement}>
        <span className={styles.liveDot} aria-hidden="true" />
        Pendaftaran semester ganjil dibuka
        <span className={styles.announcementNote}>
          {remainingSeats} kursi tersedia
        </span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/">
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
              <small>Profil ekstrakurikuler</small>
            </span>
          </Link>

          <StudentNavigation
            activeItem="programs"
            className={styles.navigation}
          />

          <div className={styles.accountActions}>
            {user ? (
              <>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(user.name)}
                </span>
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

      <div className={styles.shell} id="detail-content">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/ekstrakurikuler">Semua ekskul</Link>
          <span aria-hidden="true">/</span>
          <strong>{program.name}</strong>
        </nav>

        <section className={styles.hero} aria-labelledby="program-title">
          <div className={styles.heroCopy}>
            <div className={styles.heroMeta}>
              <span>{presentation.number}</span>
              <span>{presentation.category}</span>
            </div>
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <p className={styles.eyebrow}>{presentation.kicker}</p>
                <h1 id="program-title">{program.name}</h1>
                <h2>{presentation.headline}</h2>
                <p className={styles.heroDescription}>{program.description}</p>
                <div className={styles.heroActions}>
                  <Link
                    className={styles.primaryButton}
                    href={
                      isEnrolled
                        ? "/dashboard"
                        : `/daftar/eskul?ekskul=${encodeURIComponent(program.id)}`
                    }
                  >
                    {isEnrolled ? "Lihat statusmu" : "Daftar sekarang"}
                    <span aria-hidden="true">→</span>
                  </Link>
                  <a className={styles.secondaryButton} href="#jadwal">
                    Lihat jadwal <span aria-hidden="true">↓</span>
                  </a>
                </div>
              </div>

              <aside
                className={styles.heroIdentity}
                aria-label={`Identitas ${program.name}`}
              >
                <div className={styles.unifiedLogoFrame}>
                  {logo ? (
                    <Image
                      alt={`Logo ${program.name}`}
                      height={448}
                      priority
                      src={logo}
                      width={448}
                    />
                  ) : (
                    <span className={styles.rescueMark} aria-hidden="true">
                      +
                    </span>
                  )}
                </div>
                <div className={styles.identityCopy}>
                  <span>Identitas ekskul</span>
                  <strong>SMKN 69 Jakarta</strong>
                  <small>{presentation.kicker}</small>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {video ? (
          <PromoVideoPlayer
            description={video.description}
            eyebrow={video.eyebrow}
            headline={video.headline}
            metaItems={video.metaItems}
            poster={video.poster ?? logo ?? "/logo-smkn69.webp"}
            src={video.src}
            title={`Profil & Video ${program.name}`}
          />
        ) : null}

        <section className={styles.factStrip} aria-label="Informasi utama ekskul">
          <article>
            <span>01 / Jadwal</span>
            <strong>
              {program.schedules[0]
                ? `${dayLabels[program.schedules[0].day]}, ${formatTime(
                    program.schedules[0].startTime,
                  )}`
                : "Segera diumumkan"}
            </strong>
          </article>
          <article>
            <span>02 / Lokasi</span>
            <strong>{program.schedules[0]?.location ?? "Segera diumumkan"}</strong>
          </article>
          <article>
            <span>03 / Kapasitas</span>
            <strong>{program.capacity} siswa</strong>
          </article>
          <article>
            <span>04 / Statusmu</span>
            <strong>{isEnrolled ? "Sudah terdaftar" : "Belum terdaftar"}</strong>
          </article>
        </section>

        <section className={styles.storySection} aria-labelledby="story-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Tentang kegiatan</p>
            <h2 id="story-title">Bukan sekadar kegiatan setelah kelas.</h2>
          </div>
          <div className={styles.storyGrid}>
            <p>{program.description}</p>
            <p>
              Di {program.name}, latihan dibangun secara bertahap agar setiap
              anggota mendapat ruang untuk belajar, berkontribusi, dan tumbuh
              bersama tim.
            </p>
            <blockquote>
              <span aria-hidden="true">“</span>
              {presentation.headline}
            </blockquote>
          </div>
        </section>

        {documentation ? (
          <section
            className={styles.documentationSection}
            id="dokumentasi"
            aria-labelledby="documentation-title"
          >
            <div className={styles.documentationCopy}>
              <p className={styles.eyebrow}>Dokumentasi kegiatan</p>
              <h2 id="documentation-title">{documentation.title}</h2>
              <p>{documentation.description}</p>
              <div className={styles.documentationMeta}>
                <span>{documentation.metaLabel}</span>
                <strong>{documentation.metaValue}</strong>
              </div>
            </div>

            <figure className={styles.documentationFigure}>
              <div
                className={`${styles.documentationFrame} ${
                  documentation.fourThree
                    ? styles.documentationFrameFourThree
                    : documentation.landscape
                    ? styles.documentationFrameLandscape
                    : ""
                }`}
              >
                <Image
                  alt={documentation.alt}
                  height={documentation.height}
                  sizes="(max-width: 760px) calc(100vw - 80px), (max-width: 1080px) 460px, 420px"
                  src={documentation.src}
                  width={documentation.width}
                />
              </div>
              <figcaption>{documentation.caption}</figcaption>
            </figure>
          </section>
        ) : null}

        <section className={styles.skillsSection} aria-labelledby="skills-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Yang akan kamu pelajari</p>
            <h2 id="skills-title">Kemampuan yang dibawa sampai nanti.</h2>
          </div>
          <div className={styles.skillsGrid}>
            {skills.map((skill) => (
              <article key={skill.number}>
                <span>{skill.number}</span>
                <h3>{skill.title}</h3>
                <p>{skill.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.scheduleSection} id="jadwal" aria-labelledby="schedule-title">
          <div className={styles.scheduleIntro}>
            <p className={styles.eyebrow}>Jadwal latihan</p>
            <h2 id="schedule-title">Datang tepat waktu. Tumbuh bersama.</h2>
            <p>
              Jadwal ditarik langsung dari data sekolah dan akan ikut berubah
              ketika pengurus memperbaruinya.
            </p>
          </div>
          <div className={styles.scheduleCards}>
            {program.schedules.length > 0 ? (
              program.schedules.map((schedule, index) => (
                <article key={`${schedule.day}-${schedule.location}`}>
                  <span>0{index + 1}</span>
                  <div>
                    <p>{dayLabels[schedule.day]}</p>
                    <h3>
                      {formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}
                    </h3>
                    <strong>{schedule.location}</strong>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.emptySchedule}>Jadwal segera diumumkan.</div>
            )}
          </div>
        </section>

        <section className={styles.registrationSection} aria-labelledby="registration-title">
          <div>
            <p className={styles.eyebrow}>Kuota semester ini</p>
            <h2 id="registration-title">
              {remainingSeats > 0
                ? `${remainingSeats} kursi masih tersedia.`
                : "Kuota sudah terpenuhi."}
            </h2>
            <p>
              {isEnrolled
                ? "Kamu sudah menjadi bagian dari ekskul ini. Pantau jadwal dan kehadiranmu dari dashboard."
                : "Isi data pendaftaranmu. Setelah dikirim, kamu langsung terdaftar dan siap mengikuti agenda berikutnya."}
            </p>
          </div>
          <div className={styles.capacityPanel}>
            <div>
              <span>Kuota terisi</span>
              <strong>
                {program._count.enrollments} / {program.capacity}
              </strong>
            </div>
            <div className={styles.capacityTrack} aria-hidden="true">
              <span style={{ width: `${occupancy}%` }} />
            </div>
            <Link
              className={styles.primaryButton}
              href={
                isEnrolled
                  ? "/dashboard"
                  : `/daftar/eskul?ekskul=${encodeURIComponent(program.id)}`
              }
            >
              {isEnrolled ? "Buka dashboard" : "Ambil kursimu"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <strong>EXISEL / {program.name}</strong>
          <p>Temukan ruangmu. Tumbuh bersama.</p>
          <Link href="/ekstrakurikuler">Kembali ke semua ekskul →</Link>
        </div>
      </footer>
    </main>
  );
}
