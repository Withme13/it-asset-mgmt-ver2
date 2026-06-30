import * as XLSX from "xlsx";

export type ExcelColumnWidth = { wch: number } | { width: number };

export function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  sheetName = "Sheet1",
  columnWidths?: Array<number | ExcelColumnWidth>,
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (columnWidths?.length) {
    ws["!cols"] = columnWidths.map((width) =>
      typeof width === "number" ? { wch: width } : width,
    );
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
