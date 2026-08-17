"use client";

import type { AchievementItem, ViewMode } from "./types";

type PrestasiCardProps = {
  achievement: AchievementItem;
  viewMode?: ViewMode;
  onEdit: (achievement: AchievementItem) => void;
  onDelete: (achievement: AchievementItem) => void;
};

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PrestasiCard({
  achievement,
  viewMode = "grid",
  onEdit,
  onDelete,
}: PrestasiCardProps) {
  if (viewMode === "list") {
    return (
      <article className="group flex flex-col justify-between gap-4 rounded-xl border-[3px] border-exisel-ink bg-white p-4 shadow-brutal-sm transition-all hover:shadow-brutal-md sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border-[2px] border-exisel-ink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                achievement.isPublished
                  ? "bg-emerald-200 text-emerald-950"
                  : "bg-neutral-200 text-neutral-800"
              }`}
            >
              {achievement.isPublished ? "Tayang" : "Draf"}
            </span>
            <span className="rounded-md border-[2px] border-exisel-ink bg-exisel-orange px-2 py-0.5 text-[10px] font-black text-white shadow-brutal-xs">
              🏆 {achievement.rank}
            </span>
            {achievement.level && (
              <span className="rounded-md border-[2px] border-exisel-ink bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-950">
                {achievement.level}
              </span>
            )}
            <span className="text-xs font-bold text-exisel-muted">
              📅 {formatDate(achievement.achievedAt)}
            </span>
          </div>

          <h3 className="text-base font-black text-exisel-ink truncate">
            {achievement.title}
          </h3>

          {achievement.competitionName && (
            <p className="mt-0.5 text-xs font-semibold text-exisel-muted truncate">
              Kompetisi: {achievement.competitionName}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(achievement)}
            className="inline-flex h-9 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-exisel-orange px-3 text-xs font-bold text-white shadow-brutal-xs hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(achievement)}
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
    <article className="group flex min-h-[260px] flex-col justify-between rounded-xl border-[3px] border-exisel-ink bg-white p-5 shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={`rounded-md border-[2px] border-exisel-ink px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
              achievement.isPublished
                ? "bg-emerald-200 text-emerald-950"
                : "bg-neutral-200 text-neutral-800"
            }`}
          >
            {achievement.isPublished ? "Tayang" : "Draf"}
          </span>
          <span className="rounded-md border-[2px] border-exisel-ink bg-exisel-orange px-2.5 py-0.5 text-xs font-black text-white shadow-brutal-xs">
            🏆 {achievement.rank}
          </span>
        </div>

        <h3 className="line-clamp-2 text-lg font-black tracking-tight text-exisel-ink group-hover:text-exisel-orange">
          {achievement.title}
        </h3>

        {achievement.competitionName && (
          <p className="mt-1.5 text-xs font-bold text-exisel-muted">
            Kompetisi: <span className="text-exisel-ink">{achievement.competitionName}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-exisel-muted">
          <span className="inline-flex items-center gap-1 rounded-md border-[2px] border-exisel-ink bg-exisel-bg px-2 py-0.5">
            📅 {formatDate(achievement.achievedAt)}
          </span>
          {achievement.level && (
            <span className="inline-flex items-center gap-1 rounded-md border-[2px] border-exisel-ink bg-amber-100 px-2 py-0.5 text-amber-950">
              Tingkat {achievement.level}
            </span>
          )}
        </div>

        {achievement.description && (
          <p className="mt-3 line-clamp-3 text-xs font-medium text-exisel-muted">
            {achievement.description}
          </p>
        )}
      </div>

      <div className="mt-5 border-t-[2px] border-neutral-200 pt-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(achievement)}
            className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-white px-3 text-xs font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(achievement)}
            className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-red-100 px-3 text-xs font-bold text-red-700 shadow-brutal-xs transition-all hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Hapus
          </button>
        </div>
      </div>
    </article>
  );
}
