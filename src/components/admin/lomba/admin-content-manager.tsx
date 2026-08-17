"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type AchievementItem,
  type CompetitionItem,
  type ContentType,
  type ExtracurricularProgram,
  type GalleryItem,
  type SortOption,
  type StatusFilter,
  type ViewMode,
} from "./types";
import { AdminContentHeader } from "./admin-content-header";
import { EskulSelector } from "./eskul-selector";
import { ContentTypeTabs } from "./content-type-tabs";
import { ContentToolbar } from "./content-toolbar";
import { LombaCard } from "./lomba-card";
import { PrestasiCard } from "./prestasi-card";
import { GaleriCard } from "./galeri-card";
import { ContentEmptyState } from "./content-empty-state";
import { ContentDrawer } from "./content-drawer";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

type AdminContentManagerProps = {
  programs: ExtracurricularProgram[];
  selectedProgram: ExtracurricularProgram;
  notice?: string | null;
  error?: string | null;
};

const notices: Record<string, string> = {
  "lomba-ditambahkan": "Informasi lomba berhasil ditambahkan.",
  "lomba-diperbarui": "Informasi lomba berhasil diperbarui.",
  "lomba-dihapus": "Informasi lomba berhasil dihapus.",
  "prestasi-ditambahkan": "Prestasi berhasil ditambahkan.",
  "prestasi-diperbarui": "Prestasi berhasil diperbarui.",
  "prestasi-dihapus": "Prestasi berhasil dihapus.",
  "galeri-ditambahkan": "Foto galeri berhasil ditambahkan.",
  "galeri-diperbarui": "Foto galeri berhasil diperbarui.",
  "galeri-dihapus": "Foto galeri berhasil dihapus.",
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminContentManager({
  programs,
  selectedProgram,
  notice,
  error,
}: AdminContentManagerProps) {
  const [activeType, setActiveType] = useState<ContentType>("competitions");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [drawerContentType, setDrawerContentType] = useState<ContentType>("competitions");
  const [editingData, setEditingData] = useState<
    CompetitionItem | AchievementItem | GalleryItem | null
  >(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    contentType: ContentType;
    itemId: string;
    itemTitle: string;
  }>({
    isOpen: false,
    contentType: "competitions",
    itemId: "",
    itemTitle: "",
  });

  // Handlers for drawer actions
  const handleOpenCreate = (type?: ContentType) => {
    setDrawerMode("create");
    setDrawerContentType(type ?? activeType);
    setEditingData(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditCompetition = (item: CompetitionItem) => {
    setDrawerMode("edit");
    setDrawerContentType("competitions");
    setEditingData(item);
    setIsDrawerOpen(true);
  };

  const handleOpenEditAchievement = (item: AchievementItem) => {
    setDrawerMode("edit");
    setDrawerContentType("achievements");
    setEditingData(item);
    setIsDrawerOpen(true);
  };

  const handleOpenEditGallery = (item: GalleryItem) => {
    setDrawerMode("edit");
    setDrawerContentType("gallery");
    setEditingData(item);
    setIsDrawerOpen(true);
  };

  // Handlers for delete actions
  const handleOpenDelete = (
    contentType: ContentType,
    itemId: string,
    itemTitle: string,
  ) => {
    setDeleteModal({
      isOpen: true,
      contentType,
      itemId,
      itemTitle,
    });
  };

  // Filtered & Sorted items
  const filteredCompetitions = useMemo(() => {
    let list = [...(selectedProgram.competitions || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.organizer && c.organizer.toLowerCase().includes(q)) ||
          (c.location && c.location.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    if (statusFilter === "published") {
      list = list.filter((c) => c.isPublished);
    } else if (statusFilter === "draft") {
      list = list.filter((c) => !c.isPublished);
    }

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      if (sortBy === "title-asc") {
        return a.title.localeCompare(b.title, "id");
      }
      if (sortBy === "title-desc") {
        return b.title.localeCompare(a.title, "id");
      }
      return 0;
    });

    return list;
  }, [selectedProgram.competitions, searchQuery, statusFilter, sortBy]);

  const filteredAchievements = useMemo(() => {
    let list = [...(selectedProgram.achievements || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.competitionName && a.competitionName.toLowerCase().includes(q)) ||
          a.rank.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)),
      );
    }

    if (statusFilter === "published") {
      list = list.filter((a) => a.isPublished);
    } else if (statusFilter === "draft") {
      list = list.filter((a) => !a.isPublished);
    }

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime();
      }
      if (sortBy === "title-asc") {
        return a.title.localeCompare(b.title, "id");
      }
      if (sortBy === "title-desc") {
        return b.title.localeCompare(a.title, "id");
      }
      return 0;
    });

    return list;
  }, [selectedProgram.achievements, searchQuery, statusFilter, sortBy]);

  const filteredGallery = useMemo(() => {
    let list = [...(selectedProgram.galleryItems || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          (g.caption && g.caption.toLowerCase().includes(q)) ||
          g.altText.toLowerCase().includes(q),
      );
    }

    if (statusFilter === "published") {
      list = list.filter((g) => g.isPublished);
    } else if (statusFilter === "draft") {
      list = list.filter((g) => !g.isPublished);
    }

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.takenAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.takenAt ?? a.createdAt ?? 0).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.takenAt ?? a.createdAt ?? 0).getTime() -
          new Date(b.takenAt ?? b.createdAt ?? 0).getTime()
        );
      }
      if (sortBy === "title-asc") {
        return (a.caption || a.altText).localeCompare(b.caption || b.altText, "id");
      }
      if (sortBy === "title-desc") {
        return (b.caption || b.altText).localeCompare(a.caption || a.altText, "id");
      }
      return a.position - b.position;
    });

    return list;
  }, [selectedProgram.galleryItems, searchQuery, statusFilter, sortBy]);

  const currentTotal =
    activeType === "competitions"
      ? filteredCompetitions.length
      : activeType === "achievements"
        ? filteredAchievements.length
        : filteredGallery.length;

  const hasFilter = Boolean(searchQuery.trim() || statusFilter !== "all");

  return (
    <div className="min-h-screen bg-exisel-bg text-exisel-ink">
      {/* 1. Header & Stats */}
      <AdminContentHeader
        competitionsCount={selectedProgram.competitions.length}
        achievementsCount={selectedProgram.achievements.length}
        galleryCount={selectedProgram.galleryItems.length}
        activeType={activeType}
        onTypeChange={(t) => {
          setActiveType(t);
          setSearchQuery("");
        }}
        onOpenCreate={() => handleOpenCreate(activeType)}
      />

      {/* Main Content Shell */}
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* Notice feedback banners */}
        {notice && notices[notice] ? (
          <div
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border-[3px] border-exisel-ink bg-emerald-100 p-4 text-sm font-bold text-emerald-950 shadow-brutal-sm animate-in fade-in"
            role="status"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>{notices[notice]}</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border-[3px] border-exisel-ink bg-red-100 p-4 text-sm font-bold text-red-950 shadow-brutal-sm animate-in fade-in"
            role="alert"
          >
            <span className="text-lg">⚠</span>
            <span>Konten tidak dapat diproses. Muat ulang halaman lalu coba kembali.</span>
          </div>
        ) : null}

        {/* 2. Eskul Selector */}
        <section aria-label="Pilih Ekstrakurikuler">
          <EskulSelector
            programs={programs}
            selectedProgramId={selectedProgram.id}
          />
        </section>

        {/* Selected Program Header Banner */}
        <div className="mt-8 flex flex-col justify-between gap-3 border-b-[3px] border-exisel-ink pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-exisel-blue">
              Sedang Dikelola
            </p>
            <h2 className="text-2xl font-black tracking-tight text-exisel-ink sm:text-3xl">
              {selectedProgram.name}
            </h2>
          </div>
          <Link
            href={`/eskul/${slugify(selectedProgram.name)}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-black text-exisel-blue hover:underline sm:text-sm"
          >
            <span>Lihat halaman siswa</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* 3. Content Tabs & Quick Actions */}
        <div className="mt-6">
          <ContentTypeTabs
            activeType={activeType}
            onTypeChange={(t) => {
              setActiveType(t);
              setSearchQuery("");
            }}
            counts={{
              competitions: selectedProgram.competitions.length,
              achievements: selectedProgram.achievements.length,
              gallery: selectedProgram.galleryItems.length,
            }}
          />
        </div>

        {/* 4. Filter Toolbar */}
        <div className="mt-4">
          <ContentToolbar
            activeType={activeType}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalFiltered={currentTotal}
          />
        </div>

        {/* 5. Content Grid / List / Empty State */}
        <section className="mt-6" aria-label="Daftar Konten">
          {activeType === "competitions" && (
            <>
              {filteredCompetitions.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredCompetitions.map((competition) => (
                    <LombaCard
                      key={competition.id}
                      competition={competition}
                      viewMode={viewMode}
                      onEdit={handleOpenEditCompetition}
                      onDelete={(item) =>
                        handleOpenDelete("competitions", item.id, item.title)
                      }
                    />
                  ))}
                </div>
              ) : (
                <ContentEmptyState
                  activeType="competitions"
                  programName={selectedProgram.name}
                  hasFilter={hasFilter}
                  onOpenCreate={() => handleOpenCreate("competitions")}
                  onResetFilter={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              )}
            </>
          )}

          {activeType === "achievements" && (
            <>
              {filteredAchievements.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredAchievements.map((achievement) => (
                    <PrestasiCard
                      key={achievement.id}
                      achievement={achievement}
                      viewMode={viewMode}
                      onEdit={handleOpenEditAchievement}
                      onDelete={(item) =>
                        handleOpenDelete("achievements", item.id, item.title)
                      }
                    />
                  ))}
                </div>
              ) : (
                <ContentEmptyState
                  activeType="achievements"
                  programName={selectedProgram.name}
                  hasFilter={hasFilter}
                  onOpenCreate={() => handleOpenCreate("achievements")}
                  onResetFilter={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              )}
            </>
          )}

          {activeType === "gallery" && (
            <>
              {filteredGallery.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredGallery.map((item) => (
                    <GaleriCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      onEdit={handleOpenEditGallery}
                      onDelete={(g) =>
                        handleOpenDelete("gallery", g.id, g.caption || g.altText)
                      }
                    />
                  ))}
                </div>
              ) : (
                <ContentEmptyState
                  activeType="gallery"
                  programName={selectedProgram.name}
                  hasFilter={hasFilter}
                  onOpenCreate={() => handleOpenCreate("gallery")}
                  onResetFilter={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              )}
            </>
          )}
        </section>
      </main>

      {/* 6. Create / Edit Drawer */}
      <ContentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode={drawerMode}
        contentType={drawerContentType}
        initialData={editingData}
        extracurricularId={selectedProgram.id}
        extracurricularName={selectedProgram.name}
      />

      {/* 7. Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        contentType={deleteModal.contentType}
        itemId={deleteModal.itemId}
        itemTitle={deleteModal.itemTitle}
        extracurricularId={selectedProgram.id}
      />
    </div>
  );
}
