"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./promo-video-player.module.css";

type PromoVideoPlayerProps = {
  description?: string;
  eyebrow?: string;
  headline?: string;
  metaItems?: Array<{ label: string; value: string }>;
  poster?: string;
  src: string;
  title: string;
};

export function PromoVideoPlayer({
  description,
  eyebrow = "Mengenal Ekskul",
  headline,
  metaItems,
  poster,
  src,
  title,
}: PromoVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Default sound ON (tidak dimute)
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Auto-play with sound ON when scrolled into view & Auto-pause when scrolled out
  useEffect(() => {
    const videoNode = videoRef.current;
    const containerNode = containerRef.current;
    if (!videoNode || !containerNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Card scrolled into view: play with sound ON
            videoNode.muted = isMuted;
            videoNode
              .play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {
                // If browser blocks unmuted autoplay before first user interaction,
                // temporarily play muted so video plays smoothly on scroll
                videoNode.muted = true;
                setIsMuted(true);
                videoNode
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              });
          } else {
            // Card scrolled out of view: pause
            videoNode.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(containerNode);

    return () => {
      observer.disconnect();
    };
  }, [isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    setIsUserInteracted(true);
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const defaultMeta = [
    { label: "Kategori", value: "Ekstrakurikuler" },
    { label: "Lokasi", value: "SMKN 69 Jakarta" },
  ];
  const items = metaItems && metaItems.length > 0 ? metaItems : defaultMeta;

  return (
    <section className={styles.cardSection} ref={containerRef}>
      <div className={styles.cardContainer}>
        <div className={styles.cardCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.headline}>{headline ?? title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}

          <div className={styles.metaStrip}>
            {items.map((item) => (
              <div className={styles.metaItem} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.videoColumn}>
          <div className={styles.videoFrame}>
            <video
              className={styles.videoElement}
              controls={isPlaying}
              loop
              muted={isMuted}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              playsInline
              poster={poster}
              preload="metadata"
              ref={videoRef}
            >
              <source src={src} type="video/mp4" />
              Browser Anda tidak mendukung pemutaran video.
            </video>

            {/* Sound toggle button */}
            <button
              aria-label={isMuted ? "Aktifkan suara video" : "Matikan suara video"}
              className={styles.soundToggleBtn}
              onClick={toggleMute}
              type="button"
            >
              {isMuted ? "🔇 Suara OFF" : "🔊 Suara ON"}
            </button>

            {!isPlaying && !isUserInteracted ? (
              <button
                aria-label={`Putar video ${title}`}
                className={styles.playOverlay}
                onClick={togglePlay}
                type="button"
              >
                <div className={styles.playIconContainer}>
                  <span className={styles.playTriangle} aria-hidden="true" />
                </div>
                <span className={styles.playText}>Putar Video dengan Suara</span>
              </button>
            ) : null}

            <div className={styles.badgeLabel}>
              <span className={styles.liveDot} aria-hidden="true" /> PROMO
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
