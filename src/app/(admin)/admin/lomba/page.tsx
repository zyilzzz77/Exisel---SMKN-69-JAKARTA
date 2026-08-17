import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { AdminContentManager } from "@/components/admin/lomba";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";

export const metadata: Metadata = {
  title: "Kelola Lomba & Profil — EXISEL",
  description: "Kelola informasi lomba, prestasi, dan galeri ekstrakurikuler.",
};

type AdminContentPageProps = {
  searchParams: Promise<{
    ekskul?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const activeAdmin = await getActiveSessionUser("ADMIN");
  if (!activeAdmin) redirect("/admin/login");

  const prisma = getPrisma();
  const [admin, programs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: activeAdmin.id },
      select: { name: true },
    }),
    prisma.extracurricular.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        competitions: { orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }] },
        achievements: { orderBy: [{ achievedAt: "desc" }, { createdAt: "desc" }] },
        galleryItems: { orderBy: [{ position: "asc" }, { createdAt: "desc" }] },
      },
    }),
  ]);

  if (!admin) redirect("/admin/login");

  const query = await searchParams;
  const requestedSlug = first(query.ekskul);
  const selectedProgram =
    programs.find((program) => slugify(program.name) === requestedSlug) ?? programs[0];
  const notice = first(query.notice) ?? null;
  const error = first(query.error) ?? null;

  return (
    <div className="min-h-screen bg-exisel-bg">
      <AdminHeader
        activeItem="content"
        adminName={admin.name}
        brandSubtitle="Kelola konten ekskul"
        roleLabel="Admin / Pembina"
      />

      {selectedProgram ? (
        <AdminContentManager
          programs={programs}
          selectedProgram={selectedProgram}
          notice={notice}
          error={error}
        />
      ) : (
        <main className="mx-auto max-w-[1500px] px-4 py-16 text-center sm:px-6 lg:px-10">
          <div className="rounded-2xl border-[3px] border-dashed border-exisel-ink bg-white p-12 shadow-brutal-sm">
            <h2 className="text-xl font-black text-exisel-ink">
              Belum ada ekstrakurikuler aktif
            </h2>
            <p className="mt-2 text-sm font-semibold text-exisel-muted">
              Aktifkan ekstrakurikuler terlebih dahulu untuk mengelola agenda lomba, prestasi, dan galeri.
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
