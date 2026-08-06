"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";

const extracurricularIdSchema = z.string().uuid();

type RegistrationOutcome =
  | "success"
  | "already"
  | "full"
  | "missing-nis"
  | "invalid"
  | "unauthorized"
  | "unavailable";

function isSerializationConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

export async function registerExtracurricularAction(
  extracurricularId: string,
) {
  const parsedId = extracurricularIdSchema.safeParse(extracurricularId);

  if (!parsedId.success) {
    redirect("/ekstrakurikuler");
  }

  const session = await readSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const prisma = getPrisma();
  let outcome: RegistrationOutcome = "unavailable";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      outcome = await prisma.$transaction(
        async (transaction) => {
          const [user, extracurricular, existingEnrollment] = await Promise.all([
            transaction.user.findFirst({
              where: {
                id: session.userId,
                role: "STUDENT",
                isActive: true,
              },
              select: { id: true, nis: true },
            }),
            transaction.extracurricular.findFirst({
              where: { id: parsedId.data, isActive: true },
              select: {
                id: true,
                capacity: true,
                _count: {
                  select: {
                    enrollments: {
                      where: { status: { in: ["PENDING", "APPROVED"] } },
                    },
                  },
                },
              },
            }),
            transaction.enrollment.findUnique({
              where: {
                userId_extracurricularId: {
                  userId: session.userId,
                  extracurricularId: parsedId.data,
                },
              },
              select: { id: true, status: true },
            }),
          ]);

          if (!user) return "unauthorized";
          if (!user.nis) return "missing-nis";
          if (!extracurricular) return "invalid";
          if (existingEnrollment?.status === "PENDING") {
            await transaction.enrollment.update({
              where: { id: existingEnrollment.id },
              data: { status: "APPROVED" },
            });
            return "success";
          }
          if (existingEnrollment?.status === "APPROVED") {
            return "already";
          }
          if (extracurricular._count.enrollments >= extracurricular.capacity) {
            return "full";
          }

          if (existingEnrollment?.status === "REJECTED") {
            await transaction.enrollment.update({
              where: { id: existingEnrollment.id },
              data: {
                status: "APPROVED",
                registeredAt: new Date(),
              },
            });
          } else {
            await transaction.enrollment.create({
              data: {
                userId: user.id,
                extracurricularId: extracurricular.id,
                status: "APPROVED",
              },
            });
          }

          return "success";
        },
        { isolationLevel: "Serializable" },
      );
      break;
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === 2) {
        outcome = "unavailable";
        break;
      }
    }
  }

  if (outcome === "unauthorized") {
    redirect("/login");
  }

  if (outcome === "success") {
    revalidatePath("/dashboard");
    revalidatePath("/ekstrakurikuler");
  }

  redirect(
    `/daftar/eskul?ekskul=${encodeURIComponent(parsedId.data)}&status=${outcome}`,
  );
}
