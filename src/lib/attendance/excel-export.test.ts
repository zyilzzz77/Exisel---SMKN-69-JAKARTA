import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  buildAttendanceExcelBuffer,
  type AttendanceExportMember,
  type AttendanceExportReport,
} from "./excel-export";

// ---------------------------------------------------------------------------
// Fixtures. The main fixture mirrors the shape produced by
// getAttendanceProgramReports (report.ts): precomputed per-member metrics +
// the overall summary block. 1 ekskul (Basket), 3 members, 4 agenda sessions.
//   Member A: hadir 3, izin 1, tidak hadir 0
//   Member B: hadir 2, izin 0, tidak hadir 2
//   Member C: hadir 0, izin 1, tidak hadir 3 (NIS/kelas null → fallback "-")
// ---------------------------------------------------------------------------

const AGENDA_DATES = [
  "2026-08-01",
  "2026-08-08",
  "2026-08-15",
  "2026-08-22",
] as const;

function buildMainFixture(): AttendanceExportReport {
  return {
    id: "prog-basket",
    name: "Basket",
    throughDate: "2026-08-22",
    startDate: "2026-08-01",
    scheduleLabel: "Sabtu, 15:00–17:00 • Lapangan Basket",
    agendaDates: [...AGENDA_DATES],
    schedules: [],
    members: [
      {
        userId: "student-a",
        name: "Aisyah Putri",
        nis: "2600001",
        className: "X SIJA 1",
        enrolledAt: "2026-07-01",
        statuses: [
          { dateKey: "2026-08-01", status: "PRESENT", reason: null },
          { dateKey: "2026-08-08", status: "PRESENT", reason: null },
          { dateKey: "2026-08-15", status: "PRESENT", reason: null },
          { dateKey: "2026-08-22", status: "EXCUSED", reason: "Sakit" },
        ],
        present: 3,
        excused: 1,
        absent: 0,
        missing: 0,
        totalAgenda: 4,
        attendanceRate: 0.75,
        activityLevel: "Aktif",
      },
      {
        userId: "student-b",
        name: "Bintang Saputra",
        nis: "2600002",
        className: "X SIJA 1",
        enrolledAt: "2026-07-01",
        statuses: [
          { dateKey: "2026-08-01", status: "PRESENT", reason: null },
          { dateKey: "2026-08-08", status: "ABSENT", reason: null },
          { dateKey: "2026-08-15", status: "PRESENT", reason: null },
          { dateKey: "2026-08-22", status: "ABSENT", reason: null },
        ],
        present: 2,
        excused: 0,
        absent: 2,
        missing: 0,
        totalAgenda: 4,
        attendanceRate: 0.5,
        activityLevel: "Perlu ditingkatkan",
      },
      {
        userId: "student-c",
        name: "Citra Melati",
        nis: null,
        className: null,
        enrolledAt: "2026-07-01",
        statuses: [
          {
            dateKey: "2026-08-01",
            status: "EXCUSED",
            reason: "Sakit, izin orang tua",
          },
          { dateKey: "2026-08-08", status: "ABSENT", reason: null },
          { dateKey: "2026-08-15", status: "ABSENT", reason: null },
          { dateKey: "2026-08-22", status: "ABSENT", reason: null },
        ],
        present: 0,
        excused: 1,
        absent: 3,
        missing: 0,
        totalAgenda: 4,
        attendanceRate: 0,
        activityLevel: "Perlu perhatian",
      },
    ],
    summary: {
      members: 3,
      agenda: 4,
      present: 5,
      excused: 2,
      absent: 5,
      missing: 0,
      totalExpected: 12,
      attendanceRate: 5 / 12,
    },
  };
}

/** Narrow payload without precomputed metrics (mirrors the legacy caller shape). */
function narrowMember(overrides: {
  userId: string;
  name: string;
  nis?: string | null;
  className?: string | null;
  enrolledAt?: string;
  statuses: AttendanceExportMember["statuses"];
}): AttendanceExportMember {
  return {
    userId: overrides.userId,
    name: overrides.name,
    nis: overrides.nis !== undefined ? overrides.nis : "2600099",
    className:
      overrides.className !== undefined ? overrides.className : "XI MEKA 1",
    enrolledAt: overrides.enrolledAt ?? "2026-07-01",
    statuses: overrides.statuses,
  };
}

function narrowReport(overrides: {
  agendaDates: string[];
  members: AttendanceExportMember[];
  throughDate?: string;
}): AttendanceExportReport {
  return {
    id: "prog-narrow",
    name: "Basket",
    throughDate: overrides.throughDate ?? "2026-08-22",
    startDate: overrides.agendaDates[0] ?? "2026-08-01",
    scheduleLabel: "Sabtu, 15:00–17:00 • Lapangan Basket",
    agendaDates: overrides.agendaDates,
    schedules: [],
    members: overrides.members,
  };
}

// ---------------------------------------------------------------------------
// Assertion helpers operating on the LOADED workbook (actual XLSX bytes).
// ---------------------------------------------------------------------------

type WorkbookLoadBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

async function loadWorkbook(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer/ArrayBuffer/base64 at runtime; the d.ts declares
  // an older Buffer type that clashes with the current ambient Buffer.
  await workbook.xlsx.load(bytes as unknown as WorkbookLoadBuffer);
  return workbook;
}

async function buildAndLoad(report: AttendanceExportReport) {
  const buffer = await buildAttendanceExcelBuffer(report);
  const workbook = await loadWorkbook(buffer);
  return { buffer, workbook };
}

function requireSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(name);
  assert.ok(sheet, `Sheet ${name} harus tersedia`);
  return sheet;
}

function asNumber(value: unknown, address: string): number {
  assert.ok(
    typeof value === "number" && Number.isFinite(value),
    `${address} harus angka berhingga, aktual: ${typeof value} (${String(value)})`,
  );
  return value;
}

function asClose(actual: unknown, expected: number, address: string) {
  const number = asNumber(actual, address);
  assert.ok(
    Math.abs(number - expected) < 1e-9,
    `${address} diharapkan ~${expected}, aktual ${number}`,
  );
  return number;
}

function assertDateUtc(value: unknown, dateKey: string, address: string) {
  assert.ok(
    value instanceof Date,
    `${address} harus tanggal (Date), aktual: ${typeof value} (${String(value)})`,
  );
  assert.equal(
    (value as Date).getTime(),
    Date.parse(`${dateKey}T00:00:00.000Z`),
    `${address} harus ${dateKey}`,
  );
}

function getFillColor(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill as { fgColor?: { argb?: string } } | undefined;
  return fill?.fgColor?.argb;
}

/** Every cell value in the sheet must render cleanly (no NaN/undefined/"[object Object]"). */
function assertNoBrokenCells(sheet: ExcelJS.Worksheet) {
  const badTexts = ["NaN", "Infinity", "undefined", "[object Object]"];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const value = cell.value;
      assert.ok(
        value !== null && value !== undefined,
        `${sheet.name}!${cell.address} tidak boleh null/undefined`,
      );
      const text =
        value instanceof Date
          ? value.toISOString()
          : typeof value === "string"
            ? value
            : String(value as never);
      for (const bad of badTexts) {
        assert.ok(
          !text.includes(bad),
          `${sheet.name}!${cell.address} berisi nilai rusak "${bad}": ${text}`,
        );
      }
    });
  });
}

/** Collects every remaining formula in the workbook as "Sheet!A1 = FORMULA". */
function collectFormulaCells(workbook: ExcelJS.Workbook): string[] {
  const found: string[] = [];
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const formula = (cell as { formula?: unknown }).formula;
        if (typeof formula === "string" && formula.length > 0) {
          found.push(`${sheet.name}!${cell.address} = ${formula}`);
        }
      });
    });
  }
  return found;
}

/** Counts how many cells in `rows` hold exactly `label`. */
function countLabels(
  sheet: ExcelJS.Worksheet,
  rowStart: number,
  rowEnd: number,
  label: string,
): number {
  let count = 0;
  for (let rowNumber = rowStart; rowNumber <= rowEnd; rowNumber++) {
    sheet.getRow(rowNumber).eachCell((cell) => {
      if (cell.value === label) count++;
    });
  }
  return count;
}

/** Number of data rows in Detail Izin: consecutive rows where col 1 is a number. */
function countDetailIzinRows(sheet: ExcelJS.Worksheet): number {
  let count = 0;
  let rowNumber = 5;
  while (typeof sheet.getCell(rowNumber, 1).value === "number") {
    count++;
    rowNumber++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Regression: Ringkasan metrics (stat cards + per-student E–J) must be written
// as literal values so non-recalculating consumers see them. Previously they
// were emitted as invalid OOXML formulas (leading "=") with no cached result.
// ---------------------------------------------------------------------------

test("Ringkasan menampilkan metrik literal anggota, kartu ringkasan, Rekap, dan Detail Izin", async () => {
  const report = buildMainFixture();
  const { workbook } = await buildAndLoad(report);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  const rekap = requireSheet(workbook, "Rekap Kehadiran");
  const izin = requireSheet(workbook, "Detail Izin");

  // ---- Stat cards (baris 5) -----------------------------------------------
  assert.equal(ringkasan.getCell(4, 1).value, "Anggota");
  assert.equal(ringkasan.getCell(4, 3).value, "Agenda");
  assert.equal(ringkasan.getCell(4, 5).value, "Jumlah hadir");
  assert.equal(ringkasan.getCell(4, 6).value, "Izin");
  assert.equal(ringkasan.getCell(4, 7).value, "Tidak hadir");
  assert.equal(ringkasan.getCell(4, 8).value, "Tingkat kehadiran");

  assert.equal(asNumber(ringkasan.getCell(5, 1).value, "Ringkasan!A5"), 3); // Anggota
  assert.equal(asNumber(ringkasan.getCell(5, 3).value, "Ringkasan!C5"), 4); // Agenda
  assert.equal(asNumber(ringkasan.getCell(5, 5).value, "Ringkasan!E5"), 5); // Jumlah hadir
  assert.equal(asNumber(ringkasan.getCell(5, 6).value, "Ringkasan!F5"), 2); // Izin
  assert.equal(asNumber(ringkasan.getCell(5, 7).value, "Ringkasan!G5"), 5); // Tidak hadir
  asClose(ringkasan.getCell(5, 8).value, 5 / 12, "Ringkasan!H5 (rate)");
  assert.equal(ringkasan.getCell(5, 8).numFmt, "0.0%");

  // ---- Student rows (baris 9+) --------------------------------------------
  const expectedRows = [
    {
      nis: "2600001",
      name: "Aisyah Putri",
      className: "X SIJA 1",
      present: 3,
      excused: 1,
      absent: 0,
      total: 4,
      rate: 0.75,
      label: "Aktif",
    },
    {
      nis: "2600002",
      name: "Bintang Saputra",
      className: "X SIJA 1",
      present: 2,
      excused: 0,
      absent: 2,
      total: 4,
      rate: 0.5,
      label: "Perlu ditingkatkan",
    },
    {
      nis: "-",
      name: "Citra Melati",
      className: "-",
      present: 0,
      excused: 1,
      absent: 3,
      total: 4,
      rate: 0,
      label: "Perlu perhatian",
    },
  ];

  expectedRows.forEach((expected, index) => {
    const rowNumber = 9 + index;
    const row = ringkasan.getRow(rowNumber);
    assert.equal(row.getCell(1).value, index + 1, `Ringkasan!A${rowNumber} No`);
    assert.equal(row.getCell(2).value, expected.nis, `Ringkasan!B${rowNumber} NIS`);
    assert.equal(row.getCell(3).value, expected.name, `Ringkasan!C${rowNumber} Nama`);
    assert.equal(
      row.getCell(4).value,
      expected.className,
      `Ringkasan!D${rowNumber} Kelas`,
    );
    assert.equal(
      asNumber(row.getCell(5).value, `Ringkasan!E${rowNumber}`),
      expected.present,
      `Ringkasan!E${rowNumber} Hadir`,
    );
    assert.equal(
      asNumber(row.getCell(6).value, `Ringkasan!F${rowNumber}`),
      expected.excused,
      `Ringkasan!F${rowNumber} Izin`,
    );
    assert.equal(
      asNumber(row.getCell(7).value, `Ringkasan!G${rowNumber}`),
      expected.absent,
      `Ringkasan!G${rowNumber} Tidak hadir`,
    );
    assert.equal(
      asNumber(row.getCell(8).value, `Ringkasan!H${rowNumber}`),
      expected.total,
      `Ringkasan!H${rowNumber} Total agenda`,
    );
    asClose(row.getCell(9).value, expected.rate, `Ringkasan!I${rowNumber}`);
    assert.equal(
      row.getCell(9).numFmt,
      "0.0%",
      `Ringkasan!I${rowNumber} numFmt`,
    );
    assert.equal(
      row.getCell(10).value,
      expected.label,
      `Ringkasan!J${rowNumber} Keaktifan`,
    );
  });

  // ---- Rekap: label per tanggal + total literal yang sama ------------------
  const statusGrid = [
    ["Hadir", "Hadir", "Hadir", "Izin"],
    ["Hadir", "Tidak hadir", "Hadir", "Tidak hadir"],
    ["Izin", "Tidak hadir", "Tidak hadir", "Tidak hadir"],
  ];
  statusGrid.forEach((rowStatuses, mIdx) => {
    rowStatuses.forEach((status, dIdx) => {
      const cell = rekap.getCell(5 + mIdx, 6 + dIdx);
      assert.equal(
        cell.value,
        status,
        `Rekap!${cell.address} status ${status}`,
      );
    });
  });

  // Styling preserved: green/orange/red fills on status cells.
  assert.equal(getFillColor(rekap.getCell(5, 6)), "FFBAF7C7", "fill Hadir");
  assert.equal(getFillColor(rekap.getCell(5, 9)), "FFFFE0C2", "fill Izin");
  assert.equal(getFillColor(rekap.getCell(6, 7)), "FFFFD2D2", "fill Tidak hadir");

  const rekapTotals = [
    { row: 5, present: 3, excused: 1, absent: 0, total: 4, rate: 0.75, label: "Aktif" },
    { row: 6, present: 2, excused: 0, absent: 2, total: 4, rate: 0.5, label: "Perlu ditingkatkan" },
    { row: 7, present: 0, excused: 1, absent: 3, total: 4, rate: 0, label: "Perlu perhatian" },
  ];
  for (const expected of rekapTotals) {
    assert.equal(
      asNumber(rekap.getCell(expected.row, 10).value, `Rekap!J${expected.row}`),
      expected.present,
    );
    assert.equal(
      asNumber(rekap.getCell(expected.row, 11).value, `Rekap!K${expected.row}`),
      expected.excused,
    );
    assert.equal(
      asNumber(rekap.getCell(expected.row, 12).value, `Rekap!L${expected.row}`),
      expected.absent,
    );
    assert.equal(
      asNumber(rekap.getCell(expected.row, 13).value, `Rekap!M${expected.row}`),
      expected.total,
    );
    asClose(rekap.getCell(expected.row, 14).value, expected.rate, `Rekap!N${expected.row}`);
    assert.equal(rekap.getCell(expected.row, 14).numFmt, "0.0%", `Rekap!N${expected.row} numFmt`);
    assert.equal(rekap.getCell(expected.row, 15).value, expected.label);
  }

  // ---- Detail Izin: dua entri izin dengan alasan & tanggal tepat ----------
  const izinRows = countDetailIzinRows(izin);
  assert.equal(izinRows, 2, "Detail Izin harus memuat tepat 2 entri");

  assert.equal(izin.getCell(5, 1).value, 1);
  assertDateUtc(izin.getCell(5, 2).value, "2026-08-22", "Izin!B5");
  assert.equal(izin.getCell(5, 2).numFmt, "dd-mmm-yyyy");
  assert.equal(izin.getCell(5, 3).value, "2600001"); // Aisyah
  assert.equal(izin.getCell(5, 4).value, "Aisyah Putri");
  assert.equal(izin.getCell(5, 5).value, "X SIJA 1");
  assert.equal(izin.getCell(5, 6).value, "Sakit");

  assert.equal(izin.getCell(6, 1).value, 2);
  assertDateUtc(izin.getCell(6, 2).value, "2026-08-01", "Izin!B6");
  assert.equal(izin.getCell(6, 3).value, "-"); // Citra: NIS null
  assert.equal(izin.getCell(6, 4).value, "Citra Melati");
  assert.equal(izin.getCell(6, 5).value, "-");
  assert.equal(izin.getCell(6, 6).value, "Sakit, izin orang tua");

  // ---- Invariants antar lembar --------------------------------------------
  const ringkasanPresentTotal = expectedRows.reduce(
    (total, row) => total + row.present,
    0,
  );
  assert.equal(
    countLabels(rekap, 5, 7, "Hadir"),
    ringkasanPresentTotal,
    "SUM(Ringkasan.Hadir) harus sama dengan jumlah label Hadir di Rekap",
  );
  const ringkasanExcusedTotal = expectedRows.reduce(
    (total, row) => total + row.excused,
    0,
  );
  assert.equal(
    izinRows,
    ringkasanExcusedTotal,
    "SUM(Ringkasan.Izin) harus sama dengan jumlah entri Detail Izin",
  );

  // ---- Validitas: tidak ada formula / nilai rusak tersisa ------------------
  for (const sheet of workbook.worksheets) {
    assertNoBrokenCells(sheet);
  }
  assert.deepEqual(
    collectFormulaCells(workbook),
    [],
    "Seluruh metrik harus literal; formula dengan awalan '=' menghasilkan OOXML invalid",
  );
});

// ---------------------------------------------------------------------------
// Existing structural test (kept; payload extended to carry precomputed metrics)
// ---------------------------------------------------------------------------

test("laporan Excel memiliki blok tanda tangan dan pengaturan cetak A4", async () => {
  const buffer = await buildAttendanceExcelBuffer({
    id: "test",
    name: "ITC",
    throughDate: "2026-08-15",
    startDate: "2026-08-01",
    scheduleLabel: "Sabtu, 15:00–17:00 • Laboratorium SIJA",
    agendaDates: ["2026-08-01"],
    schedules: [],
    members: [
      {
        userId: "student-1",
        name: "Siswa Uji",
        nis: "2600001",
        className: "X SIJA 1",
        enrolledAt: "2026-07-01",
        statuses: [
          { dateKey: "2026-08-01", status: "PRESENT", reason: null },
        ],
        present: 1,
        excused: 0,
        absent: 0,
        missing: 0,
        totalAgenda: 1,
        attendanceRate: 1,
        activityLevel: "Sangat aktif",
      },
    ],
    summary: {
      members: 1,
      agenda: 1,
      present: 1,
      excused: 0,
      absent: 0,
      missing: 0,
      totalExpected: 1,
      attendanceRate: 1,
    },
  });
  const workbook = await loadWorkbook(buffer);

  for (const sheetName of ["Ringkasan", "Rekap Kehadiran", "Detail Izin"]) {
    const sheet = requireSheet(workbook, sheetName);
    assert.equal(sheet.pageSetup.paperSize, 9);
    assert.equal(sheet.pageSetup.orientation, "landscape");
    assert.equal(sheet.pageSetup.fitToPage, true);
    assert.equal(sheet.pageSetup.fitToWidth, 1);
    assert.equal(sheet.pageSetup.fitToHeight, 0);
    assert.match(sheet.pageSetup.printArea ?? "", /^A1:/);

    const textValues: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell((cell) => textValues.push(String(cell.value ?? "")));
    });
    assert.ok(
      textValues.some((value) =>
        value.includes("Penanggung Jawab Ekstrakurikuler ITC"),
      ),
      `Sheet ${sheetName} harus memiliki blok tanda tangan`,
    );
    assert.ok(
      textValues.some((value) => value.includes("NIP/NIK:")),
      `Sheet ${sheetName} harus memiliki kolom identitas penanggung jawab`,
    );
  }
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("nol agenda: tanpa pembagian nol, kartu agenda 0, dan keaktifan 'Belum ada agenda'", async () => {
  const buffer = await buildAttendanceExcelBuffer(
    narrowReport({
      agendaDates: [],
      members: [
        narrowMember({
          userId: "student-0",
          name: "Nol Agenda",
          statuses: [],
        }),
      ],
      throughDate: "2026-08-01",
    }),
  );
  const workbook = await loadWorkbook(buffer);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  assert.equal(asNumber(ringkasan.getCell(5, 1).value, "A5 anggota"), 1);
  assert.equal(asNumber(ringkasan.getCell(5, 3).value, "C5 agenda"), 0);
  assert.equal(asNumber(ringkasan.getCell(5, 5).value, "E5 hadir"), 0);
  assert.equal(asNumber(ringkasan.getCell(5, 6).value, "F5 izin"), 0);
  assert.equal(asNumber(ringkasan.getCell(5, 7).value, "G5 tidak hadir"), 0);
  assert.equal(asNumber(ringkasan.getCell(5, 8).value, "H5 rate"), 0);
  assert.equal(ringkasan.getCell(5, 8).numFmt, "0.0%");

  const row = ringkasan.getRow(9);
  assert.equal(asNumber(row.getCell(5).value, "E9"), 0);
  assert.equal(asNumber(row.getCell(6).value, "F9"), 0);
  assert.equal(asNumber(row.getCell(7).value, "G9"), 0);
  assert.equal(asNumber(row.getCell(8).value, "H9 total agenda"), 0);
  assert.equal(asNumber(row.getCell(9).value, "I9 rate"), 0);
  assert.equal(row.getCell(9).numFmt, "0.0%");
  assert.equal(row.getCell(10).value, "Belum ada agenda");

  const rekap = requireSheet(workbook, "Rekap Kehadiran");
  assert.equal(rekap.getCell(4, 6).value, "Belum ada agenda");
  assert.equal(rekap.getCell(5, 6).value, "-");
  // Tanpa agenda: metrik Rekap bergeser ke kiri (placeholder 1 kolom), jadi
  // Total agenda ada di kolom J(10) dan Keaktifan di kolom L(12).
  assert.equal(asNumber(rekap.getCell(5, 10).value, "Rekap total agenda"), 0);
  assert.equal(rekap.getCell(5, 12).value, "Belum ada agenda");

  const izin = requireSheet(workbook, "Detail Izin");
  assert.equal(countDetailIzinRows(izin), 0);
  assert.equal(izin.getCell(5, 1).value, "Belum ada catatan izin.");

  for (const sheet of workbook.worksheets) {
    assertNoBrokenCells(sheet);
  }
  assert.deepEqual(collectFormulaCells(workbook), []);
});

test("NIS dan kelas null memakai fallback '-' di Ringkasan dan Rekap", async () => {
  const buffer = await buildAttendanceExcelBuffer(
    narrowReport({
      agendaDates: ["2026-08-01"],
      members: [
        narrowMember({
          userId: "student-null",
          name: "Tanpa NIS",
          nis: null,
          className: null,
          statuses: [{ dateKey: "2026-08-01", status: "PRESENT", reason: null }],
        }),
      ],
      throughDate: "2026-08-01",
    }),
  );
  const workbook = await loadWorkbook(buffer);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  assert.equal(ringkasan.getCell(9, 2).value, "-");
  assert.equal(ringkasan.getCell(9, 4).value, "-");

  const rekap = requireSheet(workbook, "Rekap Kehadiran");
  assert.equal(rekap.getCell(5, 2).value, "-");
  assert.equal(rekap.getCell(5, 4).value, "-");

  const izin = requireSheet(workbook, "Detail Izin");
  assert.equal(countDetailIzinRows(izin), 0);
  assertNoBrokenCells(ringkasan);
  assertNoBrokenCells(rekap);
});

test("semua sesi tidak terisi (missing): metrik nol dihitung dari statuses tanpa NaN", async () => {
  // Narrow payload: tidak ada precomputed metrics — writer harus menurunkannya dari statuses.
  const buffer = await buildAttendanceExcelBuffer(
    narrowReport({
      agendaDates: [...AGENDA_DATES],
      members: [
        narrowMember({
          userId: "student-x",
          name: "Siswa Misterius",
          statuses: AGENDA_DATES.map((dateKey) => ({
            dateKey,
            status: "MISSING" as const,
            reason: null,
          })),
        }),
      ],
    }),
  );
  const workbook = await loadWorkbook(buffer);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  const row = ringkasan.getRow(9);
  assert.equal(asNumber(row.getCell(5).value, "E9 hadir"), 0);
  assert.equal(asNumber(row.getCell(6).value, "F9 izin"), 0);
  assert.equal(asNumber(row.getCell(7).value, "G9 tidak hadir"), 0);
  assert.equal(asNumber(row.getCell(8).value, "H9 total agenda"), 4);
  assert.equal(asNumber(row.getCell(9).value, "I9 rate"), 0);
  assert.equal(row.getCell(10).value, "Perlu perhatian");

  assert.equal(asNumber(ringkasan.getCell(5, 8).value, "H5 rate kartu"), 0);
  assertNoBrokenCells(ringkasan);
  assert.deepEqual(collectFormulaCells(workbook), []);
});

test("semua hadir: rate 100% dan keaktifan 'Sangat aktif'", async () => {
  const statuses = AGENDA_DATES.map((dateKey) => ({
    dateKey,
    status: "PRESENT" as const,
    reason: null,
  }));
  const buffer = await buildAttendanceExcelBuffer(
    narrowReport({
      agendaDates: [...AGENDA_DATES],
      members: [
        {
          ...narrowMember({
            userId: "student-all",
            name: "Rajin Sekali",
            statuses,
          }),
          present: 4,
          excused: 0,
          absent: 0,
          missing: 0,
          totalAgenda: 4,
          attendanceRate: 1,
          activityLevel: "Sangat aktif",
        },
      ],
    }),
  );
  const workbook = await loadWorkbook(buffer);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  const row = ringkasan.getRow(9);
  assert.equal(asNumber(row.getCell(5).value, "E9"), 4);
  assert.equal(asNumber(row.getCell(6).value, "F9"), 0);
  assert.equal(asNumber(row.getCell(7).value, "G9"), 0);
  assert.equal(asNumber(row.getCell(8).value, "H9"), 4);
  assert.equal(asNumber(row.getCell(9).value, "I9"), 1);
  assert.equal(row.getCell(9).numFmt, "0.0%");
  assert.equal(row.getCell(10).value, "Sangat aktif");

  assert.equal(asNumber(ringkasan.getCell(5, 8).value, "H5 kartu rate"), 1);
  assertNoBrokenCells(ringkasan);
});

test("semua tidak hadir: izin/tidak hadir literal dan Detail Izin kosong", async () => {
  const statuses = AGENDA_DATES.map((dateKey, index) => ({
    dateKey,
    status: index === 3 ? ("ABSENT" as const) : ("ABSENT" as const),
    reason: null,
  }));
  const buffer = await buildAttendanceExcelBuffer(
    narrowReport({
      agendaDates: [...AGENDA_DATES],
      members: [
        {
          ...narrowMember({
            userId: "student-none",
            name: "Alpa Mulia",
            statuses,
          }),
          present: 0,
          excused: 0,
          absent: 4,
          missing: 0,
          totalAgenda: 4,
          attendanceRate: 0,
          activityLevel: "Perlu perhatian",
        },
      ],
    }),
  );
  const workbook = await loadWorkbook(buffer);

  const ringkasan = requireSheet(workbook, "Ringkasan");
  const row = ringkasan.getRow(9);
  assert.equal(asNumber(row.getCell(5).value, "E9"), 0);
  assert.equal(asNumber(row.getCell(7).value, "G9"), 4);
  assert.equal(asNumber(row.getCell(8).value, "H9"), 4);
  assert.equal(asNumber(row.getCell(9).value, "I9"), 0);
  assert.equal(row.getCell(10).value, "Perlu perhatian");

  const izin = requireSheet(workbook, "Detail Izin");
  assert.equal(countDetailIzinRows(izin), 0);
  assert.equal(izin.getCell(5, 1).value, "Belum ada catatan izin.");
  assertNoBrokenCells(ringkasan);
  assertNoBrokenCells(izin);
});
