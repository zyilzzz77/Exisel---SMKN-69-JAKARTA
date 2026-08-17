"use client";

import { useState, useTransition } from "react";
import {
  createAchievementAction,
  updateAchievementAction,
} from "@/actions/extracurricular-content";

export type AchievementData = {
  id?: string;
  title?: string;
  competitionName?: string | null;
  rank?: string;
  level?: string | null;
  achievedAt?: Date | string | null;
  description?: string | null;
  isPublished?: boolean;
};

type AchievementFormProps = {
  mode: "create" | "edit";
  initialData?: AchievementData | null;
  extracurricularId: string;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function AchievementForm({
  mode,
  initialData,
  extracurricularId,
  onCancel,
  onDirtyChange,
}: AchievementFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [competitionName, setCompetitionName] = useState(
    initialData?.competitionName ?? ""
  );
  const [rank, setRank] = useState(initialData?.rank ?? "");
  const [level, setLevel] = useState(initialData?.level ?? "");
  const [achievedAt, setAchievedAt] = useState(
    formatDateInput(initialData?.achievedAt)
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished ?? true
  );

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
    formData.append("competitionName", competitionName);
    formData.append("rank", rank);
    formData.append("level", level);
    formData.append("achievedAt", achievedAt);
    formData.append("description", description);
    if (isPublished) {
      formData.append("isPublished", "on");
    }

    startTransition(async () => {
      try {
        if (mode === "edit") {
          await updateAchievementAction(formData);
        } else {
          await createAchievementAction(formData);
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
            : "Terjadi kesalahan saat menyimpan prestasi. Cek kembali form."
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

        {/* Section: Informasi Prestasi */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-exisel-orange mb-3">
            01. Pencapaian & Kompetisi
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Judul Prestasi <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={180}
                placeholder="Contoh: Juara 1 Turnamen Futsal Walikota Cup 2026"
                value={title}
                onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Nama Ajang / Kompetisi
              </label>
              <input
                type="text"
                maxLength={180}
                placeholder="Contoh: Honda DBL Series Jakarta 2026"
                value={competitionName}
                onChange={(e) =>
                  handleFieldChange(setCompetitionName, e.target.value)
                }
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Peringkat / Medali <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Contoh: Juara 1 / Emas / Best Speaker"
                  value={rank}
                  onChange={(e) => handleFieldChange(setRank, e.target.value)}
                  className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Tingkat Prestasi
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
          </div>
        </div>

        {/* Section: Waktu & Cerita */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-exisel-orange mb-3">
            02. Waktu & Catatan Cerita
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Tanggal Diraih <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={achievedAt}
                onChange={(e) => handleFieldChange(setAchievedAt, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Cerita / Deskripsi Pencapaian
              </label>
              <textarea
                rows={4}
                maxLength={5000}
                placeholder="Bagikan perjuangan tim atau apresiasi anggota peraih penghargaan..."
                value={description}
                onChange={(e) => handleFieldChange(setDescription, e.target.value)}
                className="w-full rounded-lg border-[3px] border-exisel-ink bg-white p-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>
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
                  ? "Prestasi ditampilkan di etalase pencapaian profil ekskul."
                  : "Disimpan sebagai draf internal."}
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
              <div className="w-12 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-exisel-ink after:border-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-exisel-orange border-[2.5px] border-exisel-ink" />
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-exisel-ink bg-exisel-orange px-6 text-sm font-bold text-white shadow-brutal-xs transition-all hover:brightness-105 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
        >
          {isPending
            ? "Menyimpan..."
            : mode === "edit"
            ? "Simpan Perubahan"
            : "Tambahkan Prestasi"}
        </button>
      </div>
    </form>
  );
}
