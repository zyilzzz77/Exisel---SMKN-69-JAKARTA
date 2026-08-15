import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildAttendanceExcelBuffer } from "./excel-export";

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
      },
    ],
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer).buffer);

  for (const sheetName of ["Ringkasan", "Rekap Kehadiran", "Detail Izin"]) {
    const sheet = workbook.getWorksheet(sheetName);
    assert.ok(sheet, `Sheet ${sheetName} harus tersedia`);
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
