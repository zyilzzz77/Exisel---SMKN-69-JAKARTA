"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = [
  ".hero-copy",
  ".hero-visual",
  ".ticker",
  ".section-heading",
  ".program-card",
  ".section-kicker",
  ".step-card",
  ".feature-intro",
  ".feature-list article",
  ".final-cta",
].join(", ");

const baseClasses = [
  "transition-[opacity,transform]",
  "duration-700",
  "ease-out",
  "will-change-[opacity,transform]",
];

const hiddenClasses = ["opacity-0", "scale-[0.985]"];
const visibleClasses = ["opacity-100", "translate-y-0", "scale-100"];
const delayClasses = ["delay-0", "delay-75", "delay-100", "delay-150"];

function hideElement(element: HTMLElement) {
  const isAboveViewport = element.getBoundingClientRect().bottom <= 0;

  element.classList.remove(...visibleClasses, "translate-y-8", "-translate-y-8");
  element.classList.add(
    ...hiddenClasses,
    isAboveViewport ? "-translate-y-8" : "translate-y-8",
  );
}

function showElement(element: HTMLElement) {
  element.classList.remove(
    ...hiddenClasses,
    "translate-y-8",
    "-translate-y-8",
  );
  element.classList.add(...visibleClasses);
}

export function ScrollRevealController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-page");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!root || reduceMotion.matches) {
      return;
    }

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    if (elements.length === 0) {
      return;
    }

    elements.forEach((element, index) => {
      element.classList.add(...baseClasses, delayClasses[index % delayClasses.length]);

      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        showElement(element);
      } else {
        hideElement(element);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            showElement(element);
          } else {
            hideElement(element);
          }
        });
      },
      {
        rootMargin: "-6% 0px -8% 0px",
        threshold: 0.08,
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();

      elements.forEach((element, index) => {
        element.classList.remove(
          ...baseClasses,
          ...hiddenClasses,
          ...visibleClasses,
          "translate-y-8",
          "-translate-y-8",
          delayClasses[index % delayClasses.length],
        );
      });
    };
  }, []);

  return null;
}
