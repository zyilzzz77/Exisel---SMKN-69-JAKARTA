"use client";

import Link from "next/link";

type CompetitionFilterProps = {
  className?: string;
  programs: Array<{ name: string; slug: string }>;
  selectedSlug: string;
};

export function CompetitionFilter({
  className,
  programs,
  selectedSlug,
}: CompetitionFilterProps) {
  const selectedName =
    selectedSlug === "semua"
      ? "Semua ekstrakurikuler"
      : programs.find((program) => program.slug === selectedSlug)?.name ??
        "Semua ekstrakurikuler";

  return (
    <div className={className}>
      <span className="competition-filter-label">Pilih ekstrakurikuler</span>
      <details>
        <summary>
          <span>{selectedName}</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div aria-label="Daftar ekstrakurikuler">
          <Link
            aria-current={selectedSlug === "semua" ? "page" : undefined}
            href="/lomba"
          >
            Semua ekstrakurikuler
          </Link>
          {programs.map((program) => (
            <Link
              aria-current={selectedSlug === program.slug ? "page" : undefined}
              href={`/lomba?ekskul=${encodeURIComponent(program.slug)}`}
              key={program.slug}
            >
              {program.name}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
