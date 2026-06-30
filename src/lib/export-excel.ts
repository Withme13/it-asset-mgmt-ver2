// NOTE: This uses `xlsx-js-style` instead of plain `xlsx`.
// Plain SheetJS (community build) silently ignores cell styles (fill colors,
// borders, etc.) — `xlsx-js-style` is a drop-in replacement that adds real
// style support while keeping the same API. Install with:
//   npm install xlsx-js-style
// and remove the old `xlsx` package if nothing else in the project uses it.
import XLSX from "xlsx-js-style";

export type ExcelColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => any);
  width?: number; // column width in "characters" (same unit as SheetJS `wch`)
  /**
   * Optional group name. Columns sharing the same `group` are rendered
   * under one merged header cell on row 1, with their own `header` as the
   * sub-header on row 2 — mirrors "Pengecekan" / "Kategori CIA" in the
   * original Excel report.
   */
  group?: string;
};

// Row fill colors by Status value (matches the original Excel report).
const STATUS_COLORS: Record<string, string> = {
  BACKUP: "FFFFF296", // yellow
  RETIRED: "FFC6E0B4", // green
  BROKEN: "FFBFBFBF", // gray
  // "OK" and anything unlisted falls through to no fill (white)
};

function getStatusColor(row: Record<string, any>): string | null {
  const raw = (row["Status"] ?? row["status"] ?? "").toString().trim().toUpperCase();
  if (!raw) return null;
  if (STATUS_COLORS[raw]) return STATUS_COLORS[raw];
  const found = Object.keys(STATUS_COLORS).find((key) => raw.includes(key));
  return found ? STATUS_COLORS[found] : null;
}

const thinBorder = { style: "thin", color: { rgb: "FFB7B7B7" } };
const thickBorder = { style: "medium", color: { rgb: "FF808080" } };

const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFFFF" }, sz: 10 },
  fill: { fgColor: { rgb: "FF1E293B" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
};

const titleStyle = {
  font: { bold: true, sz: 16 },
  alignment: { horizontal: "center", vertical: "center" },
};

function bodyCellStyle(fillColor: string | null, isGroupStart: boolean) {
  return {
    font: { sz: 10 },
    alignment: { vertical: "center", wrapText: true },
    fill: fillColor ? { fgColor: { rgb: fillColor } } : undefined,
    border: {
      top: thinBorder,
      bottom: thinBorder,
      left: isGroupStart ? thickBorder : thinBorder,
      right: thinBorder,
    },
  };
}

export function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  columns: ExcelColumn<T>[],
  filename: string,
  sheetName = "Sheet1",
  title?: string,
) {
  const hasGroups = columns.some((c) => !!c.group);
  const numCols = columns.length;

  // Track which column indices start a new group (for thicker left border).
  const groupStartCols = new Set<number>();
  {
    let prevGroup: string | undefined = undefined;
    columns.forEach((c, idx) => {
      if (c.group && c.group !== prevGroup) groupStartCols.add(idx);
      prevGroup = c.group;
    });
  }

  // ---- Build the 2D array of rows (AOA) so we control every cell precisely ----
  const aoa: any[][] = [];
  let titleRowIdx = -1;
  let headerRow1Idx = -1;
  let headerRow2Idx = hasGroups ? -1 : -1;
  let dataStartIdx = 0;

  if (title) {
    aoa.push([title, ...Array(numCols - 1).fill("")]);
    titleRowIdx = 0;
  }

  headerRow1Idx = aoa.length;
  if (hasGroups) {
    const row1: any[] = [];
    const row2: any[] = [];
    let i = 0;
    while (i < columns.length) {
      const col = columns[i];
      if (!col.group) {
        row1.push(col.header);
        row2.push("");
        i++;
        continue;
      }
      const groupName = col.group;
      let span = 0;
      while (i + span < columns.length && columns[i + span].group === groupName) span++;
      row1.push(groupName);
      for (let j = 1; j < span; j++) row1.push("");
      for (let j = 0; j < span; j++) row2.push(columns[i + j].header);
      i += span;
    }
    aoa.push(row1);
    headerRow2Idx = aoa.length;
    aoa.push(row2);
  } else {
    aoa.push(columns.map((c) => c.header));
  }
  dataStartIdx = aoa.length;

  rows.forEach((r) => {
    aoa.push(
      columns.map((c) => {
        const v = typeof c.accessor === "function" ? c.accessor(r) : r[c.accessor];
        return v === null || v === undefined || v === "" ? "-" : v;
      }),
    );
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ---- Merges: title row spans all columns; grouped header cells span their columns ----
  ws["!merges"] = ws["!merges"] || [];
  if (title) {
    ws["!merges"].push({ s: { r: titleRowIdx, c: 0 }, e: { r: titleRowIdx, c: numCols - 1 } });
  }
  if (hasGroups) {
    let i = 0;
    while (i < columns.length) {
      const col = columns[i];
      if (!col.group) {
        // ungrouped column: merge vertically across the 2 header rows
        ws["!merges"].push({ s: { r: headerRow1Idx, c: i }, e: { r: headerRow2Idx, c: i } });
        i++;
        continue;
      }
      const groupName = col.group;
      let span = 0;
      while (i + span < columns.length && columns[i + span].group === groupName) span++;
      if (span > 1) {
        ws["!merges"].push({ s: { r: headerRow1Idx, c: i }, e: { r: headerRow1Idx, c: i + span - 1 } });
      }
      i += span;
    }
  }

  // ---- Column widths ----
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 14 }));

  // ---- Row heights: a bit taller for title/header rows ----
  ws["!rows"] = aoa.map((_, idx) => {
    if (idx === titleRowIdx) return { hpt: 26 };
    if (idx === headerRow1Idx || idx === headerRow2Idx) return { hpt: 28 };
    return { hpt: 18 };
  });

  // ---- Apply styles cell by cell ----
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < numCols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };

      if (r === titleRowIdx) {
        ws[ref].s = titleStyle;
      } else if (r === headerRow1Idx || r === headerRow2Idx) {
        ws[ref].s = headerStyle;
      } else {
        const dataRowIndex = r - dataStartIdx;
        const rowData = rows[dataRowIndex] as Record<string, any>;
        const fillColor = rowData ? getStatusColor(rowData) : null;
        ws[ref].s = bodyCellStyle(fillColor, groupStartCols.has(c));
      }
    }
  }

  const totalRows = aoa.length - 1;
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: numCols - 1 } });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}