"use client";

import { useEffect, useRef, useState } from "react";

type TypewriterHeadingProps = {
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  highlightText?: string;
  id?: string;
  lineBreak?: boolean;
  mainText: string;
  repeatOnScroll?: boolean;
};

export function TypewriterHeading({
  as: Component = "h1",
  className,
  highlightText = "",
  id,
  lineBreak = true,
  mainText,
  repeatOnScroll = true,
}: TypewriterHeadingProps) {
  const containerRef = useRef<HTMLHeadingElement | HTMLParagraphElement | null>(null);

  const line1 = mainText.trim();
  const line2 = highlightText.trim();
  const fullText = line2 ? `${line1} ${line2}` : line1;

  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  // Jika intro sudah ditandai selesai (termasuk deep-link /attendance/* yang
  // melewati overlay), heading tidak perlu menunggu event intro — text muncul
  // langsung tanpa efek ketik yang menunda tampilan halaman.
  const [isIntroComplete, setIsIntroComplete] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.exiselIntroComplete === "true",
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let animationFrame = 0;
    let fallbackTimer = 0;
    const markIntroComplete = () => setIsIntroComplete(true);

    window.addEventListener("exisel:intro-complete", markIntroComplete);

    if (document.documentElement.dataset.exiselIntroComplete === "true") {
      animationFrame = window.requestAnimationFrame(markIntroComplete);
    }

    fallbackTimer = window.setTimeout(markIntroComplete, 3200);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("exisel:intro-complete", markIntroComplete);
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else if (repeatOnScroll) {
          setIsVisible(false);
          setDisplayedText("");
          setIsDone(false);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [repeatOnScroll]);

  useEffect(() => {
    if (!isVisible || !isIntroComplete) return;

    let index = 0;

    const timer = setInterval(() => {
      index++;
      setDisplayedText(fullText.slice(0, index));

      if (index >= fullText.length) {
        clearInterval(timer);
        setIsDone(true);
      }
    }, 60);

    return () => clearInterval(timer);
  }, [isIntroComplete, isVisible, fullText]);

  const line1Length = line1.length;
  const currentLine1 = displayedText.slice(
    0,
    Math.min(displayedText.length, line1Length),
  );
  const currentLine2 =
    line2 && displayedText.length > line1Length
      ? displayedText.slice(line1Length).trimStart()
      : "";

  return (
    <Component className={className} id={id} ref={containerRef as never}>
      {currentLine1}
      {currentLine2 ? (
        <>
          {lineBreak ? <br /> : " "}
          <span>{currentLine2}</span>
        </>
      ) : null}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "4px",
          height: "0.8em",
          backgroundColor: "var(--orange)",
          marginLeft: "4px",
          borderRadius: "2px",
          verticalAlign: "middle",
          opacity: isVisible && !isDone ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
    </Component>
  );
}
