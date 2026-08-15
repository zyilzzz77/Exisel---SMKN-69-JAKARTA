import ExcelJS from "exceljs";

export interface AttendanceExportSchedule {
  day: string;
  startTime: Date;
  endTime: Date;
  location: string;
}

export interface AttendanceExportStatus {
  dateKey: string;
  status: "PRESENT" | "EXCUSED" | "ABSENT" | "MISSING" | "NOT_ENROLLED";
  reason?: string | null;
}

export interface AttendanceExportMember {
  userId: string;
  name: string;
  nis?: string | null;
  className?: string | null;
  enrolledAt: string;
  statuses: AttendanceExportStatus[];
}

export interface AttendanceExportReport {
  id: string;
  name: string;
  throughDate: string;
  startDate: string;
  scheduleLabel: string;
  agendaDates: string[];
  schedules: AttendanceExportSchedule[];
  members: AttendanceExportMember[];
}

const colors = {
  navy: "FF0B235F",
  blue: "FF2D72E8",
  blueLight: "FFDCEAFF",
  orange: "FFFF8A34",
  orangeLight: "FFFFE0C2",
  green: "FFBAF7C7",
  red: "FFFFD2D2",
  yellow: "FFFFF0A8",
  paper: "FFF7F7F4",
  white: "FFFFFFFF",
  ink: "FF141414",
  muted: "FF646464",
  line: "FFD4D7DE",
};

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

function statusLabel(status: AttendanceExportStatus["status"]): string {
  switch (status) {
    case "PRESENT":
      return "Hadir";
    case "EXCUSED":
      return "Izin";
    case "ABSENT":
      return "Tidak hadir";
    case "MISSING":
      return "Belum mengisi";
    case "NOT_ENROLLED":
      return "-";
    default:
      return "-";
  }
}

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function styleTitle(
  sheet: ExcelJS.Worksheet,
  startCol: number,
  endCol: number,
  row: number,
  title: string,
) {
  sheet.mergeCells(row, startCol, row, endCol);
  const cell = sheet.getCell(row, startCol);
  cell.value = title;
  cell.font = { name: "Arial", bold: true, color: { argb: colors.white }, size: 16 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  sheet.getRow(row).height = 36;
}

function addSignatureBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endCol: number,
  extracurricularName: string,
) {
  const signatureRows = {
    cityAndDate: startRow,
    role: startRow + 1,
    spaceStart: startRow + 2,
    spaceEnd: startRow + 4,
    name: startRow + 5,
    identity: startRow + 6,
  };

  for (let row = signatureRows.cityAndDate; row <= signatureRows.identity; row++) {
    sheet.getRow(row).height = row >= signatureRows.spaceStart && row <= signatureRows.spaceEnd
      ? 20
      : 18;
  }

  for (const row of [
    signatureRows.cityAndDate,
    signatureRows.role,
    signatureRows.name,
    signatureRows.identity,
  ]) {
    sheet.mergeCells(row, startCol, row, endCol);
  }

  const cityAndDateCell = sheet.getCell(signatureRows.cityAndDate, startCol);
  cityAndDateCell.value = "____________________, ____ ____________________ 20____";
  cityAndDateCell.font = { name: "Arial", color: { argb: colors.ink }, size: 10 };
  cityAndDateCell.alignment = { horizontal: "center", vertical: "middle" };

  const roleCell = sheet.getCell(signatureRows.role, startCol);
  roleCell.value = `Penanggung Jawab Ekstrakurikuler ${extracurricularName}`;
  roleCell.font = { name: "Arial", bold: true, color: { argb: colors.ink }, size: 10 };
  roleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  const nameCell = sheet.getCell(signatureRows.name, startCol);
  nameCell.value = "(________________________________________)";
  nameCell.font = { name: "Arial", color: { argb: colors.ink }, size: 10 };
  nameCell.alignment = { horizontal: "center", vertical: "middle" };

  const identityCell = sheet.getCell(signatureRows.identity, startCol);
  identityCell.value = "NIP/NIK: ________________________________";
  identityCell.font = { name: "Arial", color: { argb: colors.ink }, size: 10 };
  identityCell.alignment = { horizontal: "center", vertical: "middle" };

  return signatureRows.identity;
}

function configureA4Print(
  sheet: ExcelJS.Worksheet,
  printArea: string,
  printTitlesRow: string,
) {
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = "landscape";
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.pageOrder = "downThenOver";
  sheet.pageSetup.horizontalCentered = true;
  sheet.pageSetup.showGridLines = false;
  sheet.pageSetup.margins = {
    left: 0.35,
    right: 0.35,
    top: 0.45,
    bottom: 0.45,
    header: 0.2,
    footer: 0.25,
  };
  sheet.pageSetup.printArea = printArea;
  sheet.pageSetup.printTitlesRow = printTitlesRow;
  sheet.headerFooter.oddFooter =
    "&LEXISEL — SMKN 69 Jakarta&RHalaman &P dari &N";
}

export async function buildAttendanceExcelBuffer(
  report: AttendanceExportReport,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EXISEL SMKN 69 Jakarta";
  workbook.lastModifiedBy = "EXISEL SMKN 69 Jakarta";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Ringkasan", {
    views: [{ showGridLines: true }],
  });
  const recapSheet = workbook.addWorksheet("Rekap Kehadiran", {
    views: [{ showGridLines: true }],
  });
  const excuseSheet = workbook.addWorksheet("Detail Izin", {
    views: [{ showGridLines: true }],
  });

  const agendaCount = Math.max(report.agendaDates.length, 1);
  const agendaStartIndex = 6; // 1-based: Col F
  const agendaEndIndex = agendaStartIndex + agendaCount - 1;
  const totalStartIndex = agendaEndIndex + 1;
  const lastColumnIndex = totalStartIndex + 5;

  const agendaStartColumn = getColumnLetter(agendaStartIndex);
  const agendaEndColumn = getColumnLetter(agendaEndIndex);
  const totalPresentColumn = getColumnLetter(totalStartIndex);
  const totalExcusedColumn = getColumnLetter(totalStartIndex + 1);
  const totalAbsentColumn = getColumnLetter(totalStartIndex + 2);
  const totalAgendaColumn = getColumnLetter(totalStartIndex + 3);
  const rateColumn = getColumnLetter(totalStartIndex + 4);
  const activityColumn = getColumnLetter(totalStartIndex + 5);
  const lastColumn = getColumnLetter(lastColumnIndex);

  const memberStartRow = 5;
  const memberEndRow = Math.max(
    memberStartRow,
    memberStartRow + report.members.length - 1,
  );

  // ----------------------------------------------------
  // 1. REKAP KEHADIRAN SHEET
  // ----------------------------------------------------
  styleTitle(
    recapSheet,
    1,
    lastColumnIndex,
    1,
    `REKAP KEHADIRAN EKSTRAKURIKULER — ${report.name.toUpperCase()}`,
  );

  recapSheet.mergeCells(2, 1, 2, lastColumnIndex);
  const recapSubCell = recapSheet.getCell(2, 1);
  recapSubCell.value = `Periode ${formatDateLabel(
    report.startDate,
  )} s.d. ${formatDateLabel(report.throughDate)} • Dibuat ${formatDateLabel(
    report.throughDate,
  )} • EXISEL SMKN 69 Jakarta`;
  recapSubCell.font = { name: "Arial", bold: true, color: { argb: colors.navy } };
  recapSubCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blueLight } };
  recapSubCell.alignment = { vertical: "middle", wrapText: true };
  recapSheet.getRow(2).height = 26;

  recapSheet.mergeCells(3, 1, 3, lastColumnIndex);
  const recapSchedCell = recapSheet.getCell(3, 1);
  recapSchedCell.value = report.scheduleLabel || "Jadwal belum tersedia";
  recapSchedCell.font = { name: "Arial", color: { argb: colors.muted } };
  recapSchedCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.paper } };
  recapSchedCell.alignment = { vertical: "middle", wrapText: true };
  recapSheet.getRow(3).height = 22;

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

  const recapHeaderRow = recapSheet.getRow(4);
  recapHeaderRow.height = 34;
  recapHeaders.forEach((headerText, idx) => {
    const cell = recapHeaderRow.getCell(idx + 1);
    cell.value = headerText;
    cell.font = { name: "Arial", bold: true, color: { argb: colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: colors.navy } },
      bottom: { style: "medium", color: { argb: colors.navy } },
      left: { style: "thin", color: { argb: colors.white } },
      right: { style: "thin", color: { argb: colors.white } },
    };
  });

  if (report.members.length > 0) {
    report.members.forEach((member, mIdx) => {
      const rowNum = memberStartRow + mIdx;
      const row = recapSheet.getRow(rowNum);
      row.height = 22;

      const enrolledDate = new Date(`${member.enrolledAt}T00:00:00.000Z`);

      row.getCell(1).value = mIdx + 1; // No
      row.getCell(1).alignment = { horizontal: "center" };

      row.getCell(2).value = member.nis ?? "-"; // NIS
      row.getCell(2).numFmt = "@";
      row.getCell(2).alignment = { horizontal: "center" };

      row.getCell(3).value = member.name; // Nama
      row.getCell(4).value = member.className ?? "-"; // Kelas
      row.getCell(4).alignment = { horizontal: "center" };

      row.getCell(5).value = enrolledDate; // Enrolled At
      row.getCell(5).numFmt = "dd-mmm-yyyy";
      row.getCell(5).alignment = { horizontal: "center" };

      let colIdx = 6;
      if (report.agendaDates.length > 0) {
        member.statuses.forEach((entry) => {
          const statusText = statusLabel(entry.status);
          const cell = row.getCell(colIdx);
          cell.value = statusText;
          cell.alignment = { horizontal: "center" };

          if (entry.status === "PRESENT") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.green } };
          } else if (entry.status === "EXCUSED") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.orangeLight } };
          } else if (entry.status === "ABSENT") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.red } };
          } else if (entry.status === "MISSING") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.yellow } };
          }
          colIdx++;
        });
      } else {
        const cell = row.getCell(colIdx);
        cell.value = "-";
        cell.alignment = { horizontal: "center" };
        colIdx++;
      }

      const agendaRange = `${agendaStartColumn}${rowNum}:${agendaEndColumn}${rowNum}`;

      // Formulas
      const presentCell = row.getCell(totalStartIndex);
      presentCell.value = { formula: `COUNTIF(${agendaRange},"Hadir")` };
      presentCell.alignment = { horizontal: "center" };

      const excusedCell = row.getCell(totalStartIndex + 1);
      excusedCell.value = { formula: `COUNTIF(${agendaRange},"Izin")` };
      excusedCell.alignment = { horizontal: "center" };

      const absentCell = row.getCell(totalStartIndex + 2);
      absentCell.value = { formula: `COUNTIF(${agendaRange},"Tidak hadir")` };
      absentCell.alignment = { horizontal: "center" };

      const totalAgendaCell = row.getCell(totalStartIndex + 3);
      totalAgendaCell.value = {
        formula: `COUNTIF(${agendaRange},"Hadir")+COUNTIF(${agendaRange},"Izin")+COUNTIF(${agendaRange},"Tidak hadir")+COUNTIF(${agendaRange},"Belum mengisi")`,
      };
      totalAgendaCell.alignment = { horizontal: "center" };

      const rateCell = row.getCell(totalStartIndex + 4);
      rateCell.value = {
        formula: `IF(${totalAgendaColumn}${rowNum}=0,0,${totalPresentColumn}${rowNum}/${totalAgendaColumn}${rowNum})`,
      };
      rateCell.numFmt = "0.0%";
      rateCell.alignment = { horizontal: "right" };

      const actCell = row.getCell(totalStartIndex + 5);
      actCell.value = {
        formula: `IF(${totalAgendaColumn}${rowNum}=0,"Belum ada agenda",IF(${rateColumn}${rowNum}>=0.8,"Sangat aktif",IF(${rateColumn}${rowNum}>=0.6,"Aktif",IF(${rateColumn}${rowNum}>=0.4,"Perlu ditingkatkan","Perlu perhatian"))))`,
      };
      actCell.alignment = { horizontal: "center" };

      for (let c = 1; c <= lastColumnIndex; c++) {
        const cell = row.getCell(c);
        cell.border = {
          bottom: { style: "thin", color: { argb: colors.line } },
          left: { style: "thin", color: { argb: colors.line } },
          right: { style: "thin", color: { argb: colors.line } },
        };
      }
    });
  } else {
    recapSheet.mergeCells(5, 1, 6, lastColumnIndex);
    const emptyCell = recapSheet.getCell(5, 1);
    emptyCell.value = "Belum ada siswa aktif yang terdaftar pada ekstrakurikuler ini.";
    emptyCell.font = { name: "Arial", bold: true, color: { argb: colors.muted } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.paper } };
    emptyCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  // Column widths for Recap Sheet
  recapSheet.getColumn(1).width = 8;
  recapSheet.getColumn(2).width = 16;
  recapSheet.getColumn(3).width = 32;
  recapSheet.getColumn(4).width = 14;
  recapSheet.getColumn(5).width = 18;
  for (let c = agendaStartIndex; c <= agendaEndIndex; c++) {
    recapSheet.getColumn(c).width = 16;
  }
  recapSheet.getColumn(totalStartIndex).width = 14; // Hadir
  recapSheet.getColumn(totalStartIndex + 1).width = 14; // Izin
  recapSheet.getColumn(totalStartIndex + 2).width = 16; // Tidak hadir
  recapSheet.getColumn(totalStartIndex + 3).width = 16; // Total agenda
  recapSheet.getColumn(totalStartIndex + 4).width = 20; // Tingkat kehadiran
  recapSheet.getColumn(totalStartIndex + 5).width = 22; // Keaktifan

  const recapDataEndRow = report.members.length > 0 ? memberEndRow : 6;
  const recapSignatureStartCol = Math.max(6, Math.ceil(lastColumnIndex * 0.58));
  const recapPrintEndRow = addSignatureBlock(
    recapSheet,
    recapDataEndRow + 3,
    recapSignatureStartCol,
    lastColumnIndex,
    report.name,
  );
  configureA4Print(
    recapSheet,
    `A1:${lastColumn}${recapPrintEndRow}`,
    "1:4",
  );

  recapSheet.views = [
    { state: "frozen", xSplit: 5, ySplit: 4, showGridLines: true },
  ];

  // ----------------------------------------------------
  // 2. RINGKASAN SHEET
  // ----------------------------------------------------
  styleTitle(
    summarySheet,
    1,
    10,
    1,
    `LAPORAN KEAKTIFAN — ${report.name.toUpperCase()}`,
  );

  summarySheet.mergeCells(2, 1, 2, 10);
  const sumSubCell = summarySheet.getCell(2, 1);
  sumSubCell.value = `Ringkasan anggota dan kehadiran sampai ${formatDateLabel(
    report.throughDate,
  )}`;
  sumSubCell.font = { name: "Arial", bold: true, color: { argb: colors.navy } };
  sumSubCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blueLight } };
  sumSubCell.alignment = { vertical: "middle", wrapText: true };
  summarySheet.getRow(2).height = 26;

  // Set column widths for Summary Sheet FIRST so stat card merges take effect cleanly
  summarySheet.getColumn(1).width = 8;  // A: No
  summarySheet.getColumn(2).width = 16; // B: NIS
  summarySheet.getColumn(3).width = 32; // C: Nama siswa
  summarySheet.getColumn(4).width = 14; // D: Kelas
  summarySheet.getColumn(5).width = 14; // E: Hadir
  summarySheet.getColumn(6).width = 14; // F: Izin
  summarySheet.getColumn(7).width = 16; // G: Tidak hadir
  summarySheet.getColumn(8).width = 16; // H: Total agenda
  summarySheet.getColumn(9).width = 20; // I: Tingkat kehadiran
  summarySheet.getColumn(10).width = 22; // J: Keaktifan

  // Define 6 Stat Cards merged across columns A..J:
  // Card 1: Anggota -> Merge A4:B4 (Header) and A5:B5 (Value). Width = 8+16 = 24
  // Card 2: Agenda  -> Merge C4:D4 (Header) and C5:D5 (Value). Width = 32+14 = 46
  // Card 3: Jumlah hadir -> E4:E4 & E5:E5. Width = 14
  // Card 4: Izin        -> F4:F4 & F5:F5. Width = 14
  // Card 5: Tidak hadir -> G4:G4 & G5:G5. Width = 16
  // Card 6: Tingkat kehadiran -> Merge H4:J4 & H5:J5. Width = 16+20+22 = 58
  const cardRanges = [
    { startCol: 1, endCol: 2, title: "Anggota" },
    { startCol: 3, endCol: 4, title: "Agenda" },
    { startCol: 5, endCol: 5, title: "Jumlah hadir" },
    { startCol: 6, endCol: 6, title: "Izin" },
    { startCol: 7, endCol: 7, title: "Tidak hadir" },
    { startCol: 8, endCol: 10, title: "Tingkat kehadiran" },
  ];

  summarySheet.getRow(4).height = 30;
  summarySheet.getRow(5).height = 34;

  cardRanges.forEach((card) => {
    if (card.startCol !== card.endCol) {
      summarySheet.mergeCells(4, card.startCol, 4, card.endCol);
      summarySheet.mergeCells(5, card.startCol, 5, card.endCol);
    }
    const hCell = summarySheet.getCell(4, card.startCol);
    hCell.value = card.title;
    hCell.font = { name: "Arial", bold: true, color: { argb: colors.white }, size: 11 };
    hCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.navy } };
    hCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    hCell.border = {
      top: { style: "medium", color: { argb: colors.navy } },
      bottom: { style: "thin", color: { argb: colors.navy } },
      left: { style: "medium", color: { argb: colors.navy } },
      right: { style: "medium", color: { argb: colors.navy } },
    };
  });

  const recapFormulaEndRow =
    report.members.length > 0 ? memberEndRow : memberStartRow;

  // Stat Card Values in Row 5
  // Card 1 (A5:B5): Anggota
  const v1 = summarySheet.getCell(5, 1);
  v1.value = { formula: `=COUNTA('Rekap Kehadiran'!$C$${memberStartRow}:$C$${recapFormulaEndRow})` };
  v1.numFmt = "#,##0";

  // Card 2 (C5:D5): Agenda
  const v2 = summarySheet.getCell(5, 3);
  v2.value =
    report.agendaDates.length > 0
      ? { formula: `=COUNTA('Rekap Kehadiran'!$${agendaStartColumn}$4:$${agendaEndColumn}$4)` }
      : 0;
  v2.numFmt = "#,##0";

  // Card 3 (E5): Jumlah hadir
  const v3 = summarySheet.getCell(5, 5);
  v3.value = {
    formula: `=SUM('Rekap Kehadiran'!$${totalPresentColumn}$${memberStartRow}:$${totalPresentColumn}$${recapFormulaEndRow})`,
  };
  v3.numFmt = "#,##0";

  // Card 4 (F5): Izin
  const v4 = summarySheet.getCell(5, 6);
  v4.value = {
    formula: `=SUM('Rekap Kehadiran'!$${totalExcusedColumn}$${memberStartRow}:$${totalExcusedColumn}$${recapFormulaEndRow})`,
  };
  v4.numFmt = "#,##0";

  // Card 5 (G5): Tidak hadir
  const v5 = summarySheet.getCell(5, 7);
  v5.value = {
    formula: `=SUM('Rekap Kehadiran'!$${totalAbsentColumn}$${memberStartRow}:$${totalAbsentColumn}$${recapFormulaEndRow})`,
  };
  v5.numFmt = "#,##0";

  // Card 6 (H5:J5): Tingkat kehadiran
  const v6 = summarySheet.getCell(5, 8);
  v6.value = {
    formula: `=IF(SUM('Rekap Kehadiran'!$${totalAgendaColumn}$${memberStartRow}:$${totalAgendaColumn}$${recapFormulaEndRow})=0,0,E5/SUM('Rekap Kehadiran'!$${totalAgendaColumn}$${memberStartRow}:$${totalAgendaColumn}$${recapFormulaEndRow}))`,
  };
  v6.numFmt = "0.0%";

  cardRanges.forEach((card) => {
    const vCell = summarySheet.getCell(5, card.startCol);
    vCell.font = { name: "Arial", bold: true, color: { argb: colors.ink }, size: 14 };
    vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.orange } };
    vCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    vCell.border = {
      top: { style: "thin", color: { argb: colors.navy } },
      bottom: { style: "medium", color: { argb: colors.navy } },
      left: { style: "medium", color: { argb: colors.navy } },
      right: { style: "medium", color: { argb: colors.navy } },
    };
  });

  // Table Headers (Row 8)
  const summaryHeaders = [
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
  ];
  const summaryHeaderRow = summarySheet.getRow(8);
  summaryHeaderRow.height = 32;
  summaryHeaders.forEach((text, idx) => {
    const cell = summaryHeaderRow.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: "Arial", bold: true, color: { argb: colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: colors.navy } },
      bottom: { style: "medium", color: { argb: colors.navy } },
      left: { style: "thin", color: { argb: colors.white } },
      right: { style: "thin", color: { argb: colors.white } },
    };
  });

  const summaryStartRow = 9;
  const summaryEndRow = Math.max(
    summaryStartRow,
    summaryStartRow + report.members.length - 1,
  );

  if (report.members.length > 0) {
    report.members.forEach((member, mIdx) => {
      const summaryRow = summaryStartRow + mIdx;
      const recapRow = memberStartRow + mIdx;
      const row = summarySheet.getRow(summaryRow);
      row.height = 22;

      row.getCell(1).value = mIdx + 1; // No
      row.getCell(1).alignment = { horizontal: "center" };

      row.getCell(2).value = member.nis ?? "-"; // NIS
      row.getCell(2).numFmt = "@";
      row.getCell(2).alignment = { horizontal: "center" };

      row.getCell(3).value = member.name; // Nama
      row.getCell(4).value = member.className ?? "-"; // Kelas
      row.getCell(4).alignment = { horizontal: "center" };

      const presentCell = row.getCell(5);
      presentCell.value = { formula: `='Rekap Kehadiran'!${totalPresentColumn}${recapRow}` };
      presentCell.alignment = { horizontal: "center" };

      const excusedCell = row.getCell(6);
      excusedCell.value = { formula: `='Rekap Kehadiran'!${totalExcusedColumn}${recapRow}` };
      excusedCell.alignment = { horizontal: "center" };

      const absentCell = row.getCell(7);
      absentCell.value = { formula: `='Rekap Kehadiran'!${totalAbsentColumn}${recapRow}` };
      absentCell.alignment = { horizontal: "center" };

      const totalCell = row.getCell(8);
      totalCell.value = { formula: `='Rekap Kehadiran'!${totalAgendaColumn}${recapRow}` };
      totalCell.alignment = { horizontal: "center" };

      const rateCell = row.getCell(9);
      rateCell.value = { formula: `='Rekap Kehadiran'!${rateColumn}${recapRow}` };
      rateCell.numFmt = "0.0%";
      rateCell.alignment = { horizontal: "right" };

      const actCell = row.getCell(10);
      actCell.value = { formula: `='Rekap Kehadiran'!${activityColumn}${recapRow}` };
      actCell.alignment = { horizontal: "center" };

      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.border = {
          bottom: { style: "thin", color: { argb: colors.line } },
          left: { style: "thin", color: { argb: colors.line } },
          right: { style: "thin", color: { argb: colors.line } },
        };
      }
    });
  } else {
    summarySheet.mergeCells(9, 1, 10, 10);
    const emptyCell = summarySheet.getCell(9, 1);
    emptyCell.value = "Belum ada anggota untuk dianalisis.";
    emptyCell.font = { name: "Arial", bold: true, color: { argb: colors.muted } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.paper } };
    emptyCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  const summaryDataEndRow = report.members.length > 0 ? summaryEndRow : 10;
  const summaryPrintEndRow = addSignatureBlock(
    summarySheet,
    summaryDataEndRow + 3,
    6,
    10,
    report.name,
  );
  configureA4Print(summarySheet, `A1:J${summaryPrintEndRow}`, "1:8");

  summarySheet.views = [{ state: "frozen", xSplit: 0, ySplit: 8, showGridLines: true }];

  // ----------------------------------------------------
  // 3. DETAIL IZIN SHEET
  // ----------------------------------------------------
  styleTitle(excuseSheet, 1, 6, 1, `DETAIL IZIN — ${report.name.toUpperCase()}`);

  excuseSheet.mergeCells(2, 1, 2, 6);
  const excSubCell = excuseSheet.getCell(2, 1);
  excSubCell.value = "Daftar alasan izin yang dikirim siswa pada setiap agenda.";
  excSubCell.font = { name: "Arial", bold: true, color: { argb: colors.ink } };
  excSubCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.orangeLight } };
  excSubCell.alignment = { vertical: "middle", wrapText: true };
  excuseSheet.getRow(2).height = 26;

  const excuseHeaders = ["No", "Tanggal", "NIS", "Nama siswa", "Kelas", "Alasan izin"];
  const excuseHeaderRow = excuseSheet.getRow(4);
  excuseHeaderRow.height = 32;
  excuseHeaders.forEach((text, idx) => {
    const cell = excuseHeaderRow.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: "Arial", bold: true, color: { argb: colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: colors.navy } },
      bottom: { style: "medium", color: { argb: colors.navy } },
      left: { style: "thin", color: { argb: colors.white } },
      right: { style: "thin", color: { argb: colors.white } },
    };
  });

  const excuseRows = report.members.flatMap((member) =>
    member.statuses
      .filter((entry) => entry.status === "EXCUSED")
      .map((entry) => ({ member, entry })),
  );

  if (excuseRows.length > 0) {
    excuseRows.forEach(({ member, entry }, idx) => {
      const rowNum = 5 + idx;
      const row = excuseSheet.getRow(rowNum);
      row.height = 24;

      row.getCell(1).value = idx + 1; // No
      row.getCell(1).alignment = { horizontal: "center" };

      row.getCell(2).value = new Date(`${entry.dateKey}T00:00:00.000Z`); // Tanggal
      row.getCell(2).numFmt = "dd-mmm-yyyy";
      row.getCell(2).alignment = { horizontal: "center" };

      row.getCell(3).value = member.nis ?? "-"; // NIS
      row.getCell(3).numFmt = "@";
      row.getCell(3).alignment = { horizontal: "center" };

      row.getCell(4).value = member.name; // Nama
      row.getCell(5).value = member.className ?? "-"; // Kelas
      row.getCell(5).alignment = { horizontal: "center" };

      const reasonCell = row.getCell(6); // Alasan
      reasonCell.value = entry.reason ?? "Tanpa alasan";
      reasonCell.alignment = { wrapText: true, vertical: "middle" };

      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.border = {
          bottom: { style: "thin", color: { argb: colors.line } },
          left: { style: "thin", color: { argb: colors.line } },
          right: { style: "thin", color: { argb: colors.line } },
        };
      }
    });
  } else {
    excuseSheet.mergeCells(5, 1, 6, 6);
    const emptyCell = excuseSheet.getCell(5, 1);
    emptyCell.value = "Belum ada catatan izin.";
    emptyCell.font = { name: "Arial", bold: true, color: { argb: colors.muted } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.paper } };
    emptyCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  excuseSheet.getColumn(1).width = 8;
  excuseSheet.getColumn(2).width = 18;
  excuseSheet.getColumn(3).width = 16;
  excuseSheet.getColumn(4).width = 32;
  excuseSheet.getColumn(5).width = 14;
  excuseSheet.getColumn(6).width = 52;

  const excuseDataEndRow = excuseRows.length > 0 ? 4 + excuseRows.length : 6;
  const excusePrintEndRow = addSignatureBlock(
    excuseSheet,
    excuseDataEndRow + 3,
    4,
    6,
    report.name,
  );
  configureA4Print(excuseSheet, `A1:F${excusePrintEndRow}`, "1:4");

  excuseSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 4, showGridLines: true }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
