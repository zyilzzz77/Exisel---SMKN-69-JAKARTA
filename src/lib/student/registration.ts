import { z } from "zod";

export const STUDENT_CLASS_OPTIONS = [
  "X SIJA 1",
  "X SIJA 2",
  "XI SIJA 1",
  "XI SIJA 2",
  "XII SIJA 1",
  "XII SIJA 2",
  "XIII SIJA 1",
  "XIII SIJA 2",
  "X MEKA 1",
  "X MEKA 2",
  "XI MEKA 1",
  "XI MEKA 2",
  "XII MEKA 1",
  "XII MEKA 2",
  "X OTO 1",
  "X OTO 2",
  "XI OTO 1",
  "XI OTO 2",
  "XII OTO 1",
  "XII OTO 2",
] as const;

export const STUDENT_CLASS_MAJORS = ["SIJA", "MEKA", "OTO"] as const;

export const studentRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama lengkap minimal 3 karakter.")
    .max(100, "Nama lengkap maksimal 100 karakter.")
    .transform((value) => value.replace(/\s+/g, " ")),
  nis: z
    .string()
    .trim()
    .regex(/^\d{7}$/, "NIS harus terdiri dari tepat 7 angka."),
  className: z.enum(STUDENT_CLASS_OPTIONS, {
    message: "Pilih kelas yang tersedia.",
  }),
});
