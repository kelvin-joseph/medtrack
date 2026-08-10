import { useState, useRef } from "react";
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useApp, SCREENS } from "../context/AppContext.jsx";
import { useData } from "../context/AppDataContext.jsx";
import { validateEquipment } from "../lib/validation.js";

const CSV_COLUMNS = [
  "name",
  "assetTag",
  "category",
  "manufacturer",
  "model",
  "serialNumber",
  "department",
  "location",
  "status",
  "condition",
  "clinicalCriticality",
  "purchaseDate",
  "installDate",
  "warrantyStart",
  "warrantyExpiry",
  "expectedLifespanYears",
  "operatingHoursPerWeek",
  "usageFrequency",
  "assignedEngineer",
  "vendor",
];

function downloadCSVTemplate() {
  const sampleRow = [
    "Ventilator ICU-05",
    "MT-VEN-015",
    "Ventilator",
    "GE Healthcare",
    "Elite 300",
    "GE-VT300-99001",
    "ICU",
    "ICU Bay 5",
    "Operational",
    "Good",
    "Critical",
    "2024-01-10",
    "2024-02-01",
    "2024-02-01",
    "2027-02-01",
    "8",
    "150",
    "Very High",
    "",
    "GE Healthcare Nigeria",
  ];
  const csv = [CSV_COLUMNS, sampleRow]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medtrack-equipment-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDFTemplate() {
  // Honest limitation: this is a printable reference form for manual data
  // entry, not something the app can parse back in — real PDF parsing
  // needs a backend/OCR service. Producing a plain-text "form" here rather
  // than pretending to generate a polished PDF client-side.
  const lines = [
    "MedTrack — Equipment Registration Form",
    "",
    "Fill this out by hand, then use it as a reference to add equipment via",
    "the Add Equipment form or the CSV import (this file itself cannot be",
    "re-uploaded and parsed automatically).",
    "",
    ...CSV_COLUMNS.map((c) => `${c}: ______________________________`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medtrack-equipment-registration-form.txt";
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal CSV parser — handles quoted fields with embedded commas. */
function parseCSV(text) {
  const rows = [];
  let row = [],
    field = "",
    inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export default function ImportEquipmentScreen() {
  const { navigate } = useApp();
  const { equipment, addEquipment } = useData();
  const fileInputRef = useRef(null);
  const [parsed, setParsed] = useState(null); // { rows: [...], errorsByRow: {} }
  const [importResult, setImportResult] = useState(null);
  const [fileName, setFileName] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length < 2) {
        setParsed({
          rows: [],
          errorsByRow: {},
          headerError: "This file doesn't look like it has any data rows.",
        });
        return;
      }
      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = (r[i] || "").trim();
        });
        return obj;
      });

      const errorsByRow = {};
      const existingTags = new Set(equipment.map((e) => e.assetTag));
      const existingSerials = new Set(
        equipment.map((e) => e.serialNumber).filter(Boolean),
      );
      const seenTags = new Set();

      dataRows.forEach((row, i) => {
        const { errors, isValid } = validateEquipment(row);
        if (!isValid) errorsByRow[i] = { ...errors };

        const isDuplicate =
          existingTags.has(row.assetTag) ||
          (row.serialNumber && existingSerials.has(row.serialNumber)) ||
          seenTags.has(row.assetTag);
        if (isDuplicate)
          errorsByRow[i] = {
            ...(errorsByRow[i] || {}),
            _duplicate: "Matches an existing asset tag or serial number.",
          };
        if (row.assetTag) seenTags.add(row.assetTag);
      });

      setParsed({ rows: dataRows, errorsByRow });
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!parsed) return;
    let imported = 0,
      skipped = 0;
    // Sequential, not Promise.all/forEach: addEquipment computes the next
    // EQ-### id by querying Supabase for existing ids, so firing these
    // concurrently risks two rows landing on the same id and overwriting
    // each other. Awaiting one at a time keeps id assignment safe.
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      if (parsed.errorsByRow[i]) {
        skipped++;
        continue;
      }
      await addEquipment({
        ...row,
        expectedLifespanYears: Number(row.expectedLifespanYears) || 10,
        operatingHoursPerWeek: Number(row.operatingHoursPerWeek) || 0,
        status: row.status || "Operational",
        condition: row.condition || "Good",
        clinicalCriticality: row.clinicalCriticality || "Moderate",
        usageFrequency: row.usageFrequency || "Medium",
      });
      imported++;
    }
    setImportResult({ imported, skipped });
    setParsed(null);
  }

  const validCount = parsed
    ? parsed.rows.filter((_, i) => !parsed.errorsByRow[i]).length
    : 0;
  const errorCount = parsed ? parsed.rows.length - validCount : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 max-w-3xl">
      <button
        onClick={() => navigate(SCREENS.EQUIPMENT)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit transition-colors"
      >
        <ArrowLeft size={15} /> Back to inventory
      </button>

      <div>
        <h1 className="text-xl font-semibold text-ink font-display">
          Import equipment
        </h1>
        <p className="text-sm text-muted mt-1">
          Bulk-add equipment from a spreadsheet.
        </p>
      </div>

      {importResult && (
        <div className="rounded-xl border border-[#1F9D6B]/30 bg-[#1F9D6B0D] p-4 flex items-start gap-2.5">
          <CheckCircle2 size={16} color="#1F9D6B" className="shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            Imported {importResult.imported} equipment record
            {importResult.imported === 1 ? "" : "s"}.
            {importResult.skipped > 0 &&
              ` ${importResult.skipped} row${importResult.skipped === 1 ? "" : "s"} were skipped due to errors or duplicates.`}
            <button
              onClick={() => navigate(SCREENS.EQUIPMENT)}
              className="block mt-1 text-xs font-semibold text-accent hover:underline"
            >
              View inventory →
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">1. Get a template</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink hover:bg-accent-soft transition-colors"
          >
            <Download size={13} /> Download CSV template
          </button>
          <button
            onClick={downloadPDFTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink hover:bg-accent-soft transition-colors"
          >
            <FileText size={13} /> Download PDF-style form (reference only)
          </button>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted bg-accent-soft rounded-lg p-3">
          <Info size={13} color="#2F7DE1" className="shrink-0 mt-0.5" />
          <span>
            Only the CSV template can be uploaded and automatically parsed. The
            PDF-style form is for filling out by hand as a reference — parsing
            scanned/PDF documents needs a backend service and isn't available
            yet.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">2. Upload your CSV</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
        >
          <Upload size={16} /> {fileName || "Click to choose a CSV file"}
        </button>

        {parsed?.headerError && (
          <div className="flex items-center gap-2 text-xs text-[#D9364B]">
            <AlertTriangle size={13} /> {parsed.headerError}
          </div>
        )}

        {parsed && parsed.rows.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[#1F9D6B] font-medium">
                <CheckCircle2 size={13} /> {validCount} ready to import
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-[#D9364B] font-medium">
                  <AlertTriangle size={13} /> {errorCount} with issues (will be
                  skipped)
                </span>
              )}
            </div>
            <div className="rounded-lg border border-border overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-[#F3F8FD] text-muted uppercase tracking-wide font-mono">
                    <th className="text-left px-3 py-2">Row</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Asset Tag</th>
                    <th className="text-left px-3 py-2">Department</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, i) => {
                    const rowErrors = parsed.errorsByRow[i];
                    return (
                      <tr
                        key={i}
                        className={rowErrors ? "bg-[#D9364B0D]" : "bg-surface"}
                        style={{
                          borderTop: i === 0 ? "none" : "1px solid #E5EEF7",
                        }}
                      >
                        <td className="px-3 py-2 text-muted">{i + 2}</td>
                        <td className="px-3 py-2 text-ink">
                          {row.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-ink font-mono">
                          {row.assetTag || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {row.department || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {rowErrors ? (
                            <span className="text-[#D9364B]">
                              {Object.values(rowErrors)[0]}
                            </span>
                          ) : (
                            <span className="text-[#1F9D6B]">Valid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={confirmImport}
              disabled={validCount === 0}
              className="self-start rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Import {validCount} equipment record{validCount === 1 ? "" : "s"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
