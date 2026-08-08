"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  sendCommunityMessageAction,
  updateCommunityMessageAction,
  deleteCommunityMessageAction,
  type ActionState,
} from "@/actions/community";
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
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionState | null>(null);

  // Edit State
  const [editingMsg, setEditingMsg] = useState<CommunityMessageItem | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete Modal State
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const selectedChannel =
    channels.find((c) => c.id === selectedChannelId) || channels[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isPending) return;

    setStatus(null);
    startTransition(async () => {
      const res = await sendCommunityMessageAction(selectedChannelId, content);
      setStatus(res);
      if (res.success) {
        setContent("");
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
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

            {/* Live Preview Panel */}
            {content.trim() ? (
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
                    <p className={publicStyles.messageContent}>{content}</p>
                  </div>
                </article>
              </div>
            ) : null}

            <button
              className={styles.submitBtn}
              disabled={!content.trim() || content.length > 2000 || isPending}
              type="submit"
            >
              {isPending ? "Mengirim..." : "Kirim Pengumuman →"}
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
            {initialMessages.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                Belum ada pengumuman yang pernah dikirim.
              </p>
            ) : (
              initialMessages.map((msg) => {
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
                  </div>
                );
              })
            )}
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
  );
}
