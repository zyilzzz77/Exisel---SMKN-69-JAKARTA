"use client";

import { useState, useTransition } from "react";
import {
  createGalleryItemAction,
  updateGalleryItemAction,
} from "@/actions/extracurricular-content";
import { ContentImage } from "@/components/content-image";

export type GalleryData = {
  id?: string;
  imageUrl?: string;
  altText?: string;
  caption?: string | null;
  takenAt?: Date | string | null;
  position?: number;
  isPublished?: boolean;
};

type GalleryFormProps = {
  mode: "create" | "edit";
  initialData?: GalleryData | null;
  extracurricularId: string;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function GalleryForm({
  mode,
  initialData,
  extracurricularId,
  onCancel,
  onDirtyChange,
}: GalleryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [altText, setAltText] = useState(initialData?.altText ?? "");
  const [caption, setCaption] = useState(initialData?.caption ?? "");
  const [takenAt, setTakenAt] = useState(
    formatDateInput(initialData?.takenAt)
  );
  const [position, setPosition] = useState(initialData?.position?.toString() ?? "0");
  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished ?? true
  );

  const isValidPreview =
    (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) ||
    imageUrl.startsWith("https://");

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
    formData.append("imageUrl", imageUrl.trim());
    formData.append("altText", altText);
    formData.append("caption", caption);
    formData.append("takenAt", takenAt);
    formData.append("position", position);
    if (isPublished) {
      formData.append("isPublished", "on");
    }

    startTransition(async () => {
      try {
        if (mode === "edit") {
          await updateGalleryItemAction(formData);
        } else {
          await createGalleryItemAction(formData);
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
            : "Terjadi kesalahan saat menyimpan foto galeri. Cek kembali form."
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

        {/* Section: Gambar & Media */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-3">
            01. Foto & Pratinjau
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Path Gambar / URL HTTPS <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="/galeri/futsal-1.webp atau https://..."
                value={imageUrl}
                onChange={(e) => handleFieldChange(setImageUrl, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
              <span className="mt-1 block text-[11px] font-semibold text-exisel-muted">
                Gunakan file lokal di public folder (misal: /galeri/...) atau tautan HTTPS aman.
              </span>
            </div>

            {/* Live Image Preview */}
            {isValidPreview ? (
              <div className="overflow-hidden rounded-xl border-[3px] border-exisel-ink bg-neutral-100 shadow-brutal-xs">
                <div className="relative aspect-video w-full">
                  <ContentImage
                    src={imageUrl.trim()}
                    alt={altText || "Pratinjau Galeri"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="border-t-[2px] border-exisel-ink bg-white px-3 py-2 text-xs font-bold text-exisel-muted">
                  Pratinjau Live
                </div>
              </div>
            ) : imageUrl.length > 0 ? (
              <div className="rounded-lg border-[2px] border-dashed border-red-300 bg-red-50 p-3 text-xs font-medium text-red-600">
                Format URL tidak valid. Gunakan awalan &lsquo;/&rsquo; atau &lsquo;https://&rsquo;
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Teks Alternatif (Alt Text) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={240}
                placeholder="Deskripsikan isi gambar untuk pembaca layar (Aksesibilitas)"
                value={altText}
                onChange={(e) => handleFieldChange(setAltText, e.target.value)}
                className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>
          </div>
        </div>

        {/* Section: Metadata Foto */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-3">
            02. Rincian & Keterangan
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                Caption Foto
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Tuliskan keterangan suasana foto, momen seru, atau acara..."
                value={caption}
                onChange={(e) => handleFieldChange(setCaption, e.target.value)}
                className="w-full rounded-lg border-[3px] border-exisel-ink bg-white p-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Tanggal Pengambilan
                </label>
                <input
                  type="date"
                  value={takenAt}
                  onChange={(e) => handleFieldChange(setTakenAt, e.target.value)}
                  className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-exisel-ink">
                  Urutan Tampil (0-999)
                </label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={position}
                  onChange={(e) => handleFieldChange(setPosition, e.target.value)}
                  className="h-12 w-full rounded-lg border-[3px] border-exisel-ink bg-white px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-exisel-blue/20"
                />
              </div>
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
                  ? "Foto tayang di grid galeri kegiatan ekstrakurikuler."
                  : "Disimpan sebagai draf."}
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
              <div className="w-12 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-exisel-ink after:border-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border-[2.5px] border-exisel-ink" />
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-exisel-ink bg-emerald-600 px-6 text-sm font-bold text-white shadow-brutal-xs transition-all hover:bg-emerald-700 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
        >
          {isPending
            ? "Menyimpan..."
            : mode === "edit"
            ? "Simpan Perubahan"
            : "Tambahkan Foto"}
        </button>
      </div>
    </form>
  );
}
