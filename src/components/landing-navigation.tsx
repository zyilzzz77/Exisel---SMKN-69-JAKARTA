"use client";

import { useEffect, useState } from "react";
import { StudentNavigation } from "./student-navigation";

export function LandingNavigation() {
  const [isOpen, setIsOpen] = useState(false);

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
        ariaLabel="Navigasi utama"
        className={`desktop-nav ${isOpen ? "mobile-menu-open" : ""}`}
        id="landing-navigation-menu"
        onNavigate={() => setIsOpen(false)}
        variant="landing"
      />
    </>
  );
}

export function StudentHeaderNav({
  activeItem = "community",
}: {
  activeItem?:
    | "dashboard"
    | "programs"
    | "community"
    | "attendance"
    | "schedule"
    | "account";
}) {
  const [isOpen, setIsOpen] = useState(false);

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
        activeItem={activeItem}
        ariaLabel="Navigasi utama"
        className={`desktop-nav ${isOpen ? "mobile-menu-open" : ""}`}
        id="student-header-nav-menu"
        onNavigate={() => setIsOpen(false)}
        variant="student"
      />
    </>
  );
}
