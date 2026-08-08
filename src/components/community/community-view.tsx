"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmLogoutButton } from "@/components/confirm-logout-button";
import { StudentHeaderNav } from "@/components/landing-navigation";
import type { CommunityChannel, CommunityMessageItem } from "@/lib/community/dal";
import styles from "./community.module.css";

type CommunityViewProps = {
  channels: CommunityChannel[];
  activeChannel: CommunityChannel;
  messages: CommunityMessageItem[];
  isAdmin: boolean;
  currentUser: { name: string; role: string } | null;
};

const LOCAL_STORAGE_KEY = "exisel-community-last-channel";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function renderMessageWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          className={styles.messageLink}
          href={part}
          rel="noopener noreferrer"
          target="_blank"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function formatCompactTimestamp(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const dateJakarta = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const nowJakarta = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );

  const hours = String(dateJakarta.getHours()).padStart(2, "0");
  const minutes = String(dateJakarta.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  const isToday =
    dateJakarta.getDate() === nowJakarta.getDate() &&
    dateJakarta.getMonth() === nowJakarta.getMonth() &&
    dateJakarta.getFullYear() === nowJakarta.getFullYear();

  if (isToday) return timeStr;

  const yesterday = new Date(nowJakarta);
  yesterday.setDate(nowJakarta.getDate() - 1);
  const isYesterday =
    dateJakarta.getDate() === yesterday.getDate() &&
    dateJakarta.getMonth() === yesterday.getMonth() &&
    dateJakarta.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Kemarin • ${timeStr}`;

  const months = [
    "Agu",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return `${dateJakarta.getDate()} ${months[dateJakarta.getMonth()]} • ${timeStr}`;
}

function getDateSeparatorLabel(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const dateJakarta = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const nowJakarta = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );

  const isToday =
    dateJakarta.getDate() === nowJakarta.getDate() &&
    dateJakarta.getMonth() === nowJakarta.getMonth() &&
    dateJakarta.getFullYear() === nowJakarta.getFullYear();

  if (isToday) return "Hari ini";

  const yesterday = new Date(nowJakarta);
  yesterday.setDate(nowJakarta.getDate() - 1);
  const isYesterday =
    dateJakarta.getDate() === yesterday.getDate() &&
    dateJakarta.getMonth() === yesterday.getMonth() &&
    dateJakarta.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Kemarin";

  const fullMonths = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${dateJakarta.getDate()} ${fullMonths[dateJakarta.getMonth()]} ${dateJakarta.getFullYear()}`;
}

export function CommunityView({
  channels,
  activeChannel,
  messages,
  isAdmin,
  currentUser,
}: CommunityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Restore last opened channel from localStorage if no query param is present
  useEffect(() => {
    const queryChannel = searchParams.get("channel");
    if (!queryChannel && typeof window !== "undefined") {
      const savedSlug = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSlug && savedSlug !== activeChannel.slug) {
        const found = channels.find((c) => c.slug === savedSlug);
        if (found) {
          router.replace(`/community?channel=${savedSlug}`, { scroll: false });
        }
      }
    }
  }, [searchParams, activeChannel.slug, channels, router]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChannel.id, messages.length]);

  function handleSelectChannel(slug: string) {
    setIsDrawerOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, slug);
    }
    router.push(`/community?channel=${slug}`, { scroll: false });
  }

  return (
    <div className={styles.container}>
      {/* Top Application Navbar (Dashboard Style) */}
      <header className={styles.appHeader}>
        <div className={styles.headerShell}>
          <Link
            className={styles.brand}
            href="/"
            aria-label="Kembali ke beranda EXISEL"
          >
            <span className={styles.brandLogo}>
              <Image
                src="/logo-smkn69.webp"
                alt="Logo SMK Negeri 69 Jakarta"
                width={758}
                height={948}
                priority
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>EXISEL</strong>
              <small>Community ekskul</small>
            </span>
          </Link>

          <StudentHeaderNav activeItem="community" />

          <div className={styles.accountActions}>
            {currentUser ? (
              <>
                <span className={styles.userAvatar} aria-hidden="true">
                  {initials(currentUser.name)}
                </span>
                <ConfirmLogoutButton className={styles.logoutBtn} />
              </>
            ) : (
              <Link className={styles.loginBtn} href="/login">
                Masuk <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <header className={styles.hero}>
        <div className={styles.heroHeader}>
          <div>
            <span className={styles.heroTag}>Exisel Community</span>
            <h1 className={styles.heroTitle}>Pusat Informasi Ekstrakurikuler</h1>
            <p className={styles.heroSub}>
              Papan pengumuman resmi SMKN 69 Jakarta. Pilih channel untuk membaca informasi terbaru.
            </p>
          </div>
          {isAdmin ? (
            <Link className={styles.adminBtn} href="/admin/community">
              Kelola Pengumuman <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
      </header>

      {/* Mobile Toggle Bar */}
      <div className={styles.mobileToggleBar}>
        <button
          className={styles.mobileToggleBtn}
          onClick={() => setIsDrawerOpen(true)}
          type="button"
        >
          <span>☰</span> Channel #{activeChannel.name}
        </button>
        <span className={styles.msgBadge}>{messages.length} Pesan</span>
      </div>

      <div className={styles.mainLayout}>
        {/* Desktop Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Community</h2>
            <p className={styles.sidebarSub}>8 Channel Ekstrakurikuler</p>
          </div>
          <nav className={styles.channelList} aria-label="Daftar Channel Community">
            {channels.map((channel) => {
              const isActive = channel.id === activeChannel.id;
              return (
                <button
                  key={channel.id}
                  className={`${styles.channelItem} ${
                    isActive ? styles.activeChannelItem : ""
                  }`}
                  onClick={() => handleSelectChannel(channel.slug)}
                  type="button"
                >
                  <span className={styles.channelLogo}>
                    <Image
                      alt={`Logo ${channel.name}`}
                      height={32}
                      src={channel.logo}
                      width={32}
                    />
                  </span>
                  <div className={styles.channelInfo}>
                    <span>
                      <span className={styles.channelHash}>#</span>
                      {channel.name}
                    </span>
                    {channel.messageCount > 0 ? (
                      <span className={styles.msgBadge}>{channel.messageCount}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Chat Area */}
        <main className={styles.chatArea}>
          <div
            className={styles.chatHeader}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
          >
            <div className={styles.chatHeaderLogo}>
              <Image
                alt={`Logo ${activeChannel.name}`}
                height={48}
                src={activeChannel.logo}
                width={48}
              />
            </div>
            <div className={styles.chatHeaderDetails}>
              <h2 className={styles.chatHeaderTitle}>
                #{activeChannel.name}{" "}
                <span className={styles.channelChevron}>˅</span>
              </h2>
              <p className={styles.chatHeaderDesc}>{activeChannel.description}</p>
            </div>
          </div>

          <div className={styles.messagesList}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true">
                  📢
                </div>
                <h3>Belum ada informasi</h3>
                <p>
                  Belum ada pesan atau pengumuman pada channel #{activeChannel.name}. Informasi
                  dari Admin atau Guru akan muncul di sini.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const prevMsg = messages[index - 1];

                const currentDateLabel = getDateSeparatorLabel(msg.rawCreatedAt);
                const prevDateLabel = prevMsg
                  ? getDateSeparatorLabel(prevMsg.rawCreatedAt)
                  : null;
                const showDateSeparator = currentDateLabel !== prevDateLabel;

                // Message Grouping check: same sender, same date, < 5 minutes apart
                const timeDiff = prevMsg
                  ? new Date(msg.rawCreatedAt).getTime() -
                    new Date(prevMsg.rawCreatedAt).getTime()
                  : Infinity;
                const isGrouped =
                  !showDateSeparator &&
                  prevMsg &&
                  prevMsg.sender.id === msg.sender.id &&
                  timeDiff < 300000;

                return (
                  <div key={msg.id}>
                    {showDateSeparator ? (
                      <div className={styles.dateSeparator}>
                        <span>{currentDateLabel}</span>
                      </div>
                    ) : null}

                    {isGrouped ? (
                      <div className={styles.groupedMessageCard}>
                        <p className={styles.groupedMessageContent}>
                          {renderMessageWithLinks(msg.content)}
                          {msg.isEdited ? (
                            <span className={styles.editedTag}> (diedit)</span>
                          ) : null}
                        </p>
                      </div>
                    ) : (
                      <article className={styles.messageCard}>
                        <div className={styles.avatar}>
                          <Image
                            alt={`Avatar ${msg.sender.name}`}
                            height={42}
                            src={msg.sender.avatar}
                            width={42}
                          />
                        </div>
                        <div className={styles.messageBody}>
                          <div className={styles.messageMeta}>
                            <span className={styles.senderName}>
                              {msg.sender.name}
                            </span>
                            <span className={styles.roleBadge}>
                              {msg.sender.role === "ADMIN" ? "ADMIN" : "GURU"}
                            </span>
                            <span className={styles.timestamp}>
                              {formatCompactTimestamp(msg.rawCreatedAt)}
                            </span>
                            {msg.isEdited ? (
                              <span className={styles.editedTag}>(diedit)</span>
                            ) : null}
                          </div>
                          <p className={styles.messageContent}>
                            {renderMessageWithLinks(msg.content)}
                          </p>
                        </div>
                      </article>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className={styles.readOnlyFooter}>
            <span aria-hidden="true">🔒</span>
            <span>
              Channel ini bersifat Read-Only. Pesan hanya dapat dikirim oleh Admin dan Guru.
            </span>
          </footer>
        </main>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen ? (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsDrawerOpen(false)}
          role="presentation"
        >
          <div
            className={styles.drawerContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <strong>Exisel Community</strong>
              <button
                className={styles.closeDrawerBtn}
                onClick={() => setIsDrawerOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <nav className={styles.channelList} aria-label="Mobile Channel Drawer">
              {channels.map((channel) => {
                const isActive = channel.id === activeChannel.id;
                return (
                  <button
                    key={channel.id}
                    className={`${styles.channelItem} ${
                      isActive ? styles.activeChannelItem : ""
                    }`}
                    onClick={() => handleSelectChannel(channel.slug)}
                    type="button"
                  >
                    <span className={styles.channelLogo}>
                      <Image
                        alt={`Logo ${channel.name}`}
                        height={32}
                        src={channel.logo}
                        width={32}
                      />
                    </span>
                    <div className={styles.channelInfo}>
                      <span>
                        <span className={styles.channelHash}>#</span>
                        {channel.name}
                      </span>
                      {channel.messageCount > 0 ? (
                        <span className={styles.msgBadge}>{channel.messageCount}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
