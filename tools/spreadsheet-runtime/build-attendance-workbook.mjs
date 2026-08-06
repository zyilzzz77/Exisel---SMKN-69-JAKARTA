import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const [, , inputPath, outputPath, previewPath] = process.argv;

if (inputPath === "--verify") {
  if (!outputPath || !previewPath) {
    throw new Error("Path XLSX dan folder preview wajib diberikan untuk verifikasi.");
  }

  const input = await FileBlob.load(outputPath);
  const verificationWorkbook = await SpreadsheetFile.importXlsx(input);
  await fs.mkdir(previewPath, { recursive: true });

  for (const sheetName of ["Ringkasan", "Rekap Kehadiran", "Detail Izin"]) {
    const preview = await verificationWorkbook.render({
      sheetName,
      autoCrop: "all",
      scale: 1.25,
      format: "png",
    });
    const previewFilename = `${sheetName.toLowerCase().replaceAll(" ", "-")}.png`;
    await fs.writeFile(
      path.join(previewPath, previewFilename),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }

  const inspection = await verificationWorkbook.inspect({
    kind: "table",
    range: "Ringkasan!A1:J20",
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 10,
  });
  const errors = await verificationWorkbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "attendance export formula error scan",
  });
  process.stdout.write(
    `${JSON.stringify({
      inspection: inspection.ndjson,
      formulaErrors: errors.ndjson,
    })}\n`,
  );
  process.exit(0);
}

if (!inputPath || !outputPath) {
  throw new Error("Input JSON dan output XLSX wajib diberikan.");
}

const report = JSON.parse(await fs.readFile(inputPath, "utf8"));
const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("Ringkasan");
const recapSheet = workbook.worksheets.add("Rekap Kehadiran");
const excuseSheet = workbook.worksheets.add("Detail Izin");

const colors = {
  navy: "#0B235F",
  blue: "#2D72E8",
  blueLight: "#DCEAFF",
  orange: "#FF8A34",
  orangeLight: "#FFE0C2",
  green: "#BAF7C7",
  red: "#FFD2D2",
  yellow: "#FFF0A8",
  paper: "#F7F7F4",
  white: "#FFFFFF",
  ink: "#141414",
  muted: "#646464",
  line: "#D4D7DE",
};

function columnName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function statusLabel(status) {
  return {
    PRESENT: "Hadir",
    EXCUSED: "Izin",
    ABSENT: "Tidak hadir",
    MISSING: "Belum mengisi",
    NOT_ENROLLED: "-",
  }[status];
}

function formatDateLabel(dateKey) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function styleTitle(sheet, range, title) {
  sheet.mergeCells(range);
  sheet.getRange(range).values = [[title]];
  sheet.getRange(range).format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 18 },
    wrapText: true,
  };
  sheet.getRange(range).format.rowHeight = 34;
}

for (const sheet of [summarySheet, recapSheet, excuseSheet]) {
  sheet.showGridLines = false;
}

const agendaCount = Math.max(report.agendaDates.length, 1);
const agendaStartIndex = 5;
const agendaEndIndex = agendaStartIndex + agendaCount - 1;
const totalStartIndex = agendaEndIndex + 1;
const lastColumnIndex = totalStartIndex + 5;
const agendaStartColumn = columnName(agendaStartIndex);
const agendaEndColumn = columnName(agendaEndIndex);
const totalPresentColumn = columnName(totalStartIndex);
const totalExcusedColumn = columnName(totalStartIndex + 1);
const totalAbsentColumn = columnName(totalStartIndex + 2);
const totalAgendaColumn = columnName(totalStartIndex + 3);
const rateColumn = columnName(totalStartIndex + 4);
const activityColumn = columnName(totalStartIndex + 5);
const lastColumn = columnName(lastColumnIndex);
const memberStartRow = 5;
const memberEndRow = Math.max(memberStartRow, memberStartRow + report.members.length - 1);

styleTitle(
  recapSheet,
  `A1:${lastColumn}1`,
  `REKAP KEHADIRAN EKSTRAKURIKULER — ${report.name.toUpperCase()}`,
);
recapSheet.mergeCells(`A2:${lastColumn}2`);
recapSheet.getRange(`A2:${lastColumn}2`).values = [[
  `Periode ${formatDateLabel(report.startDate)} s.d. ${formatDateLabel(
    report.throughDate,
  )} • Dibuat ${formatDateLabel(report.throughDate)} • EXISEL SMKN 69 Jakarta`,
]];
recapSheet.getRange(`A2:${lastColumn}2`).format = {
  fill: colors.blueLight,
  font: { color: colors.navy, bold: true },
  wrapText: true,
};
recapSheet.mergeCells(`A3:${lastColumn}3`);
recapSheet.getRange(`A3:${lastColumn}3`).values = [[
  report.scheduleLabel || "Jadwal belum tersedia",
]];
recapSheet.getRange(`A3:${lastColumn}3`).format = {
  fill: colors.paper,
  font: { color: colors.muted },
};

const recapHeaders = ["No", "NIS", "Nama siswa", "Kelas", "Tanggal bergabung"];
if (report.agendaDates.length > 0) {
  recapHeaders.push(...report.agendaDates.map((dateKey) => formatDateLabel(dateKey)));
} else {
  recapHeaders.push("Belum ada agenda");
}
recapHeaders.push(
  "Hadir",
  "Izin",
  "Tidak hadir",
  "Total agenda",
  "Tingkat kehadiran",
  "Keaktifan",
);
recapSheet.getRange(`A4:${lastColumn}4`).values = [recapHeaders];
recapSheet.getRange(`A4:${lastColumn}4`).format = {
  fill: colors.blue,
  font: { bold: true, color: colors.white },
  wrapText: true,
  borders: { preset: "outside", style: "medium", color: colors.navy },
};
recapSheet.getRange(`A4:${lastColumn}4`).format.rowHeight = 34;

if (report.members.length > 0) {
  const recapValues = report.members.map((member, index) => {
    const values = [
      index + 1,
      member.nis ?? "-",
      member.name,
      member.className ?? "-",
      new Date(`${member.enrolledAt}T00:00:00.000Z`),
    ];
    if (report.agendaDates.length > 0) {
      values.push(...member.statuses.map((entry) => statusLabel(entry.status)));
    } else {
      values.push("-");
    }
    return values;
  });
  recapSheet
    .getRange(`A${memberStartRow}:${agendaEndColumn}${memberEndRow}`)
    .values = recapValues;

  const formulas = report.members.map((_, index) => {
    const row = memberStartRow + index;
    const agendaRange = `${agendaStartColumn}${row}:${agendaEndColumn}${row}`;
    return [
      `=COUNTIF(${agendaRange},"Hadir")`,
      `=COUNTIF(${agendaRange},"Izin")`,
      `=COUNTIF(${agendaRange},"Tidak hadir")`,
      `=COUNTIF(${agendaRange},"Hadir")+COUNTIF(${agendaRange},"Izin")+COUNTIF(${agendaRange},"Tidak hadir")+COUNTIF(${agendaRange},"Belum mengisi")`,
      `=IF(${totalAgendaColumn}${row}=0,0,${totalPresentColumn}${row}/${totalAgendaColumn}${row})`,
      `=IF(${totalAgendaColumn}${row}=0,"Belum ada agenda",IF(${rateColumn}${row}>=0.8,"Sangat aktif",IF(${rateColumn}${row}>=0.6,"Aktif",IF(${rateColumn}${row}>=0.4,"Perlu ditingkatkan","Perlu perhatian"))))`,
    ];
  });
  recapSheet
    .getRange(`${totalPresentColumn}${memberStartRow}:${activityColumn}${memberEndRow}`)
    .formulas = formulas;
} else {
  recapSheet.mergeCells(`A5:${lastColumn}6`);
  recapSheet.getRange(`A5:${lastColumn}6`).values = [[
    "Belum ada siswa aktif yang terdaftar pada ekstrakurikuler ini.",
  ]];
  recapSheet.getRange(`A5:${lastColumn}6`).format = {
    fill: colors.paper,
    font: { bold: true, color: colors.muted },
    wrapText: true,
  };
}

const recapDataEndRow = report.members.length > 0 ? memberEndRow : 6;
recapSheet.getRange(`A5:${lastColumn}${recapDataEndRow}`).format.borders = {
  insideHorizontal: { style: "thin", color: colors.line },
  bottom: { style: "medium", color: colors.navy },
};
recapSheet.getRange(`B5:B${recapDataEndRow}`).format.numberFormat = "@";
recapSheet.getRange(`E5:E${recapDataEndRow}`).format.numberFormat = "dd-mmm-yyyy";
recapSheet
  .getRange(`${rateColumn}5:${rateColumn}${recapDataEndRow}`)
  .format.numberFormat = "0.0%";
recapSheet.getRange(`A1:A${recapDataEndRow}`).format.columnWidth = 6;
recapSheet.getRange(`B1:B${recapDataEndRow}`).format.columnWidth = 16;
recapSheet.getRange(`C1:C${recapDataEndRow}`).format.columnWidth = 28;
recapSheet.getRange(`D1:D${recapDataEndRow}`).format.columnWidth = 14;
recapSheet.getRange(`E1:E${recapDataEndRow}`).format.columnWidth = 16;
recapSheet
  .getRange(`${agendaStartColumn}1:${agendaEndColumn}${recapDataEndRow}`)
  .format.columnWidth = 15;
recapSheet
  .getRange(`${totalPresentColumn}1:${totalAgendaColumn}${recapDataEndRow}`)
  .format.columnWidth = 13;
recapSheet
  .getRange(`${rateColumn}1:${rateColumn}${recapDataEndRow}`)
  .format.columnWidth = 18;
recapSheet
  .getRange(`${activityColumn}1:${activityColumn}${recapDataEndRow}`)
  .format.columnWidth = 20;
recapSheet.freezePanes.freezeRows(4);
recapSheet.freezePanes.freezeColumns(5);

if (report.members.length > 0) {
  const statusRange = recapSheet.getRange(
    `${agendaStartColumn}${memberStartRow}:${agendaEndColumn}${memberEndRow}`,
  );
  statusRange.conditionalFormats.add("containsText", {
    text: "Hadir",
    format: { fill: colors.green, font: { color: colors.ink } },
  });
  statusRange.conditionalFormats.add("containsText", {
    text: "Izin",
    format: { fill: colors.orangeLight, font: { color: colors.ink } },
  });
  statusRange.conditionalFormats.add("containsText", {
    text: "Tidak hadir",
    format: { fill: colors.red, font: { color: colors.ink } },
  });
  statusRange.conditionalFormats.add("containsText", {
    text: "Belum mengisi",
    format: { fill: colors.yellow, font: { color: colors.ink } },
  });
  recapSheet
    .getRange(`${rateColumn}${memberStartRow}:${rateColumn}${memberEndRow}`)
    .conditionalFormats.add("dataBar", {
      color: colors.blue,
      thresholds: [0, 1],
      gradient: true,
    });
}

styleTitle(summarySheet, "A1:J1", `LAPORAN KEAKTIFAN — ${report.name.toUpperCase()}`);
summarySheet.mergeCells("A2:J2");
summarySheet.getRange("A2:J2").values = [[
  `Ringkasan anggota dan kehadiran sampai ${formatDateLabel(report.throughDate)}`,
]];
summarySheet.getRange("A2:J2").format = {
  fill: colors.blueLight,
  font: { bold: true, color: colors.navy },
};
summarySheet.getRange("A4:F4").values = [[
  "Anggota",
  "Agenda",
  "Jumlah hadir",
  "Izin",
  "Tidak hadir",
  "Tingkat kehadiran",
]];
summarySheet.getRange("A4:F4").format = {
  fill: colors.navy,
  font: { bold: true, color: colors.white },
  wrapText: true,
};

const recapFormulaEndRow = report.members.length > 0 ? memberEndRow : memberStartRow;
summarySheet.getRange("A5:F5").formulas = [[
  `=COUNTA('Rekap Kehadiran'!$C$${memberStartRow}:$C$${recapFormulaEndRow})`,
  report.agendaDates.length > 0
    ? `=COUNTA('Rekap Kehadiran'!$${agendaStartColumn}$4:$${agendaEndColumn}$4)`
    : "=0",
  `=SUM('Rekap Kehadiran'!$${totalPresentColumn}$${memberStartRow}:$${totalPresentColumn}$${recapFormulaEndRow})`,
  `=SUM('Rekap Kehadiran'!$${totalExcusedColumn}$${memberStartRow}:$${totalExcusedColumn}$${recapFormulaEndRow})`,
  `=SUM('Rekap Kehadiran'!$${totalAbsentColumn}$${memberStartRow}:$${totalAbsentColumn}$${recapFormulaEndRow})`,
  `=IF(SUM('Rekap Kehadiran'!$${totalAgendaColumn}$${memberStartRow}:$${totalAgendaColumn}$${recapFormulaEndRow})=0,0,C5/SUM('Rekap Kehadiran'!$${totalAgendaColumn}$${memberStartRow}:$${totalAgendaColumn}$${recapFormulaEndRow}))`,
]];
summarySheet.getRange("A5:F5").format = {
  fill: colors.orange,
  font: { bold: true, color: colors.ink, size: 14 },
  borders: { preset: "outside", style: "medium", color: colors.navy },
};
summarySheet.getRange("A5:E5").format.numberFormat = "#,##0";
summarySheet.getRange("F5").format.numberFormat = "0.0%";

summarySheet.getRange("A8:J8").values = [[
  "No",
  "NIS",
  "Nama siswa",
  "Kelas",
  "Hadir",
  "Izin",
  "Tidak hadir",
  "Total agenda",
  "Tingkat kehadiran",
  "Keaktifan",
]];
summarySheet.getRange("A8:J8").format = {
  fill: colors.blue,
  font: { bold: true, color: colors.white },
  wrapText: true,
};
const summaryStartRow = 9;
const summaryEndRow = Math.max(summaryStartRow, summaryStartRow + report.members.length - 1);
if (report.members.length > 0) {
  summarySheet.getRange(`A${summaryStartRow}:D${summaryEndRow}`).values =
    report.members.map((member, index) => [
      index + 1,
      member.nis ?? "-",
      member.name,
      member.className ?? "-",
    ]);
  summarySheet.getRange(`E${summaryStartRow}:J${summaryEndRow}`).formulas =
    report.members.map((_, index) => {
      const recapRow = memberStartRow + index;
      return [
        `='Rekap Kehadiran'!${totalPresentColumn}${recapRow}`,
        `='Rekap Kehadiran'!${totalExcusedColumn}${recapRow}`,
        `='Rekap Kehadiran'!${totalAbsentColumn}${recapRow}`,
        `='Rekap Kehadiran'!${totalAgendaColumn}${recapRow}`,
        `='Rekap Kehadiran'!${rateColumn}${recapRow}`,
        `='Rekap Kehadiran'!${activityColumn}${recapRow}`,
      ];
    });
} else {
  summarySheet.mergeCells("A9:J10");
  summarySheet.getRange("A9:J10").values = [["Belum ada anggota untuk dianalisis."]];
  summarySheet.getRange("A9:J10").format = {
    fill: colors.paper,
    font: { bold: true, color: colors.muted },
  };
}
const summaryDataEndRow = report.members.length > 0 ? summaryEndRow : 10;
summarySheet.getRange(`A9:J${summaryDataEndRow}`).format.borders = {
  insideHorizontal: { style: "thin", color: colors.line },
  bottom: { style: "medium", color: colors.navy },
};
summarySheet.getRange(`B9:B${summaryDataEndRow}`).format.numberFormat = "@";
summarySheet.getRange(`I9:I${summaryDataEndRow}`).format.numberFormat = "0.0%";
summarySheet.getRange(`A1:A${summaryDataEndRow}`).format.columnWidth = 12;
summarySheet.getRange(`B1:B${summaryDataEndRow}`).format.columnWidth = 16;
summarySheet.getRange(`C1:C${summaryDataEndRow}`).format.columnWidth = 28;
summarySheet.getRange(`D1:D${summaryDataEndRow}`).format.columnWidth = 14;
summarySheet.getRange(`E1:H${summaryDataEndRow}`).format.columnWidth = 13;
summarySheet.getRange(`I1:I${summaryDataEndRow}`).format.columnWidth = 18;
summarySheet.getRange(`J1:J${summaryDataEndRow}`).format.columnWidth = 20;
summarySheet.freezePanes.freezeRows(8);

if (report.members.length > 0) {
  summarySheet
    .getRange(`I${summaryStartRow}:I${summaryEndRow}`)
    .conditionalFormats.add("colorScale", {
      colors: [colors.red, colors.yellow, colors.green],
      thresholds: [0, 0.6, 1],
    });
}

styleTitle(excuseSheet, "A1:F1", `DETAIL IZIN — ${report.name.toUpperCase()}`);
excuseSheet.mergeCells("A2:F2");
excuseSheet.getRange("A2:F2").values = [[
  "Daftar alasan izin yang dikirim siswa pada setiap agenda.",
]];
excuseSheet.getRange("A2:F2").format = {
  fill: colors.orangeLight,
  font: { bold: true, color: colors.ink },
};
excuseSheet.getRange("A4:F4").values = [[
  "No",
  "Tanggal",
  "NIS",
  "Nama siswa",
  "Kelas",
  "Alasan izin",
]];
excuseSheet.getRange("A4:F4").format = {
  fill: colors.blue,
  font: { bold: true, color: colors.white },
};
const excuseRows = report.members.flatMap((member) =>
  member.statuses
    .filter((entry) => entry.status === "EXCUSED")
    .map((entry) => ({ member, entry })),
);
if (excuseRows.length > 0) {
  excuseSheet.getRange(`A5:F${4 + excuseRows.length}`).values = excuseRows.map(
    ({ member, entry }, index) => [
      index + 1,
      new Date(`${entry.dateKey}T00:00:00.000Z`),
      member.nis ?? "-",
      member.name,
      member.className ?? "-",
      entry.reason ?? "Tanpa alasan",
    ],
  );
} else {
  excuseSheet.mergeCells("A5:F6");
  excuseSheet.getRange("A5:F6").values = [["Belum ada catatan izin."]];
  excuseSheet.getRange("A5:F6").format = {
    fill: colors.paper,
    font: { bold: true, color: colors.muted },
  };
}
const excuseEndRow = excuseRows.length > 0 ? 4 + excuseRows.length : 6;
excuseSheet.getRange(`A5:F${excuseEndRow}`).format.borders = {
  insideHorizontal: { style: "thin", color: colors.line },
  bottom: { style: "medium", color: colors.navy },
};
excuseSheet.getRange(`B5:B${excuseEndRow}`).format.numberFormat = "dd-mmm-yyyy";
excuseSheet.getRange(`C5:C${excuseEndRow}`).format.numberFormat = "@";
excuseSheet.getRange(`A1:A${excuseEndRow}`).format.columnWidth = 6;
excuseSheet.getRange(`B1:B${excuseEndRow}`).format.columnWidth = 16;
excuseSheet.getRange(`C1:C${excuseEndRow}`).format.columnWidth = 16;
excuseSheet.getRange(`D1:D${excuseEndRow}`).format.columnWidth = 28;
excuseSheet.getRange(`E1:E${excuseEndRow}`).format.columnWidth = 14;
excuseSheet.getRange(`F1:F${excuseEndRow}`).format.columnWidth = 48;
excuseSheet.getRange(`F5:F${excuseEndRow}`).format.wrapText = true;
excuseSheet.freezePanes.freezeRows(4);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

if (previewPath) {
  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  const preview = await workbook.render({
    sheetName: "Ringkasan",
    range: `A1:J${Math.min(summaryDataEndRow, 22)}`,
    scale: 1.5,
    format: "png",
  });
  await fs.writeFile(
    previewPath,
    new Uint8Array(await preview.arrayBuffer()),
  );

  const inspection = await workbook.inspect({
    kind: "table",
    range: `Ringkasan!A1:J${Math.min(summaryDataEndRow, 20)}`,
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 10,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "attendance export formula error scan",
  });
  process.stdout.write(
    `${JSON.stringify({
      inspection: inspection.ndjson,
      formulaErrors: errors.ndjson,
    })}\n`,
  );
}
