import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => any);
  align?: "left" | "right" | "center";
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
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.align) acc[i] = { halign: c.align };
      return acc;
    }, {} as Record<number, any>),
    didDrawPage: (data) => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${filename}-${date}.pdf`);
}
