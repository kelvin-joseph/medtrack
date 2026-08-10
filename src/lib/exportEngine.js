// Shared export engine for Reports & Analytics.
//
// Every report is defined once as a set of typed columns + row objects, and
// can be rendered as either a clean, Excel/Google-Sheets-safe CSV or a fully
// formatted .xlsx workbook (auto column widths, wrapped long-text fields,
// a title block, a frozen/styled header row, zebra striping, and an
// autofilter) — so a downloaded report reads like a real biomedical
// engineering / hospital document rather than a raw data dump.

import ExcelJS from "exceljs";

// SECURITY NOTE (accepted risk, reviewed 2026-08-07):
// `npm audit` flags 2 moderate advisories in exceljs's own dependency tree
// (fast-csv / tmp — GHSA-8cv5-p934-3hwp, GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65).
// Both live in exceljs's CSV import/streaming code path, which this codebase
// never calls — everywhere in this repo we only ever construct a workbook
// and call `workbook.xlsx.writeBuffer()`. exceljs 4.4.0 is the current
// published release; there is no newer version that resolves this upstream.
// Do not "fix" this by running `npm audit fix --force` — it will downgrade
// exceljs to an older major version (3.x) and introduce a *worse*, high-
// severity vulnerability in the same dependency chain. Revisit this note
// if/when exceljs cuts a new release, or if this file ever grows a reason
// to use its CSV read path (it shouldn't need to).

const NAVY = "FF123B67";
const NAVY_LIGHT = "FF1B4C82";
const ZEBRA = "FFF3F8FD";
const BORDER = "FFD7E4F2";
const WHITE = "FFFFFFFF";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Escapes/quotes a single CSV field per RFC 4180. */
function csvField(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Downloads a single-table report as CSV.
 * columns: [{ header, key }]
 * rows: [{ [key]: value }]
 */
export function exportCSV({ filename, title, columns, rows }) {
  const lines = [];
  if (title) lines.push(csvField(title));
  lines.push(columns.map((c) => csvField(c.header)).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => csvField(row[c.key])).join(","));
  }
  // UTF-8 BOM so Excel (Windows) reads special characters (₦, etc.) correctly.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function estimateColumnWidth(column, rows) {
  if (column.width) return column.width;
  if (column.wrap) return 42; // wrapped long-text columns: fixed comfortable width, height grows instead
  let max = column.header.length;
  for (const row of rows) {
    const v = row[column.key];
    const len = v === null || v === undefined ? 0 : String(v).length;
    if (len > max) max = len;
  }
  return Math.min(Math.max(max + 3, 11), 34);
}

/**
 * Downloads one or more tables as a single, professionally formatted
 * .xlsx workbook.
 *
 * sheets: [{
 *   name: string,
 *   title: string,           // shown as a merged banner row above the table
 *   subtitle?: string,       // e.g. generated-on timestamp, record count
 *   columns: [{ header, key, wrap?, numFmt?, width? }],
 *   rows: [{ [key]: value }],
 * }]
 */
export async function exportXLSX({ filename, sheets }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MedTrack";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const colCount = sheet.columns.length;
    ws.columns = sheet.columns.map((c) => ({ key: c.key, width: estimateColumnWidth(c, sheet.rows) }));

    // Title banner
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `MedTrack — ${sheet.title}`;
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    ws.getRow(1).height = 26;

    ws.mergeCells(2, 1, 2, colCount);
    const subtitleCell = ws.getCell(2, 1);
    subtitleCell.value = sheet.subtitle || `Generated ${new Date().toLocaleString("en-GB")} · ${sheet.rows.length} record${sheet.rows.length === 1 ? "" : "s"}`;
    subtitleCell.font = { italic: true, size: 9, color: { argb: WHITE } };
    subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_LIGHT } };
    ws.getRow(2).height = 16;

    // Row 3 spacer
    ws.getRow(3).height = 4;

    // Header row (row 4)
    const headerRow = ws.getRow(4);
    sheet.columns.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, size: 10, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
    });
    headerRow.height = 20;

    // Data rows
    sheet.rows.forEach((row, rIdx) => {
      const excelRow = ws.getRow(5 + rIdx);
      sheet.columns.forEach((c, cIdx) => {
        const cell = excelRow.getCell(cIdx + 1);
        cell.value = row[c.key] ?? "";
        if (c.numFmt) cell.numFmt = c.numFmt;
        cell.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: !!c.wrap,
        };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER } },
          bottom: { style: "thin", color: { argb: BORDER } },
          left: { style: "thin", color: { argb: BORDER } },
          right: { style: "thin", color: { argb: BORDER } },
        };
        if (rIdx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        }
      });
    });

    // Autofilter across the header + data range
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + sheet.rows.length, column: colCount },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
