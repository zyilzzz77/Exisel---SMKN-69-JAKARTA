import Image from "next/image";
import Link from "next/link";
import { LandingNavigation } from "@/components/landing-navigation";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TypewriterHeading } from "@/components/typewriter-heading";

const extracurriculars = [
  {
    number: "01",
    name: "PMR",
    category: "Kemanusiaan",
    day: "Senin & Selasa",
    tone: "blue",
    logo: "/logo-pmr.webp",
  },
  {
    number: "02",
    name: "English Club",
    category: "Bahasa",
    day: "Kamis",
    tone: "pink",
    logo: "/logo-english-club.webp",
  },
  {
    number: "03",
    name: "Nihon",
    category: "Bahasa & Budaya",
    day: "Selasa",
    tone: "white",
    logo: "/logo-nihon.webp",
  },
  {
    number: "04",
    name: "Basket",
    category: "Olahraga",
    day: "Senin",
    tone: "lavender",
    logo: "/logo-basket.webp",
  },
  {
    number: "05",
    name: "ITC",
    category: "Teknologi",
    day: "Jumat",
    tone: "navy",
    logo: "/logo-itc.webp",
  },
  {
    number: "06",
    name: "Paskibra",
    category: "Kepemimpinan",
    day: "Minggu",
    tone: "blue",
    logo: "/logo-paskibra.webp",
  },
  {
    number: "07",
    name: "Pramuka",
    category: "Kepanduan",
    day: "Rabu",
    tone: "orange",
    logo: "/logo-pramuka.webp",
  },
  {
    number: "08",
    name: "Futsal",
    category: "Olahraga",
    day: "Jumat",
    tone: "white",
    logo: "/logo-futsal.webp",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Masuk pakai akun yang sudah diberikan",
    description:
      "Gunakan akun yang sudah diberikan sekolah. Tidak perlu bikin akun baru.",
  },
  {
    number: "02",
    title: "Pilih yang paling cocok",
    description:
      "Cek jadwal, pembina, lokasi, dan sisa kuota sebelum menentukan pilihan.",
  },
  {
    number: "03",
    title: "Daftar. Beres.",
    description:
      "Konfirmasi pilihanmu dan pantau status pendaftaran dari satu dashboard.",
  },
] as const;

const softCardMotion =
  "will-change-transform transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 focus-within:-translate-y-1 hover:shadow-[8px_8px_0_var(--ink)] focus-within:shadow-[8px_8px_0_var(--ink)] active:translate-x-1 active:translate-y-1 active:shadow-none active:duration-100";

export default function Home() {
  return (
    <main className="landing-page">
      <ScrollRevealController />
      <a className="skip-link" href="#konten-utama">
        Lewati ke konten utama
      </a>

      <div className="announcement" role="status">
        <span className="announcement-dot" aria-hidden="true" />
        Pendaftaran semester ganjil sedang dibuka
        <span className="announcement-separator" aria-hidden="true">
          /
        </span>
        <span>Jangan lewatkan pilihanmu</span>
      </div>

      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="EXISEL, halaman utama">
            <span className="brand-logo">
              <Image
                src="/logo-smkn69.webp"
                alt="Logo SMK Negeri 69 Jakarta"
                width={758}
                height={948}
                preload
              />
            </span>
            <span className="brand-copy">
              <strong>EXISEL</strong>
              <small>Ekstrakurikuler Namsel</small>
            </span>
          </Link>

          <LandingNavigation />

          <Link className="button button-small button-light" href="/login">
            Masuk <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div id="konten-utama">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true">✦</span> Satu tempat. Banyak panggung.
            </p>
            <TypewriterHeading
              highlightText="tumbuh."
              id="hero-title"
              lineBreak={false}
              mainText="Temukan ekskul yang bikin kamu"
            />
            <p className="hero-description">
              Cari, bandingkan, dan daftar ekstrakurikuler tanpa formulir yang
              bikin ribet. Semua jadwal dan statusmu ada di satu tempat.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#pilihan">
                Jelajahi 8 ekskul <span aria-hidden="true">↓</span>
              </a>
              <Link className="text-link" href="/login">
                Sudah punya akun? Masuk <span aria-hidden="true">→</span>
              </Link>
            </div>

            <dl className="hero-facts" aria-label="Ringkasan EXISEL">
              <div>
                <dt>8</dt>
                <dd>Pilihan ekskul</dd>
              </div>
              <div>
                <dt>1×</dt>
                <dd>Daftar dari HP</dd>
              </div>
              <div>
                <dt>24/7</dt>
                <dd>Status terpantau</dd>
              </div>
            </dl>
          </div>

          <div className="hero-visual" aria-label="Contoh kartu ekstrakurikuler ITC">
            <div className="hero-shape hero-shape-blue" aria-hidden="true" />
            <div className="hero-shape hero-shape-orange" aria-hidden="true" />
            <article className="notice-card">
              <div className="notice-card-top">
                <span>Pilihan minggu ini</span>
                <strong>05 / 08</strong>
              </div>
              <div className="notice-main">
                <span className="chip chip-orange">Teknologi</span>
                <h2>ITC</h2>
                <p>Eksplorasi coding, desain digital, dan teknologi bareng.</p>
              </div>
              <div className="schedule-box">
                <div>
                  <span>Hari</span>
                  <strong>Jumat</strong>
                </div>
                <div>
                  <span>Waktu</span>
                  <strong>15.45–17.00</strong>
                </div>
              </div>
              <div className="seat-row">
                <div>
                  <span className="status-dot" aria-hidden="true" />
                  Pendaftaran dibuka
                </div>
                <span>Kuota tersedia</span>
              </div>
            </article>
            <div className="open-sticker" aria-hidden="true">
              <span>Daftar</span>
              <strong>Dibuka!</strong>
            </div>
          </div>
        </section>

        <div className="ticker-stage">
          <div
            className="ticker ticker-blue"
            aria-label="Pilihan ekstrakurikuler tersedia"
          >
            <div className="ticker-track ticker-track-programs">
              {[0, 1].map((copyIndex) => (
                <div
                  className="ticker-group"
                  key={copyIndex}
                  aria-hidden={copyIndex === 1 ? "true" : undefined}
                >
                  {extracurriculars.map((item) => (
                    <span key={`${copyIndex}-${item.name}`}>
                      {item.name} <b aria-hidden="true">✦</b>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="ticker ticker-orange" aria-label="Join Now!">
            <div className="ticker-track ticker-track-join">
              {[0, 1].map((copyIndex) => (
                <div
                  className="ticker-group ticker-join-group"
                  key={copyIndex}
                  aria-hidden={copyIndex === 1 ? "true" : undefined}
                >
                  {Array.from({ length: 8 }, (_, itemIndex) => (
                    <span key={`${copyIndex}-${itemIndex}`}>
                      Join Now! <b aria-hidden="true">✦</b>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="program-section" id="pilihan" aria-labelledby="program-title">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow-dark">Pilih arena kamu</p>
                <h2 id="program-title">Delapan pilihan. Satu versi terbaik dirimu.</h2>
              </div>
              <p>
                Dari lapangan sampai laboratorium komputer, pilih ruang yang
                paling pas buat energi dan rasa penasaranmu.
              </p>
            </div>

            <div className="program-grid">
              {extracurriculars.map((item) => (
                <Link
                  className={`program-card program-card-${item.tone} group`}
                  href={`/eskul/${item.name.toLowerCase().replaceAll(" ", "-")}`}
                  key={item.name}
                  aria-label={`Lihat detail ekstrakurikuler ${item.name}`}
                >
                  <div className="program-card-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5">
                    <span className="program-number">{item.number}</span>
                    <span className="chip">{item.category}</span>
                  </div>
                  <div
                    className={`program-card-body ${"logo" in item ? "" : "program-card-body-text"}`}
                  >
                    <h3 className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:scale-[1.015] group-focus-within:translate-x-1 group-focus-within:scale-[1.015]">
                      {item.name}
                    </h3>
                    {"logo" in item ? (
                      <span className="program-logo" aria-hidden="true">
                        <Image
                          src={item.logo}
                          alt=""
                          width={320}
                          height={320}
                          sizes="(max-width: 720px) 58px, 96px"
                        />
                      </span>
                    ) : null}
                  </div>
                  <div className="program-card-bottom transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0.5 group-focus-within:translate-y-0.5">
                    <p>
                      <span>Jadwal</span>
                      <strong>{item.day}</strong>
                    </p>
                    <p>
                      <span>Waktu</span>
                      <strong>15.45–17.00</strong>
                    </p>
                    <span className="round-link" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="section-action">
              <Link className="button button-dark" href="/ekstrakurikuler">
                Lihat semua detail <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="steps-section shell" id="background" aria-labelledby="steps-title">
          <div className="section-kicker">
            <span>Gampang, kok.</span>
          </div>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow eyebrow-dark">Cara daftar</p>
              <TypewriterHeading
                as="h2"
                id="steps-title"
                mainText="Tiga langkah. Nggak pakai drama."
              />
            </div>
            <p>
              Prosesnya dibuat singkat supaya waktumu dipakai untuk mencoba,
              bukan mengisi formulir berulang-ulang.
            </p>
          </div>

          <ol className="steps-grid">
            {steps.map((step) => (
              <li className={`step-card ${softCardMotion}`} key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="feature-section" id="about" aria-labelledby="feature-title">
          <div className="shell">
            <div className="feature-header">
              <div>
                <p className="eyebrow">Apa itu EXISEL?</p>
                <TypewriterHeading
                  as="h2"
                  id="feature-title"
                  mainText="Satu tempat untuk semua urusan ekskulmu."
                />
              </div>
              <p className="feature-heading-note">
                Dari mencari kegiatan yang cocok sampai memantau kehadiran,
                semuanya dirancang agar lebih singkat dan jelas.
              </p>
            </div>

            <div className="feature-layout">
              <figure className="feature-image">
                <div className="feature-photo-frame">
                  <Image
                    src="/student-sija-trophy.webp"
                    alt="Siswa SIJA tersenyum sambil memegang piala di lapangan"
                    width={1080}
                    height={1448}
                    sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1050px) 42vw, 520px"
                  />
                  <span className="feature-photo-tag">Cerita siswa SIJA</span>
                </div>
                <figcaption>
                  <span>Dari latihan rutin</span>
                  <strong>jadi prestasi yang dibanggakan.</strong>
                </figcaption>
              </figure>

              <div className="feature-content">
                <div className="feature-intro">
                  <p className="feature-intro-lead">
                    Ekskul bukan kegiatan tambahan. Ini tempat kamu menemukan
                    teman, mengasah kemampuan, dan membangun percaya diri.
                  </p>
                  <p>
                    EXISEL menyatukan informasi, pendaftaran, dan pemantauan
                    kegiatan ekstrakurikuler SMKN 69 Jakarta dalam satu layanan
                    yang bisa diakses dari HP maupun komputer.
                  </p>
                </div>

                <div className="feature-list" aria-label="Keunggulan EXISEL">
                  <article>
                    <span className="feature-index">01</span>
                    <div>
                      <h3>Jadwal lebih jelas</h3>
                      <p>Hari, jam, dan lokasi latihan terlihat sebelum mendaftar.</p>
                    </div>
                    <span className="feature-list-mark" aria-hidden="true">✓</span>
                  </article>
                  <article>
                    <span className="feature-index feature-index-orange">02</span>
                    <div>
                      <h3>Nggak takut bentrok</h3>
                      <p>Sistem membantu mengecek saat dua jadwal bertabrakan.</p>
                    </div>
                    <span className="feature-list-mark" aria-hidden="true">✓</span>
                  </article>
                  <article>
                    <span className="feature-index feature-index-light">03</span>
                    <div>
                      <h3>Selalu terpantau</h3>
                      <p>Status pendaftaran dan kehadiran ada di satu dashboard.</p>
                    </div>
                    <span className="feature-list-mark" aria-hidden="true">✓</span>
                  </article>
                </div>

                <div className="feature-actions">
                  <Link className="button button-orange" href="/login">
                    Mulai pilih ekskul <span aria-hidden="true">→</span>
                  </Link>
                  <span>8 pilihan kegiatan untuk berkembang bareng.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta shell" aria-labelledby="cta-title">
          <div className="cta-decoration" aria-hidden="true">
            EX!
          </div>
          <div>
            <p className="eyebrow eyebrow-dark">Giliran kamu bergerak</p>
            <h2 id="cta-title">Ekskulmu menunggu. Kamu siap?</h2>
            <p>
              Masuk dengan NIS dari sekolah, pilih kegiatanmu, dan mulai cerita
              baru di luar kelas.
            </p>
          </div>
          <Link className="button button-primary button-large" href="/login">
            Daftar sekarang <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      <footer className="site-footer">
        <div className="shell footer-grid">
          <div className="footer-brand">
            <span className="brand-logo">
              <Image
                src="/logo-smkn69.webp"
                alt="Logo SMK Negeri 69 Jakarta"
                width={758}
                height={948}
              />
            </span>
            <div>
              <strong>EXISEL</strong>
              <p>Temukan ekskulmu. Tumbuh bareng.</p>
            </div>
          </div>
          <div className="footer-links">
            <a href="#pilihan">Pilihan ekskul</a>
            <a href="#background">Cara daftar</a>
            <Link href="/login">Masuk siswa</Link>
          </div>
          <p className="footer-note">
            Sistem Informasi Ekstrakurikuler Siswa
            <br />© 2026 EXISEL
          </p>
        </div>
      </footer>
    </main>
  );
}
