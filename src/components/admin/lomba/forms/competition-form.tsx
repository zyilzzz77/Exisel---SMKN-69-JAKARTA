"use client";

import { useState, useTransition } from "react";
import {
  createCompetitionAction,
  updateCompetitionAction,
} from "@/actions/extracurricular-content";

export type CompetitionData = {
  id?: string;
  title?: string;
  organizer?: string | null;
  level?: string | null;
  eventDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  location?: string | null;
  description?: string;
  registrationUrl?: string | null;
  isPublished?: boolean;
};

type CompetitionFormProps = {
  mode: "create" | "edit";
  initialData?: CompetitionData | null;
  extracurricularId: string;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function CompetitionForm({
  mode,
  initialData,
  extracurricularId,
  onCancel,
  onDirtyChange,
}: CompetitionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for change detection & validation
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [organizer, setOrganizer] = useState(initialData?.organizer ?? "");
  const [level, setLevel] = useState(initialData?.level ?? "");
  const [eventDate, setEventDate] = useState(formatDateInput(initialData?.eventDate));
  const [registrationDeadline, setRegistrationDeadline] = useState(
    formatDateInput(initialData?.registrationDeadline)
  );
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [registrationUrl, setRegistrationUrl] = useState(
    initialData?.registrationUrl ?? ""
  );
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? true);

  const handleFieldChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    onDirtyChange?.(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    if (mode === "edit" && initialData?.id) {
      formData.append("id", initialData.id);
    }
    formData.append("extracurricularId", extracurricularId);
    formData.append("title", title);
    formData.append("organizer", organizer);
    formData.append("level", level);
    formData.append("eventDate", eventDate);
    formData.append("registrationDeadline", registrationDeadline);
    formData.append("location", location);
    formData.append("description", description);
    formData.append("registrationUrl", registrationUrl);
    if (isPublished) {
      formData.append("isPublished", "on");
    }

    startTransition(async () => {
      try {
        if (mode === "edit") {
          await updateCompetitionAction(formData);
        } else {
          await createCompetitionAction(formData);
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT") ?? false)
        ) {
          throw err;
        }
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menyimpan lomba. Cek kembali form."
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
      <div className="space-y-6 p-6">
        {errorMsg && (
          <div className="rounded-lg border-[3px] border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Section: Informasi Utama */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-exisel-blue mb-3">
            01. Informasi Utama
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Judul Lomba <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={180}
                placeholder="Contoh: Kejuaraan Basket Pelajar Se-Jabodetabek"
                value={title}
                onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Penyelenggara
                </label>
                <input
                  type="text"
                  maxLength={180}
                  placeholder="Contoh: Perbasi / SMA 6 Jakarta"
                  value={organizer}
                  onChange={(e) => handleFieldChange(setOrganizer, e.target.value)}
                  className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Tingkat Kompetisi
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Sekolah / Kota / Provinsi / Nasional"
                  value={level}
                  onChange={(e) => handleFieldChange(setLevel, e.target.value)}
                  className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Lokasi / Venue
              </label>
              <input
                type="text"
                maxLength={180}
                placeholder="Contoh: GOR Bulungan, Jakarta Selatan"
                value={location}
                onChange={(e) => handleFieldChange(setLocation, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>
          </div>
        </div>

        {/* Section: Jadwal */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-exisel-blue mb-3">
            02. Waktu & Pendaftaran
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Tanggal Lomba <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => handleFieldChange(setEventDate, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Batas Registrasi
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) =>
                  handleFieldChange(setRegistrationDeadline, e.target.value)
                }
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
              Tautan Pendaftaran (HTTPS)
            </label>
            <input
              type="url"
              placeholder="https://forms.gle/... atau https://kompetisi.com/daftar"
              value={registrationUrl}
              onChange={(e) => handleFieldChange(setRegistrationUrl, e.target.value)}
              className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
            />
          </div>
        </div>

        {/* Section: Deskripsi */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-exisel-blue mb-3">
            03. Deskripsi & Rincian
          </h4>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
              Deskripsi Lomba <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              maxLength={5000}
              placeholder="Jelaskan detail persyaratan, sistem gugur/grup, hadiah, nomor kontak, dll. (Minimal 10 karakter)"
              value={description}
              onChange={(e) => handleFieldChange(setDescription, e.target.value)}
              className="w-full rounded-lg border-[3px] border-exisel-ink bg-white p-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
            />
          </div>
        </div>

        {/* Section: Status Publikasi */}
        <div className="rounded-xl border-[3px] border-exisel-ink bg-white p-4 shadow-brutal-xs">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="pr-4">
              <span className="block text-sm font-black text-exisel-ink">
                Status Publikasi
              </span>
              <span className="block text-xs font-semibold text-exisel-muted">
                {isPublished
                  ? "Konten tayang dan dapat dilihat siswa di halaman publik."
                  : "Disimpan sebagai draf (hanya terlihat oleh pengelola)."}
              </span>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => {
                  handleFieldChange(setIsPublished, e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-exisel-ink after:border-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-exisel-blue border-[2.5px] border-exisel-ink" />
            </div>
          </label>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between border-t-[3px] border-exisel-ink bg-white px-6 py-4 shadow-brutal-sm">
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center rounded-lg border-[3px] border-exisel-ink bg-white px-5 text-sm font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-exisel-ink bg-exisel-blue px-6 text-sm font-bold text-white shadow-brutal-xs transition-all hover:bg-exisel-blue-bright hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
        >
          {isPending
            ? "Menyimpan..."
            : mode === "edit"
            ? "Simpan Perubahan"
            : "Terbitkan Lomba"}
        </button>
      </div>
    </form>
  );
}
