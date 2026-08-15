import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAchievementAction,
  createCompetitionAction,
  createGalleryItemAction,
  deleteAchievementAction,
  deleteCompetitionAction,
  deleteGalleryItemAction,
  updateAchievementAction,
  updateCompetitionAction,
  updateGalleryItemAction,
} from "@/actions/extracurricular-content";
import { AdminHeader } from "@/components/admin-header";
import { ContentImage } from "@/components/content-image";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";
import styles from "./admin-content.module.css";

export const metadata: Metadata = {
  title: "Kelola Lomba & Profil — EXISEL",
  description: "Kelola informasi lomba, prestasi, dan galeri ekstrakurikuler.",
};

type AdminContentPageProps = {
  searchParams: Promise<{
    ekskul?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

const notices: Record<string, string> = {
  "lomba-ditambahkan": "Informasi lomba berhasil ditambahkan.",
  "lomba-diperbarui": "Informasi lomba berhasil diperbarui.",
  "lomba-dihapus": "Informasi lomba berhasil dihapus.",
  "prestasi-ditambahkan": "Prestasi berhasil ditambahkan.",
  "prestasi-diperbarui": "Prestasi berhasil diperbarui.",
  "prestasi-dihapus": "Prestasi berhasil dihapus.",
  "galeri-ditambahkan": "Foto galeri berhasil ditambahkan.",
  "galeri-diperbarui": "Foto galeri berhasil diperbarui.",
  "galeri-dihapus": "Foto galeri berhasil dihapus.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function PublishedToggle({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <label className={styles.toggleField}>
      <input defaultChecked={defaultChecked} name="isPublished" type="checkbox" />
      <span>
        <strong>Tampilkan ke siswa</strong>
        <small>Matikan jika konten masih berupa draf.</small>
      </span>
    </label>
  );
}

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const activeAdmin = await getActiveSessionUser("ADMIN");
  if (!activeAdmin) redirect("/admin/login");

  const prisma = getPrisma();
  const [admin, programs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: activeAdmin.id },
      select: { name: true },
    }),
    prisma.extracurricular.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        competitions: { orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }] },
        achievements: { orderBy: [{ achievedAt: "desc" }, { createdAt: "desc" }] },
        galleryItems: { orderBy: [{ position: "asc" }, { createdAt: "desc" }] },
      },
    }),
  ]);

  if (!admin) redirect("/admin/login");

  const query = await searchParams;
  const requestedSlug = first(query.ekskul);
  const selectedProgram =
    programs.find((program) => slugify(program.name) === requestedSlug) ?? programs[0];
  const notice = first(query.notice);
  const error = first(query.error);

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#content-manager">
        Lewati ke pengelola konten
      </a>

      <AdminHeader
        activeItem="content"
        adminName={admin.name}
        announcement="Ruang konten admin & pembina ekstrakurikuler"
        brandSubtitle="Kelola konten ekskul"
        roleLabel="Admin / Pembina"
      />

      <div className={styles.shell} id="content-manager">
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Satu panel / tiga jenis konten</p>
            <h1>
              Kabar ekskul, <span>selalu hidup.</span>
            </h1>
            <p>
              Terbitkan agenda lomba, rekam prestasi, dan susun galeri. Konten yang
              aktif langsung tampil pada halaman siswa.
            </p>
          </div>
          <div className={styles.heroStats}>
            <article>
              <span>Lomba</span>
              <strong>{selectedProgram?.competitions.length ?? 0}</strong>
            </article>
            <article>
              <span>Prestasi</span>
              <strong>{selectedProgram?.achievements.length ?? 0}</strong>
            </article>
            <article>
              <span>Galeri</span>
              <strong>{selectedProgram?.galleryItems.length ?? 0}</strong>
            </article>
          </div>
        </section>

        {notice && notices[notice] ? (
          <p className={styles.successNotice} role="status">
            ✓ {notices[notice]}
          </p>
        ) : null}
        {error ? (
          <p className={styles.errorNotice} role="alert">
            Konten tidak dapat diproses. Muat ulang halaman lalu coba kembali.
          </p>
        ) : null}

        <nav className={styles.programTabs} aria-label="Pilih ekstrakurikuler">
          {programs.map((program) => {
            const slug = slugify(program.name);
            return (
              <Link
                aria-current={program.id === selectedProgram?.id ? "page" : undefined}
                className={program.id === selectedProgram?.id ? styles.activeTab : ""}
                href={`/admin/lomba?ekskul=${encodeURIComponent(slug)}`}
                key={program.id}
              >
                {program.name}
              </Link>
            );
          })}
        </nav>

        {selectedProgram ? (
          <>
            <div className={styles.programHeading}>
              <div>
                <p className={styles.eyebrow}>Sedang dikelola</p>
                <h2>{selectedProgram.name}</h2>
              </div>
              <Link href={`/eskul/${slugify(selectedProgram.name)}`} target="_blank">
                Lihat halaman siswa ↗
              </Link>
            </div>

            <section className={styles.managerSection} aria-labelledby="competition-manager-title">
              <div className={styles.sectionIntro}>
                <span>01</span>
                <div>
                  <p className={styles.eyebrow}>Agenda kompetisi</p>
                  <h2 id="competition-manager-title">Informasi lomba</h2>
                  <p>Tambahkan lomba yang relevan dan tautan pendaftarannya.</p>
                </div>
              </div>

              <form action={createCompetitionAction} className={styles.createForm}>
                <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                <h3>Tambah lomba baru</h3>
                <div className={styles.formGrid}>
                  <label className={styles.wideField}>
                    <span>Judul lomba *</span>
                    <input maxLength={180} name="title" placeholder="Contoh: Lomba Paskibra Tingkat DKI" required />
                  </label>
                  <label>
                    <span>Penyelenggara</span>
                    <input maxLength={180} name="organizer" placeholder="Nama penyelenggara" />
                  </label>
                  <label>
                    <span>Tingkat</span>
                    <input maxLength={80} name="level" placeholder="Sekolah / Kota / Nasional" />
                  </label>
                  <label>
                    <span>Tanggal lomba *</span>
                    <input name="eventDate" required type="date" />
                  </label>
                  <label>
                    <span>Batas pendaftaran</span>
                    <input name="registrationDeadline" type="date" />
                  </label>
                  <label className={styles.wideField}>
                    <span>Lokasi</span>
                    <input maxLength={180} name="location" placeholder="Lokasi kegiatan" />
                  </label>
                  <label className={styles.wideField}>
                    <span>Deskripsi *</span>
                    <textarea maxLength={5000} name="description" placeholder="Syarat, kategori, dan informasi penting lomba" required rows={4} />
                  </label>
                  <label className={styles.wideField}>
                    <span>Tautan pendaftaran (HTTPS)</span>
                    <input name="registrationUrl" placeholder="https://..." type="url" />
                  </label>
                </div>
                <PublishedToggle />
                <button className={styles.primaryButton} type="submit">Terbitkan lomba →</button>
              </form>

              <div className={styles.contentList}>
                {selectedProgram.competitions.length > 0 ? (
                  selectedProgram.competitions.map((competition) => (
                    <article className={styles.contentCard} key={competition.id}>
                      <div className={styles.cardSummary}>
                        <div>
                          <span className={competition.isPublished ? styles.published : styles.draft}>
                            {competition.isPublished ? "Tayang" : "Draf"}
                          </span>
                          <h3>{competition.title}</h3>
                          <p>{dateValue(competition.eventDate)} · {competition.location ?? "Lokasi menyusul"}</p>
                        </div>
                        <form action={deleteCompetitionAction}>
                          <input name="id" type="hidden" value={competition.id} />
                          <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                          <button className={styles.deleteButton} type="submit">Hapus</button>
                        </form>
                      </div>
                      <details>
                        <summary>Edit informasi lomba</summary>
                        <form action={updateCompetitionAction} className={styles.editForm}>
                          <input name="id" type="hidden" value={competition.id} />
                          <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                          <div className={styles.formGrid}>
                            <label className={styles.wideField}><span>Judul *</span><input defaultValue={competition.title} maxLength={180} name="title" required /></label>
                            <label><span>Penyelenggara</span><input defaultValue={competition.organizer ?? ""} maxLength={180} name="organizer" /></label>
                            <label><span>Tingkat</span><input defaultValue={competition.level ?? ""} maxLength={80} name="level" /></label>
                            <label><span>Tanggal lomba *</span><input defaultValue={dateValue(competition.eventDate)} name="eventDate" required type="date" /></label>
                            <label><span>Batas pendaftaran</span><input defaultValue={dateValue(competition.registrationDeadline)} name="registrationDeadline" type="date" /></label>
                            <label className={styles.wideField}><span>Lokasi</span><input defaultValue={competition.location ?? ""} maxLength={180} name="location" /></label>
                            <label className={styles.wideField}><span>Deskripsi *</span><textarea defaultValue={competition.description} maxLength={5000} name="description" required rows={4} /></label>
                            <label className={styles.wideField}><span>Tautan pendaftaran</span><input defaultValue={competition.registrationUrl ?? ""} name="registrationUrl" type="url" /></label>
                          </div>
                          <PublishedToggle defaultChecked={competition.isPublished} />
                          <button className={styles.saveButton} type="submit">Simpan perubahan</button>
                        </form>
                      </details>
                    </article>
                  ))
                ) : (
                  <p className={styles.emptyState}>Belum ada lomba untuk {selectedProgram.name}.</p>
                )}
              </div>
            </section>

            <section className={styles.managerSection} aria-labelledby="achievement-manager-title">
              <div className={styles.sectionIntro}>
                <span>02</span>
                <div>
                  <p className={styles.eyebrow}>Rekam jejak</p>
                  <h2 id="achievement-manager-title">Prestasi ekskul</h2>
                  <p>Catat pencapaian yang akan tampil di profil ekskul.</p>
                </div>
              </div>
              <form action={createAchievementAction} className={styles.createForm}>
                <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                <h3>Tambah prestasi</h3>
                <div className={styles.formGrid}>
                  <label className={styles.wideField}><span>Judul prestasi *</span><input maxLength={180} name="title" placeholder="Contoh: Juara 1 Tingkat Kota" required /></label>
                  <label><span>Nama kompetisi</span><input maxLength={180} name="competitionName" /></label>
                  <label><span>Peringkat / penghargaan *</span><input maxLength={100} name="rank" placeholder="Juara 1" required /></label>
                  <label><span>Tingkat</span><input maxLength={80} name="level" placeholder="Kota / Provinsi / Nasional" /></label>
                  <label><span>Tanggal diraih *</span><input name="achievedAt" required type="date" /></label>
                  <label className={styles.wideField}><span>Cerita singkat</span><textarea maxLength={5000} name="description" rows={3} /></label>
                </div>
                <PublishedToggle />
                <button className={styles.primaryButton} type="submit">Tambahkan prestasi →</button>
              </form>
              <div className={styles.contentList}>
                {selectedProgram.achievements.length > 0 ? selectedProgram.achievements.map((achievement) => (
                  <article className={styles.contentCard} key={achievement.id}>
                    <div className={styles.cardSummary}>
                      <div>
                        <span className={achievement.isPublished ? styles.published : styles.draft}>{achievement.isPublished ? "Tayang" : "Draf"}</span>
                        <h3>{achievement.title}</h3>
                        <p>{achievement.rank} · {dateValue(achievement.achievedAt)}</p>
                      </div>
                      <form action={deleteAchievementAction}>
                        <input name="id" type="hidden" value={achievement.id} />
                        <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                        <button className={styles.deleteButton} type="submit">Hapus</button>
                      </form>
                    </div>
                    <details>
                      <summary>Edit prestasi</summary>
                      <form action={updateAchievementAction} className={styles.editForm}>
                        <input name="id" type="hidden" value={achievement.id} />
                        <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                        <div className={styles.formGrid}>
                          <label className={styles.wideField}><span>Judul *</span><input defaultValue={achievement.title} maxLength={180} name="title" required /></label>
                          <label><span>Nama kompetisi</span><input defaultValue={achievement.competitionName ?? ""} maxLength={180} name="competitionName" /></label>
                          <label><span>Peringkat *</span><input defaultValue={achievement.rank} maxLength={100} name="rank" required /></label>
                          <label><span>Tingkat</span><input defaultValue={achievement.level ?? ""} maxLength={80} name="level" /></label>
                          <label><span>Tanggal *</span><input defaultValue={dateValue(achievement.achievedAt)} name="achievedAt" required type="date" /></label>
                          <label className={styles.wideField}><span>Cerita singkat</span><textarea defaultValue={achievement.description ?? ""} maxLength={5000} name="description" rows={3} /></label>
                        </div>
                        <PublishedToggle defaultChecked={achievement.isPublished} />
                        <button className={styles.saveButton} type="submit">Simpan perubahan</button>
                      </form>
                    </details>
                  </article>
                )) : <p className={styles.emptyState}>Belum ada prestasi untuk {selectedProgram.name}.</p>}
              </div>
            </section>

            <section className={styles.managerSection} aria-labelledby="gallery-manager-title">
              <div className={styles.sectionIntro}>
                <span>03</span>
                <div>
                  <p className={styles.eyebrow}>Dokumentasi visual</p>
                  <h2 id="gallery-manager-title">Galeri kegiatan</h2>
                  <p>Gunakan path aset publik seperti /galeri/foto.webp atau URL HTTPS.</p>
                </div>
              </div>
              <form action={createGalleryItemAction} className={styles.createForm}>
                <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                <h3>Tambah foto</h3>
                <div className={styles.formGrid}>
                  <label className={styles.wideField}><span>Path / URL gambar *</span><input name="imageUrl" placeholder="/galeri/nama-foto.webp" required /></label>
                  <label className={styles.wideField}><span>Teks alternatif *</span><input maxLength={240} name="altText" placeholder="Jelaskan isi foto untuk aksesibilitas" required /></label>
                  <label className={styles.wideField}><span>Caption</span><textarea maxLength={500} name="caption" rows={2} /></label>
                  <label><span>Tanggal foto</span><input name="takenAt" type="date" /></label>
                  <label><span>Urutan</span><input defaultValue="0" max="999" min="0" name="position" type="number" /></label>
                </div>
                <PublishedToggle />
                <button className={styles.primaryButton} type="submit">Tambahkan foto →</button>
              </form>
              <div className={styles.galleryAdminGrid}>
                {selectedProgram.galleryItems.length > 0 ? selectedProgram.galleryItems.map((item) => (
                  <article className={styles.galleryAdminCard} key={item.id}>
                    <div className={styles.galleryPreview}><ContentImage alt={item.altText} src={item.imageUrl} /></div>
                    <div className={styles.cardSummary}>
                      <div>
                        <span className={item.isPublished ? styles.published : styles.draft}>{item.isPublished ? "Tayang" : "Draf"}</span>
                        <h3>{item.caption || item.altText}</h3>
                        <p>Urutan {item.position}</p>
                      </div>
                      <form action={deleteGalleryItemAction}>
                        <input name="id" type="hidden" value={item.id} />
                        <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                        <button className={styles.deleteButton} type="submit">Hapus</button>
                      </form>
                    </div>
                    <details>
                      <summary>Edit foto</summary>
                      <form action={updateGalleryItemAction} className={styles.editForm}>
                        <input name="id" type="hidden" value={item.id} />
                        <input name="extracurricularId" type="hidden" value={selectedProgram.id} />
                        <div className={styles.formGrid}>
                          <label className={styles.wideField}><span>Path / URL *</span><input defaultValue={item.imageUrl} name="imageUrl" required /></label>
                          <label className={styles.wideField}><span>Teks alternatif *</span><input defaultValue={item.altText} maxLength={240} name="altText" required /></label>
                          <label className={styles.wideField}><span>Caption</span><textarea defaultValue={item.caption ?? ""} maxLength={500} name="caption" rows={2} /></label>
                          <label><span>Tanggal foto</span><input defaultValue={dateValue(item.takenAt)} name="takenAt" type="date" /></label>
                          <label><span>Urutan</span><input defaultValue={item.position} max="999" min="0" name="position" type="number" /></label>
                        </div>
                        <PublishedToggle defaultChecked={item.isPublished} />
                        <button className={styles.saveButton} type="submit">Simpan perubahan</button>
                      </form>
                    </details>
                  </article>
                )) : <p className={styles.emptyState}>Belum ada foto galeri untuk {selectedProgram.name}.</p>}
              </div>
            </section>
          </>
        ) : (
          <p className={styles.emptyState}>Belum ada ekstrakurikuler aktif untuk dikelola.</p>
        )}
      </div>
    </main>
  );
}
