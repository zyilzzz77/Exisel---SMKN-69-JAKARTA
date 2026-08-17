"use client";

import type { ContentType, StatusFilter, SortOption, ViewMode } from "./types";

type ContentToolbarProps = {
  activeType: ContentType;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalFiltered: number;
};

export function ContentToolbar({
  activeType,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalFiltered,
}: ContentToolbarProps) {
  const getSearchPlaceholder = () => {
    switch (activeType) {
      case "competitions":
        return "Cari agenda lomba...";
      case "achievements":
        return "Cari data prestasi...";
      case "gallery":
        return "Cari caption galeri...";
      default:
        return "Cari konten...";
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border-[3px] border-exisel-ink bg-white p-3 shadow-brutal-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-exisel-muted">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="h-11 w-full rounded-lg border-[2px] border-exisel-ink bg-exisel-bg pl-9 pr-8 text-sm font-bold text-exisel-ink outline-none transition-all placeholder:text-exisel-muted/70 focus:border-exisel-blue focus:bg-white focus:ring-2 focus:ring-exisel-blue/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-exisel-muted hover:text-exisel-ink cursor-pointer"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter, Sort, View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
              aria-label="Filter status publikasi"
              className="h-11 w-full rounded-lg border-[2px] border-exisel-ink bg-white px-3 pr-8 text-xs font-black text-exisel-ink outline-none transition-all focus:border-exisel-blue focus:ring-2 focus:ring-exisel-blue/20 cursor-pointer sm:w-auto"
            >
              <option value="all">Semua Status</option>
              <option value="published">Tayang / Publik</option>
              <option value="draft">Draf</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Urutkan konten"
              className="h-11 w-full rounded-lg border-[2px] border-exisel-ink bg-white px-3 pr-8 text-xs font-black text-exisel-ink outline-none transition-all focus:border-exisel-blue focus:ring-2 focus:ring-exisel-blue/20 cursor-pointer sm:w-auto"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="title-asc">Judul (A - Z)</option>
              <option value="title-desc">Judul (Z - A)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden items-center rounded-lg border-[2px] border-exisel-ink bg-neutral-100 p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Tampilan Grid"
              aria-label="Tampilan Grid"
              aria-pressed={viewMode === "grid"}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-exisel-ink shadow-brutal-xs font-black"
                  : "text-exisel-muted hover:text-exisel-ink"
              }`}
            >
              <svg
                className="h-4 w-4 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              title="Tampilan List"
              aria-label="Tampilan List"
              aria-pressed={viewMode === "list"}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-exisel-ink shadow-brutal-xs font-black"
                  : "text-exisel-muted hover:text-exisel-ink"
              }`}
            >
              <svg
                className="h-4 w-4 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-exisel-muted">
        <span>
          Menampilkan <strong className="text-exisel-ink">{totalFiltered}</strong> hasil
        </span>
        {(searchQuery || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onStatusChange("all");
            }}
            className="text-exisel-blue hover:underline cursor-pointer font-black"
          >
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
}
