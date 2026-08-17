"use client";

import type { ContentType } from "./types";

type ContentTypeTabsProps = {
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  counts: {
    competitions: number;
    achievements: number;
    gallery: number;
  };
};

export function ContentTypeTabs({
  activeType,
  onTypeChange,
  counts,
}: ContentTypeTabsProps) {
  const tabs: { id: ContentType; label: string; count: number; activeBg: string }[] = [
    {
      id: "competitions",
      label: "LOMBA",
      count: counts.competitions,
      activeBg: "bg-exisel-blue text-white",
    },
    {
      id: "achievements",
      label: "PRESTASI",
      count: counts.achievements,
      activeBg: "bg-exisel-orange text-white",
    },
    {
      id: "gallery",
      label: "GALERI",
      count: counts.gallery,
      activeBg: "bg-emerald-600 text-white",
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Pilih jenis konten"
      className="inline-flex max-w-full flex-wrap gap-1.5 rounded-xl border-[3px] border-exisel-ink bg-white p-1.5 shadow-brutal-sm sm:gap-2"
    >
      {tabs.map((tab) => {
        const isActive = activeType === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onTypeChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black tracking-wider transition-all cursor-pointer sm:px-5 sm:py-2.5 sm:text-sm ${
              isActive
                ? `${tab.activeBg} shadow-brutal-xs -translate-y-0.5`
                : "bg-transparent text-exisel-ink hover:bg-neutral-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-neutral-100 text-exisel-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
