"use client";

import type { ContentType } from "./types";

type AdminContentHeaderProps = {
  competitionsCount: number;
  achievementsCount: number;
  galleryCount: number;
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  onOpenCreate: () => void;
};

export function AdminContentHeader({
  competitionsCount,
  achievementsCount,
  galleryCount,
  activeType,
  onTypeChange,
  onOpenCreate,
}: AdminContentHeaderProps) {
  return (
    <header className="border-b-[4px] border-exisel-ink bg-exisel-bg px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-exisel-blue">
            Satu panel / tiga jenis konten
          </p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-exisel-ink sm:text-4xl lg:text-5xl">
            Kabar ekskul, <span className="text-exisel-blue">tetap hidup.</span>
          </h1>
          <p className="mt-2 text-sm font-semibold text-exisel-muted sm:text-base">
            Kelola agenda lomba, prestasi, dan galeri yang tampil di halaman siswa dari satu tempat.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-exisel-ink bg-exisel-blue px-6 text-sm font-black text-white shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-xs sm:w-auto cursor-pointer"
          >
            <svg
              className="h-5 w-5 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Tambah konten</span>
          </button>

          <div className="grid w-full grid-cols-3 gap-2.5 sm:w-auto sm:min-w-[360px]">
            <button
              type="button"
              onClick={() => onTypeChange("competitions")}
              className={`flex flex-col rounded-xl border-[3px] border-exisel-ink p-3 text-left transition-all cursor-pointer ${
                activeType === "competitions"
                  ? "bg-exisel-blue text-white shadow-brutal-sm -translate-y-0.5"
                  : "bg-white text-exisel-ink shadow-brutal-xs hover:bg-neutral-50 hover:shadow-brutal-sm"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  activeType === "competitions" ? "text-exisel-blue-light" : "text-exisel-blue"
                }`}
              >
                Lomba
              </span>
              <span className="text-xl font-black leading-tight sm:text-2xl">
                {competitionsCount}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  activeType === "competitions" ? "text-white/80" : "text-exisel-muted"
                }`}
              >
                Agenda aktif
              </span>
            </button>

            <button
              type="button"
              onClick={() => onTypeChange("achievements")}
              className={`flex flex-col rounded-xl border-[3px] border-exisel-ink p-3 text-left transition-all cursor-pointer ${
                activeType === "achievements"
                  ? "bg-exisel-orange text-white shadow-brutal-sm -translate-y-0.5"
                  : "bg-white text-exisel-ink shadow-brutal-xs hover:bg-neutral-50 hover:shadow-brutal-sm"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  activeType === "achievements" ? "text-exisel-orange-light" : "text-exisel-orange"
                }`}
              >
                Prestasi
              </span>
              <span className="text-xl font-black leading-tight sm:text-2xl">
                {achievementsCount}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  activeType === "achievements" ? "text-white/80" : "text-exisel-muted"
                }`}
              >
                Rekam jejak
              </span>
            </button>

            <button
              type="button"
              onClick={() => onTypeChange("gallery")}
              className={`flex flex-col rounded-xl border-[3px] border-exisel-ink p-3 text-left transition-all cursor-pointer ${
                activeType === "gallery"
                  ? "bg-emerald-600 text-white shadow-brutal-sm -translate-y-0.5"
                  : "bg-white text-exisel-ink shadow-brutal-xs hover:bg-neutral-50 hover:shadow-brutal-sm"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  activeType === "gallery" ? "text-emerald-100" : "text-emerald-700"
                }`}
              >
                Galeri
              </span>
              <span className="text-xl font-black leading-tight sm:text-2xl">
                {galleryCount}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  activeType === "gallery" ? "text-white/80" : "text-exisel-muted"
                }`}
              >
                Dokumentasi
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
