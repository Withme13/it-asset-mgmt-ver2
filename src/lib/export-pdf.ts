import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => any);
  align?: "left" | "right" | "center";
  width?: number;
};

export function exportToPDF<T extends Record<string, any>>(
  rows: T[],
  columns: PdfColumn<T>[],
  filename: string,
  title: string,
  orientation: "portrait" | "landscape" = "landscape",
) {
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const stamp = new Date().toLocaleString("id-ID");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated: ${stamp}`, 40, 52);
  doc.text(`Total: ${rows.length} record(s)`, pageWidth - 40, 52, { align: "right" });

  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = typeof c.accessor === "function" ? c.accessor(r) : r[c.accessor];
      if (v === null || v === undefined || v === "") return "—";
      return String(v);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: 64,
    margin: { left: 24, right: 24 },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      textColor: 40,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: columns.reduce((acc, c, i) => {
      const style: Record<string, any> = {};
      if (c.align) style.halign = c.align;
      if (c.width) style.cellWidth = c.width;
      if (Object.keys(style).length) acc[i] = style;
      return acc;
    }, {} as Record<number, any>),
    tableWidth: "auto",
    theme: "striped",
    didDrawPage: () => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - 40, pageHeight - 16, { align: "right" });
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${filename}-${date}.pdf`);
}
