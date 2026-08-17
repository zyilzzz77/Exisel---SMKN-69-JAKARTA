"use client";

import type { ContentType } from "./types";

type ContentEmptyStateProps = {
  activeType: ContentType;
  programName?: string;
  hasFilter?: boolean;
  onOpenCreate?: () => void;
  onResetFilter?: () => void;
};

export function ContentEmptyState({
  activeType,
  programName = "ekskul ini",
  hasFilter = false,
  onOpenCreate,
  onResetFilter,
}: ContentEmptyStateProps) {
  const getContentConfig = () => {
    switch (activeType) {
      case "competitions":
        return {
          icon: "🏆",
          title: hasFilter
            ? "Lomba tidak ditemukan"
            : `Belum ada agenda lomba untuk ${programName}`,
          description: hasFilter
            ? "Tidak ada data lomba yang sesuai dengan kata kunci atau filter pencarian saat ini."
            : "Mulai tambahkan informasi agenda lomba agar siswa dapat melihat kompetisi yang dapat diikuti.",
          buttonText: "+ Tambah lomba baru",
          buttonColor: "bg-exisel-blue hover:bg-blue-700",
        };
      case "achievements":
        return {
          icon: "🎖️",
          title: hasFilter
            ? "Prestasi tidak ditemukan"
            : `Belum ada catatan prestasi untuk ${programName}`,
          description: hasFilter
            ? "Tidak ada data prestasi yang cocok dengan parameter filter yang Anda pilih."
            : "Dokumentasikan pencapaian dan kejuaraan yang pernah diraih oleh anggota ekskul.",
          buttonText: "+ Catat prestasi baru",
          buttonColor: "bg-exisel-orange hover:bg-orange-600",
        };
      case "gallery":
        return {
          icon: "📸",
          title: hasFilter
            ? "Foto galeri tidak ditemukan"
            : `Galeri foto ${programName} masih kosong`,
          description: hasFilter
            ? "Tidak ada foto dalam galeri yang sesuai dengan kriteria pencarian ini."
            : "Unggah dan atur foto dokumentasi kegiatan untuk ditampilkan pada halaman profil ekskul.",
          buttonText: "+ Unggah foto galeri",
          buttonColor: "bg-emerald-600 hover:bg-emerald-700",
        };
    }
  };

  const config = getContentConfig();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-exisel-ink bg-white px-6 py-16 text-center shadow-brutal-sm sm:py-20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-exisel-ink bg-exisel-bg text-3xl shadow-brutal-xs">
        <span>{config.icon}</span>
      </div>

      <h3 className="text-xl font-black tracking-tight text-exisel-ink sm:text-2xl">
        {config.title}
      </h3>

      <p className="mt-2 max-w-md text-xs font-semibold text-exisel-muted sm:text-sm">
        {config.description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasFilter && onResetFilter ? (
          <button
            type="button"
            onClick={onResetFilter}
            className="inline-flex h-11 items-center justify-center rounded-xl border-[3px] border-exisel-ink bg-white px-5 text-xs font-black text-exisel-ink shadow-brutal-xs hover:bg-neutral-100 cursor-pointer"
          >
            Reset Filter Pencarian
          </button>
        ) : onOpenCreate ? (
          <button
            type="button"
            onClick={onOpenCreate}
            className={`inline-flex h-11 items-center justify-center rounded-xl border-[3px] border-exisel-ink ${config.buttonColor} px-6 text-xs font-black text-white shadow-brutal-xs transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 cursor-pointer`}
          >
            {config.buttonText}
          </button>
        ) : null}
      </div>
    </div>
  );
}
