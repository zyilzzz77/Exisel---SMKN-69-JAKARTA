import assert from "node:assert/strict";
import test from "node:test";
import { studentRegistrationSchema } from "./registration";

test("menerima data siswa valid dan merapikan spasi nama", () => {
  const result = studentRegistrationSchema.safeParse({
    name: "  Siswa   EXISEL  ",
    nis: "2501319",
    className: "XI SIJA 1",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, {
      name: "Siswa EXISEL",
      nis: "2501319",
      className: "XI SIJA 1",
    });
  }
});

test("menolak NIS selain tepat tujuh angka", () => {
  for (const nis of ["123456", "12345678", "12A4567"]) {
    const result = studentRegistrationSchema.safeParse({
      name: "Siswa EXISEL",
      nis,
      className: "XI SIJA 1",
    });

    assert.equal(result.success, false, `NIS ${nis} seharusnya ditolak`);
  }
});

test("menolak kelas di luar daftar resmi", () => {
  const result = studentRegistrationSchema.safeParse({
    name: "Siswa EXISEL",
    nis: "2501319",
    className: "XI RPL 1",
  });

  assert.equal(result.success, false);
});

test("menerima kelas SIJA sampai tingkat XIII serta MEKA dan OTO sampai XII", () => {
  for (const className of ["XIII SIJA 2", "XII MEKA 2", "XII OTO 2"]) {
    const result = studentRegistrationSchema.safeParse({
      name: "Siswa EXISEL",
      nis: "2501319",
      className,
    });

    assert.equal(result.success, true, `${className} seharusnya diterima`);
  }

  for (const className of ["XIII MEKA 1", "XIII OTO 1"]) {
    const result = studentRegistrationSchema.safeParse({
      name: "Siswa EXISEL",
      nis: "2501319",
      className,
    });

    assert.equal(result.success, false, `${className} seharusnya ditolak`);
  }
});

test("membuang field role dan status yang disisipkan client", () => {
  const result = studentRegistrationSchema.safeParse({
    name: "Siswa EXISEL",
    nis: "2501319",
    className: "XI SIJA 1",
    role: "ADMIN",
    status: "APPROVED",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal("role" in result.data, false);
    assert.equal("status" in result.data, false);
  }
});
