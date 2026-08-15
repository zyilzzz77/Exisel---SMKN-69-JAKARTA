"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";

const uuidSchema = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
  }, "Tanggal tidak valid.");
const optionalDateSchema = z.union([dateSchema, z.literal("")]);
const optionalHttpsUrlSchema = z.union([
  z.literal(""),
  z.string().url().refine((value) => value.startsWith("https://"), {
    message: "Tautan harus menggunakan HTTPS.",
  }),
]);
const galleryUrlSchema = z.string().refine(
  (value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "Gunakan path gambar /... atau URL HTTPS." },
);

const competitionSchema = z.object({
  extracurricularId: uuidSchema,
  title: z.string().trim().min(3).max(180),
  organizer: z.string().trim().max(180),
  description: z.string().trim().min(10).max(5000),
  eventDate: dateSchema,
  registrationDeadline: optionalDateSchema,
  location: z.string().trim().max(180),
  level: z.string().trim().max(80),
  registrationUrl: optionalHttpsUrlSchema,
  isPublished: z.boolean(),
});

const achievementSchema = z.object({
  extracurricularId: uuidSchema,
  title: z.string().trim().min(3).max(180),
  competitionName: z.string().trim().max(180),
  rank: z.string().trim().min(2).max(100),
  level: z.string().trim().max(80),
  achievedAt: dateSchema,
  description: z.string().trim().max(5000),
  isPublished: z.boolean(),
});

const gallerySchema = z.object({
  extracurricularId: uuidSchema,
  imageUrl: galleryUrlSchema,
  altText: z.string().trim().min(3).max(240),
  caption: z.string().trim().max(500),
  takenAt: optionalDateSchema,
  position: z.coerce.number().int().min(0).max(999),
  isPublished: z.boolean(),
});

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function readPublished(formData: FormData) {
  return formData.get("isPublished") === "on";
}

function toDatabaseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function optionalText(value: string) {
  return value || null;
}

function optionalDate(value: string) {
  return value ? toDatabaseDate(value) : null;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdminAndProgram(extracurricularId: string) {
  const admin = await getActiveSessionUser("ADMIN");
  if (!admin) redirect("/admin/login");

  const program = await getPrisma().extracurricular.findUnique({
    where: { id: extracurricularId },
    select: { id: true, name: true },
  });

  if (!program) redirect("/admin/lomba?error=ekskul-tidak-ditemukan");
  return { admin, program };
}

function refreshContentPages(programName: string) {
  const slug = slugify(programName);
  revalidatePath("/lomba");
  revalidatePath("/admin/lomba");
  revalidatePath(`/eskul/${slug}`);
  return slug;
}

function finish(programName: string, notice: string): never {
  const slug = refreshContentPages(programName);
  redirect(`/admin/lomba?ekskul=${encodeURIComponent(slug)}&notice=${notice}`);
}

function competitionInput(formData: FormData) {
  return competitionSchema.parse({
    extracurricularId: readText(formData, "extracurricularId"),
    title: readText(formData, "title"),
    organizer: readText(formData, "organizer"),
    description: readText(formData, "description"),
    eventDate: readText(formData, "eventDate"),
    registrationDeadline: readText(formData, "registrationDeadline"),
    location: readText(formData, "location"),
    level: readText(formData, "level"),
    registrationUrl: readText(formData, "registrationUrl"),
    isPublished: readPublished(formData),
  });
}

function achievementInput(formData: FormData) {
  return achievementSchema.parse({
    extracurricularId: readText(formData, "extracurricularId"),
    title: readText(formData, "title"),
    competitionName: readText(formData, "competitionName"),
    rank: readText(formData, "rank"),
    level: readText(formData, "level"),
    achievedAt: readText(formData, "achievedAt"),
    description: readText(formData, "description"),
    isPublished: readPublished(formData),
  });
}

function galleryInput(formData: FormData) {
  return gallerySchema.parse({
    extracurricularId: readText(formData, "extracurricularId"),
    imageUrl: readText(formData, "imageUrl").trim(),
    altText: readText(formData, "altText"),
    caption: readText(formData, "caption"),
    takenAt: readText(formData, "takenAt"),
    position: readText(formData, "position") || "0",
    isPublished: readPublished(formData),
  });
}

export async function createCompetitionAction(formData: FormData) {
  const input = competitionInput(formData);
  const { admin, program } = await requireAdminAndProgram(input.extracurricularId);

  await getPrisma().competition.create({
    data: {
      extracurricularId: program.id,
      createdById: admin.id,
      title: input.title,
      organizer: optionalText(input.organizer),
      description: input.description,
      eventDate: toDatabaseDate(input.eventDate),
      registrationDeadline: optionalDate(input.registrationDeadline),
      location: optionalText(input.location),
      level: optionalText(input.level),
      registrationUrl: optionalText(input.registrationUrl),
      isPublished: input.isPublished,
    },
  });

  finish(program.name, "lomba-ditambahkan");
}

export async function updateCompetitionAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const input = competitionInput(formData);
  const { program } = await requireAdminAndProgram(input.extracurricularId);

  const result = await getPrisma().competition.updateMany({
    where: { id, extracurricularId: program.id },
    data: {
      title: input.title,
      organizer: optionalText(input.organizer),
      description: input.description,
      eventDate: toDatabaseDate(input.eventDate),
      registrationDeadline: optionalDate(input.registrationDeadline),
      location: optionalText(input.location),
      level: optionalText(input.level),
      registrationUrl: optionalText(input.registrationUrl),
      isPublished: input.isPublished,
    },
  });

  if (result.count !== 1) redirect("/admin/lomba?error=lomba-tidak-ditemukan");
  finish(program.name, "lomba-diperbarui");
}

export async function deleteCompetitionAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const extracurricularId = uuidSchema.parse(readText(formData, "extracurricularId"));
  const { program } = await requireAdminAndProgram(extracurricularId);
  await getPrisma().competition.deleteMany({ where: { id, extracurricularId } });
  finish(program.name, "lomba-dihapus");
}

export async function createAchievementAction(formData: FormData) {
  const input = achievementInput(formData);
  const { admin, program } = await requireAdminAndProgram(input.extracurricularId);

  await getPrisma().achievement.create({
    data: {
      extracurricularId: program.id,
      createdById: admin.id,
      title: input.title,
      competitionName: optionalText(input.competitionName),
      rank: input.rank,
      level: optionalText(input.level),
      achievedAt: toDatabaseDate(input.achievedAt),
      description: optionalText(input.description),
      isPublished: input.isPublished,
    },
  });

  finish(program.name, "prestasi-ditambahkan");
}

export async function updateAchievementAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const input = achievementInput(formData);
  const { program } = await requireAdminAndProgram(input.extracurricularId);
  const result = await getPrisma().achievement.updateMany({
    where: { id, extracurricularId: program.id },
    data: {
      title: input.title,
      competitionName: optionalText(input.competitionName),
      rank: input.rank,
      level: optionalText(input.level),
      achievedAt: toDatabaseDate(input.achievedAt),
      description: optionalText(input.description),
      isPublished: input.isPublished,
    },
  });

  if (result.count !== 1) redirect("/admin/lomba?error=prestasi-tidak-ditemukan");
  finish(program.name, "prestasi-diperbarui");
}

export async function deleteAchievementAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const extracurricularId = uuidSchema.parse(readText(formData, "extracurricularId"));
  const { program } = await requireAdminAndProgram(extracurricularId);
  await getPrisma().achievement.deleteMany({ where: { id, extracurricularId } });
  finish(program.name, "prestasi-dihapus");
}

export async function createGalleryItemAction(formData: FormData) {
  const input = galleryInput(formData);
  const { admin, program } = await requireAdminAndProgram(input.extracurricularId);

  await getPrisma().galleryItem.create({
    data: {
      extracurricularId: program.id,
      createdById: admin.id,
      imageUrl: input.imageUrl,
      altText: input.altText,
      caption: optionalText(input.caption),
      takenAt: optionalDate(input.takenAt),
      position: input.position,
      isPublished: input.isPublished,
    },
  });

  finish(program.name, "galeri-ditambahkan");
}

export async function updateGalleryItemAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const input = galleryInput(formData);
  const { program } = await requireAdminAndProgram(input.extracurricularId);
  const result = await getPrisma().galleryItem.updateMany({
    where: { id, extracurricularId: program.id },
    data: {
      imageUrl: input.imageUrl,
      altText: input.altText,
      caption: optionalText(input.caption),
      takenAt: optionalDate(input.takenAt),
      position: input.position,
      isPublished: input.isPublished,
    },
  });

  if (result.count !== 1) redirect("/admin/lomba?error=galeri-tidak-ditemukan");
  finish(program.name, "galeri-diperbarui");
}

export async function deleteGalleryItemAction(formData: FormData) {
  const id = uuidSchema.parse(readText(formData, "id"));
  const extracurricularId = uuidSchema.parse(readText(formData, "extracurricularId"));
  const { program } = await requireAdminAndProgram(extracurricularId);
  await getPrisma().galleryItem.deleteMany({ where: { id, extracurricularId } });
  finish(program.name, "galeri-dihapus");
}
