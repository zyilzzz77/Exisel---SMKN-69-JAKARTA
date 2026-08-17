"use client";

import type { CompetitionItem, ViewMode } from "./types";

type LombaCardProps = {
  competition: CompetitionItem;
  viewMode?: ViewMode;
  onEdit: (competition: CompetitionItem) => void;
  onDelete: (competition: CompetitionItem) => void;
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

export function LombaCard({
  competition,
  viewMode = "grid",
  onEdit,
  onDelete,
}: LombaCardProps) {
  if (viewMode === "list") {
    return (
      <article className="group flex flex-col justify-between gap-4 rounded-xl border-[3px] border-exisel-ink bg-white p-4 shadow-brutal-sm transition-all hover:shadow-brutal-md sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border-[2px] border-exisel-ink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                competition.isPublished
                  ? "bg-emerald-200 text-emerald-950"
                  : "bg-neutral-200 text-neutral-800"
              }`}
            >
              {competition.isPublished ? "Tayang" : "Draf"}
            </span>
            {competition.level && (
              <span className="rounded-md border-[2px] border-exisel-ink bg-exisel-blue-light px-2 py-0.5 text-[10px] font-black text-exisel-ink">
                {competition.level}
              </span>
            )}
            <span className="text-xs font-bold text-exisel-muted">
              📅 {formatDate(competition.eventDate)}
            </span>
          </div>

          <h3 className="text-base font-black text-exisel-ink truncate">
            {competition.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-exisel-muted">
            {competition.organizer && <span>Penyelenggara: {competition.organizer}</span>}
            {competition.location && <span>📍 {competition.location}</span>}
            {competition.registrationDeadline && (
              <span>⏳ Deadline: {formatDate(competition.registrationDeadline)}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {competition.registrationUrl && (
            <a
              href={competition.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-white px-3 text-xs font-bold text-exisel-ink shadow-brutal-xs hover:bg-neutral-50"
              title="Buka tautan pendaftaran"
            >
              ↗ Link
            </a>
          )}
          <button
            type="button"
            onClick={() => onEdit(competition)}
            className="inline-flex h-9 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-exisel-blue px-3 text-xs font-bold text-white shadow-brutal-xs hover:bg-blue-700 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(competition)}
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
              competition.isPublished
                ? "bg-emerald-200 text-emerald-950"
                : "bg-neutral-200 text-neutral-800"
            }`}
          >
            {competition.isPublished ? "Tayang" : "Draf"}
          </span>
          {competition.level && (
            <span className="rounded-md border-[2px] border-exisel-ink bg-exisel-blue-light px-2 py-0.5 text-[11px] font-bold text-exisel-ink">
              {competition.level}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-lg font-black tracking-tight text-exisel-ink group-hover:text-exisel-blue">
          {competition.title}
        </h3>

        <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-bold text-exisel-muted">
          <span className="inline-flex items-center gap-1 rounded-md border-[2px] border-exisel-ink bg-exisel-bg px-2 py-0.5">
            📅 {formatDate(competition.eventDate)}
          </span>
          {competition.location && (
            <span className="inline-flex items-center gap-1 rounded-md border-[2px] border-exisel-ink bg-exisel-bg px-2 py-0.5">
              📍 {competition.location}
            </span>
          )}
        </div>

        {competition.organizer && (
          <p className="mt-2 text-xs font-semibold text-exisel-muted">
            Oleh: <strong className="text-exisel-ink">{competition.organizer}</strong>
          </p>
        )}

        <p className="mt-2.5 line-clamp-3 text-xs font-medium text-exisel-muted">
          {competition.description}
        </p>
      </div>

      <div className="mt-5 border-t-[2px] border-neutral-200 pt-3">
        <div className="flex items-center justify-between gap-2">
          {competition.registrationUrl ? (
            <a
              href={competition.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black text-exisel-blue hover:underline"
            >
              Link Pendaftaran ↗
            </a>
          ) : (
            <span className="text-xs font-semibold text-exisel-muted">
              {competition.registrationDeadline
                ? `Deadline: ${formatDate(competition.registrationDeadline)}`
                : "Tanpa tautan"}
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(competition)}
              className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-white px-3 text-xs font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(competition)}
              className="inline-flex h-8 items-center justify-center rounded-lg border-[2px] border-exisel-ink bg-red-100 px-3 text-xs font-bold text-red-700 shadow-brutal-xs transition-all hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
