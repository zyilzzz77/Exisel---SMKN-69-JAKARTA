"use client";

import { useEffect, useState } from "react";
import { StudentNavigation } from "./student-navigation";

export function LandingNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "about" | "background" | "explore" | undefined
  >();

  useEffect(() => {
    const sections = [
      { id: "explore" as const, elementId: "pilihan" },
      { id: "background" as const, elementId: "background" },
      { id: "about" as const, elementId: "about" },
    ];
    let animationFrame = 0;

    const updateActiveSection = () => {
      const headerHeight =
        document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
      const activationPoint = window.scrollY + headerHeight + 48;
      let currentSection: typeof activeSection;

      for (const section of sections) {
        const element = document.getElementById(section.elementId);

        if (element && element.offsetTop <= activationPoint) {
          currentSection = section.id;
        }
      }

      setActiveSection(currentSection);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="landing-navigation-menu"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup menu utama" : "Buka menu utama"}
        className={`mobile-menu-toggle ${isOpen ? "mobile-menu-toggle-open" : ""}`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <StudentNavigation
        activeItem={activeSection}
        ariaLabel="Navigasi utama"
        className={`desktop-nav ${isOpen ? "mobile-menu-open" : ""}`}
        id="landing-navigation-menu"
        onNavigate={() => setIsOpen(false)}
        variant="landing"
      />
    </>
  );
}

type StudentHeaderItem =
  | "dashboard"
  | "competitions"
  | "community"
  | "attendance"
  | "schedule";

export function StudentHeaderNav({
  activeItem,
  followDashboardScroll = false,
}: {
  activeItem?: StudentHeaderItem;
  followDashboardScroll?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [trackedActiveItem, setTrackedActiveItem] =
    useState<StudentHeaderItem | undefined>(activeItem);

  useEffect(() => {
    if (!followDashboardScroll) {
      return;
    }

    const sections = [
      { id: "dashboard" as const, elementId: "dashboard-content" },
      { id: "schedule" as const, elementId: "jadwal" },
    ];
    let animationFrame = 0;

    const updateActiveSection = () => {
      const header = document.querySelector<HTMLElement>("header");
      const activationPoint = window.scrollY + (header?.offsetHeight ?? 0) + 64;
      let currentItem: StudentHeaderItem = "dashboard";

      for (const section of sections) {
        const element = document.getElementById(section.elementId);
        const elementTop = element
          ? element.getBoundingClientRect().top + window.scrollY
          : Number.POSITIVE_INFINITY;

        if (elementTop <= activationPoint) {
          currentItem = section.id;
        }
      }

      setTrackedActiveItem(currentItem);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [followDashboardScroll]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="student-header-nav-menu"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
        className={`mobile-menu-toggle ${isOpen ? "mobile-menu-toggle-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <StudentNavigation
        activeItem={followDashboardScroll ? trackedActiveItem : activeItem}
        ariaLabel="Navigasi utama"
        className={`desktop-nav ${isOpen ? "mobile-menu-open" : ""}`}
        id="student-header-nav-menu"
        onNavigate={() => setIsOpen(false)}
        variant="student"
      />
    </>
  );
}
