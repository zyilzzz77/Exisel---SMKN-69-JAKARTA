export type ContentType = "competitions" | "achievements" | "gallery";

export type ViewMode = "grid" | "list";

export type StatusFilter = "all" | "published" | "draft";

export type SortOption = "newest" | "oldest" | "title-asc" | "title-desc";

export type CompetitionItem = {
  id: string;
  extracurricularId: string;
  createdById?: string;
  title: string;
  organizer: string | null;
  description: string;
  eventDate: Date | string;
  registrationDeadline: Date | string | null;
  location: string | null;
  level: string | null;
  registrationUrl: string | null;
  isPublished: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type AchievementItem = {
  id: string;
  extracurricularId: string;
  createdById?: string;
  title: string;
  competitionName: string | null;
  rank: string;
  level: string | null;
  achievedAt: Date | string;
  description: string | null;
  isPublished: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type GalleryItem = {
  id: string;
  extracurricularId: string;
  createdById?: string;
  imageUrl: string;
  altText: string;
  caption: string | null;
  takenAt: Date | string | null;
  position: number;
  isPublished: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ExtracurricularProgram = {
  id: string;
  name: string;
  description?: string | null;
  capacity?: number;
  isActive?: boolean;
  competitions: CompetitionItem[];
  achievements: AchievementItem[];
  galleryItems: GalleryItem[];
};
