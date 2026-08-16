"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  sendCommunityMessageAction,
  updateCommunityMessageAction,
  deleteCommunityMessageAction,
  type ActionState,
  type CommunityAttachmentInput,
} from "@/actions/community";
import { AdminHeader } from "@/components/admin-header";
import type { CommunityChannel, CommunityMessageItem } from "@/lib/community/dal";
import styles from "@/app/(admin)/admin/community/admin-community.module.css";
import publicStyles from "@/components/community/community.module.css";

type AdminCommunityManagerProps = {
  channels: CommunityChannel[];
  initialMessages: CommunityMessageItem[];
  adminName: string;
};

export function AdminCommunityManager({
  channels,
  initialMessages,
  adminName,
}: AdminCommunityManagerProps) {
  const [selectedChannelId, setSelectedChannelId] = useState(
    channels[0]?.id || "",
  );
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionState | null>(null);

  // Edit State
  const [editingMsg, setEditingMsg] = useState<CommunityMessageItem | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete Modal State
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const selectedChannel =
    channels.find((c) => c.id === selectedChannelId) || channels[0];

  function clearFile() {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setFile(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFile(next);
    setFilePreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!content.trim() && !file) || isPending || isUploading) return;

    setStatus(null);
    startTransition(async () => {
      let attachment: CommunityAttachmentInput | null = null;

      if (file) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
          const uploadResponse = await fetch("/api/community/upload", {
            method: "POST",
            body: formData,
          });
          const uploadResult = (await uploadResponse.json().catch(() => ({}))) as
            | Partial<CommunityAttachmentInput>
            | { message?: string };
          if (!uploadResponse.ok) {
            setStatus({
              error:
                (uploadResult as { message?: string }).message ||
                "File gagal diunggah.",
            });
            return;
          }
          attachment = uploadResult as CommunityAttachmentInput;
        } catch {
          setStatus({ error: "File gagal diunggah. Coba lagi." });
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const res = await sendCommunityMessageAction(
        selectedChannelId,
        content,
        attachment,
      );
      setStatus(res);
      if (res.success) {
        setContent("");
        clearFile();
      }
    });
  }

  function handleSaveEdit() {
    if (!editingMsg || !editContent.trim() || isPending) return;
    setStatus(null);
    startTransition(async () => {
      const res = await updateCommunityMessageAction(
        editingMsg.id,
        editContent,
      );
      setStatus(res);
      if (res.success) {
        setEditingMsg(null);
        setEditContent("");
      }
    });
  }

  function handleConfirmDelete() {
    if (!deletingMsgId || isPending) return;
    setStatus(null);
    startTransition(async () => {
      const res = await deleteCommunityMessageAction(deletingMsgId);
      setStatus(res);
      setDeletingMsgId(null);
    });
  }

  return (
    <main className={styles.adminPage}>
      <a className="skip-link" href="#community-manager">
        Lewati ke pengelola Community
      </a>

      <AdminHeader
        activeItem="community"
        adminName={adminName}
        announcement="Ruang pengumuman admin & pembina ekstrakurikuler"
        brandSubtitle="Kelola Community"
      />

      <div className={styles.page} id="community-manager">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Community resmi / 8 channel ekskul</p>
            <h1 className={styles.headerTitle}>Pengelola Exisel Community</h1>
            <p className={styles.headerSub}>
              Kirim pengumuman resmi ke 8 channel ekstrakurikuler SMKN 69 Jakarta.
            </p>
          </div>
          <Link className={styles.publicLink} href="/community" target="_blank">
            Buka Tampilan Komunitas <span aria-hidden="true">↗</span>
          </Link>
        </header>

        {status?.message ? (
          <div className={styles.alertSuccess}>✓ {status.message}</div>
        ) : null}
        {status?.error ? (
          <div className={styles.alertError}>⚠️ {status.error}</div>
        ) : null}

        <div className={styles.grid}>
          {/* Left Column: Message Composer */}
          <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>✍️</span> Tulis Pengumuman Baru
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="channel-select">
                Target Channel
              </label>
              <select
                className={styles.select}
                id="channel-select"
                onChange={(e) => setSelectedChannelId(e.target.value)}
                value={selectedChannelId}
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name} — {ch.description}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="message-content">
                Isi Pesan Pengumuman
              </label>
              <textarea
                className={styles.textarea}
                id="message-content"
                maxLength={2000}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Tulis pesan atau pengumuman resmi untuk channel #${selectedChannel?.name || "ekskul"}...`}
                value={content}
              />
              <div className={styles.composerMeta}>
                <span
                  className={
                    content.length > 2000
                      ? styles.charCountLimit
                      : styles.charCount
                  }
                >
                  {content.length} / 2000 karakter
                </span>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="message-file">
                Lampiran (gambar, PDF, atau video)
              </label>
              <input
                accept="image/*,application/pdf,video/*"
                className={styles.fileInput}
                id="message-file"
                onChange={handleFileChange}
                type="file"
              />
              <p className={styles.fileHint}>
                Maksimal 15 MB · format: PNG, JPG, GIF, WEBP, PDF, MP4, WEBM, MOV.
              </p>
              {file ? (
                <div className="mt-2 flex items-center gap-3 rounded-lg border-[3px] border-[var(--ink)] bg-[var(--blue-light)] p-3">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md border-2 border-[var(--ink)] bg-white text-base"
                  >
                    {file.type === "application/pdf" ? "📄" : file.type.startsWith("video/") ? "🎬" : "🖼️"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{file.name}</strong>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {formatFileSize(file.size)}
                    </span>
                  </span>
                  <button
                    className="rounded-md border-2 border-[var(--ink)] bg-white px-2.5 py-1 text-xs font-extrabold"
                    onClick={clearFile}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              ) : null}
            </div>

            {/* Live Preview Panel */}
            {content.trim() || file ? (
              <div className={styles.previewBox}>
                <div className={styles.previewHeader}>Live Preview Siswa</div>
                <article className={publicStyles.messageCard}>
                  <div className={publicStyles.avatar}>
                    <Image
                      alt={`Avatar ${adminName}`}
                      height={42}
                      src="/logo-smkn69.webp"
                      width={42}
                    />
                  </div>
                  <div className={publicStyles.messageBody}>
                    <div className={publicStyles.messageMeta}>
                      <span className={publicStyles.senderName}>
                        {adminName}
                      </span>
                      <span className={publicStyles.roleBadge}>ADMIN</span>
                      <span className={publicStyles.timestamp}>Sekarang</span>
                    </div>
                    {content.trim() ? (
                      <p className={publicStyles.messageContent}>{content}</p>
                    ) : null}
                    {file ? (
                      file.type.startsWith("image/") ? (
                        <div className="mt-1 overflow-hidden rounded-lg border-[3px] border-[var(--ink)] bg-white shadow-[4px_4px_0_var(--ink)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={file.name}
                            className="max-h-60 w-full object-contain"
                            src={filePreviewUrl ?? undefined}
                          />
                        </div>
                      ) : file.type.startsWith("video/") ? (
                        <div className="mt-1 overflow-hidden rounded-lg border-[3px] border-[var(--ink)] bg-black shadow-[4px_4px_0_var(--ink)]">
                          <video
                            className="block max-h-60 w-full"
                            controls
                            preload="metadata"
                            src={filePreviewUrl ?? undefined}
                          />
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-3 rounded-lg border-[3px] border-[var(--ink)] bg-white p-3">
                          <span
                            aria-hidden="true"
                            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md border-2 border-[var(--ink)] bg-[var(--blue-light)] text-base"
                          >
                            {file.type === "application/pdf" ? "📄" : "📎"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm">
                              {file.name}
                            </strong>
                            <span className="text-xs font-semibold text-[var(--muted)]">
                              {formatFileSize(file.size)}
                            </span>
                          </span>
                        </div>
                      )
                    ) : null}
                  </div>
                </article>
              </div>
            ) : null}

            <button
              className={styles.submitBtn}
              disabled={(!content.trim() && !file) || content.length > 2000 || isPending || isUploading}
              type="submit"
            >
              {isUploading
                ? "Mengunggah file..."
                : isPending
                  ? "Mengirim..."
                  : "Kirim Pengumuman →"}
            </button>
          </form>
          </section>

          {/* Right Column: Recent Messages List */}
          <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📋</span> Riwayat Pengumuman
          </h2>
          <p className={styles.headerSub}>
            Pesan resmi yang sudah dipublikasikan di channel Community.
          </p>

          <div className={styles.msgList}>
            {(() => {
              const filtered = initialMessages.filter((m) => m.channelId === selectedChannelId);
              if (filtered.length === 0) {
                return (
                  <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                    Belum ada pengumuman di channel #{selectedChannel?.name || "ini"}.
                  </p>
                );
              }
              return filtered.map((msg) => {
                const ch = channels.find((c) => c.id === msg.channelId);
                return (
                  <div key={msg.id} className={styles.msgItem}>
                    <div className={styles.msgItemMeta}>
                      <span className={styles.msgChannelBadge}>
                        #{ch?.name || "Channel"}
                      </span>
                      <span className={styles.charCount}>{msg.createdAt}</span>
                      <div className={styles.msgActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => {
                            setEditingMsg(msg);
                            setEditContent(msg.content);
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setDeletingMsgId(msg.id)}
                          type="button"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className={publicStyles.messageContent}>{msg.content}</p>
                    {msg.attachment ? (
                      <a
                        className="mt-2 flex items-center gap-2 rounded-lg border-2 border-[var(--ink)] bg-[var(--blue-light)] p-2.5 no-underline"
                        href={`/api/community/files/${encodeURIComponent(msg.attachment.path)}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span aria-hidden="true">
                          {msg.attachment.mime === "application/pdf"
                            ? "📄"
                            : msg.attachment.mime.startsWith("video/")
                              ? "🎬"
                              : msg.attachment.mime.startsWith("image/")
                                ? "🖼️"
                                : "📎"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-xs">
                            {msg.attachment.name}
                          </strong>
                          <span className="text-[10px] font-semibold text-[var(--muted)]">
                            {msg.attachment.size < 1024
                              ? `${msg.attachment.size} B`
                              : msg.attachment.size < 1024 * 1024
                                ? `${(msg.attachment.size / 1024).toFixed(1)} KB`
                                : `${(msg.attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                        </span>
                        <span className="text-[10px] font-extrabold text-[var(--blue)]">
                          Buka ↗
                        </span>
                      </a>
                    ) : null}
                  </div>
                );
              });
            })()}
          </div>
          </section>
        </div>

        {/* Edit Modal */}
        {editingMsg ? (
          <div className={styles.modalOverlay} role="presentation">
            <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Edit Pesan Pengumuman</h3>
            <textarea
              className={styles.textarea}
              maxLength={2000}
              onChange={(e) => setEditContent(e.target.value)}
              value={editContent}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setEditingMsg(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className={styles.submitBtn}
                disabled={!editContent.trim() || isPending}
                onClick={handleSaveEdit}
                type="button"
              >
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
            </div>
          </div>
        ) : null}

        {/* Delete Confirmation Modal */}
        {deletingMsgId ? (
          <div className={styles.modalOverlay} role="presentation">
            <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Hapus Pesan Pengumuman?</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
              Pesan yang telah dihapus tidak akan ditampilkan lagi kepada siswa di halaman Community.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeletingMsgId(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className={styles.confirmDeleteBtn}
                disabled={isPending}
                onClick={handleConfirmDelete}
                type="button"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus Pesan"}
              </button>
            </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
