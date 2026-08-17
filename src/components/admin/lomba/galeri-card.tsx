"use client";

import { ContentImage } from "@/components/content-image";
import type { GalleryItem, ViewMode } from "./types";

type GaleriCardProps = {
  item: GalleryItem;
  viewMode?: ViewMode;
  onEdit: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
};

function formatDate(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GaleriCard({
  item,
  viewMode = "grid",
  onEdit,
  onDelete,
}: GaleriCardProps) {
  const formattedDate = formatDate(item.takenAt);

  if (viewMode === "list") {
    return (
      <article className="group flex flex-col justify-between gap-4 rounded-xl border-[3px] border-exisel-ink bg-white p-4 shadow-brutal-sm transition-all hover:shadow-brutal-md sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-[2px] border-exisel-ink bg-neutral-100">
            <ContentImage
              alt={item.altText}
              src={item.imageUrl}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border-[2px] border-exisel-ink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  item.isPublished
                    ? "bg-emerald-200 text-emerald-950"
                    : "bg-neutral-200 text-neutral-800"
                }`}
              >
                {item.isPublished ? "Tayang" : "Draf"}
              </span>
              <span className="rounded-md border-[2px] border-exisel-ink bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                Posisi: #{item.position}
              </span>
              {formattedDate && (
                <span className="text-xs font-bold text-exisel-muted">
                  📅 {formattedDate}
                </span>
              )}
            </div>

            <h3 className="text-sm font-black text-exisel-ink truncate">
              {item.caption || item.altText}
            </h3>
            {item.caption && (
              <p className="text-xs text-exisel-muted truncate">Alt: {item.altText}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex h-9 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-emerald-600 px-3 text-xs font-bold text-white shadow-brutal-xs hover:bg-emerald-700 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-9 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-red-100 px-3 text-xs font-bold text-red-700 shadow-brutal-xs hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Hapus
          </button>
        </div>
      </article>
    );
  }

  // Default Grid Layout
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border-[3px] border-exisel-ink bg-white shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md">
      <div>
        <div className="relative aspect-[4/3] w-full border-b-[3px] border-exisel-ink bg-neutral-100 overflow-hidden">
          <ContentImage
            alt={item.altText}
            src={item.imageUrl}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span
              className={`rounded-md border-[2px] border-exisel-ink px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-brutal-xs ${
                item.isPublished
                  ? "bg-emerald-200 text-emerald-950"
                  : "bg-neutral-200 text-neutral-800"
              }`}
            >
              {item.isPublished ? "Tayang" : "Draf"}
            </span>
            <span className="rounded-md border-[2px] border-exisel-ink bg-white px-2 py-0.5 text-[11px] font-black text-exisel-ink shadow-brutal-xs">
              #{item.position}
            </span>
          </div>
        </div>

        <div className="p-4">
          <p className="line-clamp-2 text-sm font-black text-exisel-ink group-hover:text-emerald-700">
            {item.caption || item.altText}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold text-exisel-muted">
            {formattedDate && (
              <span className="inline-flex items-center gap-1">
                📅 {formattedDate}
              </span>
            )}
            <span className="truncate text-[11px] font-semibold text-neutral-500">
              Alt: {item.altText}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t-[2px] border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-white px-3 text-xs font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-red-100 px-3 text-xs font-bold text-red-700 shadow-brutal-xs transition-all hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Hapus
          </button>
        </div>
      </div>
    </article>
  );
}
