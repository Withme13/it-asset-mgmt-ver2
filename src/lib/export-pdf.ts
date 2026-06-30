import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => any);
  align?: "left" | "right" | "center";
  /**
   * Relative width weight (NOT a fixed pt value). Columns are scaled
   * proportionally to always fill the full page width — e.g. a column
   * with weight 2 will always be twice as wide as one with weight 1,
   * regardless of page size or orientation.
   */
  width?: number;
  /**
   * Optional group name. Columns sharing the same `group` are rendered
   * under one merged header cell on row 1, with their own `header` as the
   * sub-header on row 2 (mirrors "Pengecekan" / "Kategori CIA" in Excel).
   */
  group?: string;
};

// Row background colors by Status value (matches the Excel report).
const STATUS_COLORS: Record<string, [number, number, number]> = {
  BACKUP: [255, 242, 150], // yellow
  RETIRED: [198, 224, 180], // green
  BROKEN: [191, 191, 191], // gray
  // "OK" and anything unlisted falls through to no fill (white)
};

function getStatusColor(row: Record<string, any>): [number, number, number] | null {
  const raw = (row["Status"] ?? row["status"] ?? "").toString().trim().toUpperCase();
  if (!raw) return null;
  if (STATUS_COLORS[raw]) return STATUS_COLORS[raw];
  const found = Object.keys(STATUS_COLORS).find((key) => raw.includes(key));
  return found ? STATUS_COLORS[found] : null;
}

export function exportToPDF<T extends Record<string, any>>(
  rows: T[],
  columns: PdfColumn<T>[],
  filename: string,
  title: string,
  orientation: "portrait" | "landscape" = "landscape",
) {
  const doc = new jsPDF({ orientation, unit: "pt", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const stamp = new Date().toLocaleString("id-ID");

  // ---- Title block ----
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 40, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated: ${stamp}`, 40, 60);
  doc.text(`Total: ${rows.length} record(s)`, pageWidth - 40, 60, { align: "right" });

  // ---- Auto-fit column widths so they always fill the page exactly ----
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const weights = columns.map((c) => c.width ?? 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const colWidthsPt = weights.map((w) => (w / totalWeight) * usableWidth);

  // ---- Build 1 or 2-row header depending on whether any column has a group ----
  const hasGroups = columns.some((c) => !!c.group);

  let head: any[][];
  if (hasGroups) {
    const row1: any[] = [];
    const row2: any[] = [];

    let i = 0;
    while (i < columns.length) {
      const col = columns[i];
      if (!col.group) {
        row1.push({ content: col.header, rowSpan: 2, styles: { valign: "middle" } });
        i++;
        continue;
      }
      const groupName = col.group;
      let span = 0;
      while (i + span < columns.length && columns[i + span].group === groupName) span++;
      row1.push({ content: groupName, colSpan: span, styles: { halign: "center" } });
      for (let j = 0; j < span; j++) row2.push(columns[i + j].header);
      i += span;
    }
    head = [row1, row2];
  } else {
    head = [columns.map((c) => c.header)];
  }

  const body = rows.map((r) =>
    columns.map((c) => {
      const v = typeof c.accessor === "function" ? c.accessor(r) : r[c.accessor];
      if (v === null || v === undefined || v === "") return "—";
      return String(v);
    }),
  );

  // Track which column indices start a new group, to draw a thicker left border there.
  const groupStartCols = new Set<number>();
  {
    let prevGroup: string | undefined = undefined;
    columns.forEach((c, idx) => {
      if (c.group && c.group !== prevGroup) groupStartCols.add(idx);
      prevGroup = c.group;
    });
  }

  autoTable(doc, {
    head,
    body,
    startY: 72,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      textColor: 40,
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      lineColor: [255, 255, 255],
      lineWidth: 0.5,
    },
    theme: "grid",
    // CRITICAL: tableWidth must be the exact usable width, and every column
    // must declare an explicit cellWidth — otherwise autoTable falls back to
    // "auto" sizing per-column, which wraps text aggressively on narrow cols.
    tableWidth: usableWidth,
    columnStyles: columns.reduce((acc, c, i) => {
      const style: Record<string, any> = { cellWidth: colWidthsPt[i] };
      if (c.align) style.halign = c.align;
      acc[i] = style;
      return acc;
    }, {} as Record<number, any>),
    // Row coloring by Status + thicker divider before each column group
    didParseCell: (data) => {
      if (data.section === "body") {
        const rowData = rows[data.row.index] as Record<string, any>;
        const color = getStatusColor(rowData);
        if (color) {
          data.cell.styles.fillColor = color;
        }
      }
      if (groupStartCols.has(data.column.index) && data.column.index !== 0) {
        data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5, left: 1.5, right: 0.5 } as any;
      }
    },
    didDrawPage: () => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - 40, pageHeight - 16, { align: "right" });
    },
  });

  // ---- Legend for status colors ----
  const finalY = (doc as any).lastAutoTable?.finalY ?? 72;
  let legendY = finalY + 22;
  if (legendY > pageHeight - 30) {
    doc.addPage();
    legendY = 40;
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  doc.text("Keterangan Status:", margin, legendY);

  let legendX = margin;
  const legendItemY = legendY + 14;
  Object.entries(STATUS_COLORS).forEach(([label, color]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(legendX, legendItemY - 7, 10, 10, "F");
    doc.setDrawColor(150);
    doc.rect(legendX, legendItemY - 7, 10, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    doc.text(label, legendX + 14, legendItemY);
    legendX += doc.getTextWidth(label) + 50;
  });
  doc.setFillColor(255, 255, 255);
  doc.rect(legendX, legendItemY - 7, 10, 10, "F");
  doc.setDrawColor(150);
  doc.rect(legendX, legendItemY - 7, 10, 10, "S");
  doc.text("OK / Lainnya", legendX + 14, legendItemY);

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${filename}-${date}.pdf`);
}