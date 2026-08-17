"use client";

import { useEffect, useState, useCallback } from "react";
import { CompetitionForm, type CompetitionData } from "./forms/competition-form";
import { AchievementForm, type AchievementData } from "./forms/achievement-form";
import { GalleryForm, type GalleryData } from "./forms/gallery-form";

export type ContentDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  contentType: "competitions" | "achievements" | "gallery";
  initialData?: CompetitionData | AchievementData | GalleryData | null;
  extracurricularId: string;
  extracurricularName: string;
};

const TYPE_CONFIG = {
  competitions: {
    label: "Lomba",
    titleCreate: "Tambah Agenda Lomba",
    titleEdit: "Edit Informasi Lomba",
    activeColor: "bg-exisel-blue text-white",
  },
  achievements: {
    label: "Prestasi",
    titleCreate: "Tambah Prestasi Ekskul",
    titleEdit: "Edit Prestasi Ekskul",
    activeColor: "bg-exisel-orange text-white",
  },
  gallery: {
    label: "Galeri",
    titleCreate: "Tambah Foto Galeri",
    titleEdit: "Edit Foto Galeri",
    activeColor: "bg-emerald-600 text-white",
  },
} as const;

export function ContentDrawer({
  isOpen,
  onClose,
  mode,
  contentType: defaultContentType,
  initialData,
  extracurricularId,
  extracurricularName,
}: ContentDrawerProps) {
  const [activeType, setActiveType] = useState<
    "competitions" | "achievements" | "gallery"
  >(defaultContentType);
  const [isDirty, setIsDirty] = useState(false);

  // Sync defaultContentType when opened or changed
  useEffect(() => {
    if (isOpen) {
      setActiveType(defaultContentType);
      setIsDirty(false);
    }
  }, [isOpen, defaultContentType]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Perubahan belum disimpan. Yakin ingin menutup form ini?"
      );
      if (!confirmLeave) return;
    }
    setIsDirty(false);
    onClose();
  }, [isDirty, onClose]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const currentConfig = TYPE_CONFIG[activeType];
  const headerTitle =
    mode === "edit" ? currentConfig.titleEdit : currentConfig.titleCreate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-[4px] border-exisel-ink bg-exisel-bg shadow-brutal-xl animate-in zoom-in-95 duration-150"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex flex-col border-b-[3px] border-exisel-ink bg-white p-5 sm:p-6 shadow-brutal-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-md border-[2px] border-exisel-ink bg-exisel-lavender px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-exisel-ink">
                  {extracurricularName}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-exisel-muted">
                  {mode === "create" ? "Tambah Baru" : "Edit Konten"}
                </span>
              </div>
              <h3
                id="drawer-title"
                className="mt-1 text-xl font-black tracking-tight text-exisel-ink sm:text-2xl"
              >
                {headerTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-exisel-ink bg-white font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              aria-label="Tutup form"
            >
              <svg
                className="h-5 w-5 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Type-picker switch when in create mode */}
          {mode === "create" && (
            <div className="mt-4 flex rounded-xl border-[3px] border-exisel-ink bg-white p-1 shadow-brutal-xs">
              {(
                [
                  "competitions",
                  "achievements",
                  "gallery",
                ] as (keyof typeof TYPE_CONFIG)[]
              ).map((t) => {
                const isActive = activeType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (isDirty) {
                        const confirmSwitch = window.confirm(
                          "Mengganti tipe konten akan mengosongkan isian yang belum disimpan. Lanjutkan?"
                        );
                        if (!confirmSwitch) return;
                      }
                      setActiveType(t);
                      setIsDirty(false);
                    }}
                    className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? `${TYPE_CONFIG[t].activeColor} shadow-brutal-xs border-[2px] border-exisel-ink`
                        : "text-exisel-ink hover:bg-black/5"
                    }`}
                  >
                    {TYPE_CONFIG[t].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Body with Active Form */}
        <div className="flex-1 overflow-y-auto">
          {activeType === "competitions" && (
            <CompetitionForm
              mode={mode}
              initialData={mode === "edit" ? (initialData as CompetitionData) : null}
              extracurricularId={extracurricularId}
              onCancel={handleClose}
              onDirtyChange={setIsDirty}
            />
          )}
          {activeType === "achievements" && (
            <AchievementForm
              mode={mode}
              initialData={
                mode === "edit" ? (initialData as AchievementData) : null
              }
              extracurricularId={extracurricularId}
              onCancel={handleClose}
              onDirtyChange={setIsDirty}
            />
          )}
          {activeType === "gallery" && (
            <GalleryForm
              mode={mode}
              initialData={mode === "edit" ? (initialData as GalleryData) : null}
              extracurricularId={extracurricularId}
              onCancel={handleClose}
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
