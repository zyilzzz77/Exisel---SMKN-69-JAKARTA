"use client";

import { useTransition, useState } from "react";
import {
  deleteCompetitionAction,
  deleteAchievementAction,
  deleteGalleryItemAction,
} from "@/actions/extracurricular-content";

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  contentType: "competitions" | "achievements" | "gallery";
  itemId: string;
  itemTitle: string;
  extracurricularId: string;
};

const TYPE_LABELS: Record<string, string> = {
  competitions: "Lomba",
  achievements: "Prestasi",
  gallery: "Galeri Foto",
};

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  contentType,
  itemId,
  itemTitle,
  extracurricularId,
}: DeleteConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const typeLabel = TYPE_LABELS[contentType] || "Konten";

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", itemId);
        formData.append("extracurricularId", extracurricularId);

        if (contentType === "competitions") {
          await deleteCompetitionAction(formData);
        } else if (contentType === "achievements") {
          await deleteAchievementAction(formData);
        } else if (contentType === "gallery") {
          await deleteGalleryItemAction(formData);
        }
        onClose();
      } catch (err: unknown) {
        // In Next.js redirect() throws a NEXT_REDIRECT error which is normal behavior for server action navigation
        if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string" && ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT") ?? false)) {
          throw err;
        }
        setErrorMsg("Gagal menghapus konten. Silakan coba lagi.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border-[4px] border-exisel-ink bg-white p-6 shadow-brutal-xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-exisel-ink bg-red-100 text-red-600 shadow-brutal-xs">
            <svg
              className="h-6 w-6 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="delete-dialog-title"
              className="text-lg font-black tracking-tight text-exisel-ink"
            >
              Hapus {typeLabel}?
            </h3>
            <p className="text-xs font-semibold text-exisel-muted">
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border-[2px] border-exisel-ink bg-exisel-bg p-3">
          <p className="text-xs font-bold text-exisel-muted uppercase tracking-wider mb-1">
            Item yang akan dihapus:
          </p>
          <p className="text-sm font-black text-exisel-ink line-clamp-2">
            &ldquo;{itemTitle}&rdquo;
          </p>
        </div>

        {errorMsg && (
          <p className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border-[2px] border-red-300">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-bold text-exisel-ink shadow-brutal-xs transition-all hover:bg-neutral-100 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="inline-flex h-11 items-center justify-center rounded-lg border-[3px] border-exisel-ink bg-red-600 px-5 text-sm font-bold text-white shadow-brutal-xs transition-all hover:bg-red-700 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
