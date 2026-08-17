"use client";

import Link from "next/link";
import type { ExtracurricularProgram } from "./types";

type EskulSelectorProps = {
  programs: ExtracurricularProgram[];
  selectedProgramId: string;
  onSelectProgram?: (id: string) => void;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EskulSelector({
  programs,
  selectedProgramId,
  onSelectProgram,
}: EskulSelectorProps) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-exisel-muted">
          Pilih Ekstrakurikuler
        </p>
        <span className="text-xs font-bold text-exisel-muted">
          {programs.length} Ekskul
        </span>
      </div>

      <nav
        aria-label="Pilih ekstrakurikuler"
        className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {programs.map((program) => {
          const isSelected = program.id === selectedProgramId;
          const totalContent =
            (program.competitions?.length ?? 0) +
            (program.achievements?.length ?? 0) +
            (program.galleryItems?.length ?? 0);

          if (onSelectProgram) {
            return (
              <button
                key={program.id}
                type="button"
                onClick={() => onSelectProgram(program.id)}
                aria-current={isSelected ? "page" : undefined}
                className={`group shrink-0 inline-flex items-center gap-2 rounded-full border-[3px] border-exisel-ink px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? "bg-exisel-blue text-white shadow-brutal-sm -translate-y-0.5"
                    : "bg-white text-exisel-ink shadow-brutal-xs hover:bg-neutral-100 hover:shadow-brutal-sm"
                }`}
              >
                <span>{program.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-exisel-muted group-hover:bg-neutral-200"
                  }`}
                >
                  {totalContent}
                </span>
              </button>
            );
          }

          const slug = slugify(program.name);
          return (
            <Link
              key={program.id}
              href={`/admin/lomba?ekskul=${encodeURIComponent(slug)}`}
              aria-current={isSelected ? "page" : undefined}
              className={`group shrink-0 inline-flex items-center gap-2 rounded-full border-[3px] border-exisel-ink px-4 py-2 text-xs font-black transition-all ${
                isSelected
                  ? "bg-exisel-blue text-white shadow-brutal-sm -translate-y-0.5"
                  : "bg-white text-exisel-ink shadow-brutal-xs hover:bg-neutral-100 hover:shadow-brutal-sm"
              }`}
            >
              <span>{program.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-exisel-muted group-hover:bg-neutral-200"
                }`}
              >
                {totalContent}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
