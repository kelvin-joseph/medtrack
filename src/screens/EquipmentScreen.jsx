import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Search, ChevronRight, QrCode, Download, ClipboardList, Sparkles, Plus, Upload, Wrench } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { STATUSES } from "../data/equipment.js";
import { daysBetween, NOW, fmtDate } from "../lib/dates.js";
import { StatusBadge, RiskBadge } from "../components/Badges.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ScheduleMaintenanceDialog from "../components/ScheduleMaintenanceDialog.jsx";

const RISK_LEVELS = ["Very Low", "Low", "Moderate", "High", "Critical"];
const MAINT_STATUSES = ["All", "Overdue", "Due this week", "Up to date"];
const SORTS = [
  { key: "name", label: "Name (A–Z)" },
  { key: "riskDesc", label: "Risk (highest first)" },
  { key: "ageDesc", label: "Age (oldest first)" },
];

function maintStatusOf(eq) {
  const d = daysBetween(eq.nextMaintenanceDate, NOW);
  if (d > 0) return "Overdue";
  if (d >= -7) return "Due this week";
  return "Up to date";
}

export default function Inventory() {
  const { openEquipment, viewQRTag, openAddEquipment, openImportEquipment } = useApp();
  const { equipment, settings, loadDemoData } = useData();
  const DEPARTMENTS = [...new Set([...(settings.departments || []).map((d) => d.name), ...equipment.map((e) => e.department)])];
  const CATEGORIES = [...new Set([...(settings.categories || []), ...equipment.map((e) => e.category)])];
  const [query, setQuery] = useState("");
  const [scheduleFor, setScheduleFor] = useState(null);
  const [dept, setDept] = useState("All");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [riskLevel, setRiskLevel] = useState("All");
  const [maintStatus, setMaintStatus] = useState("All");
  const [manufacturer, setManufacturer] = useState("All");
  const [engineer, setEngineer] = useState("All");
  const [sort, setSort] = useState("name");

  const manufacturers = ["All", ...new Set(equipment.map((e) => e.manufacturer))];
  const engineers = ["All", ...new Set(equipment.map((e) => e.assignedEngineer))];

  const filtered = useMemo(() => {
    let list = equipment.filter((e) => {
      const matchQuery = (e.name + e.assetTag + e.model + e.serialNumber).toLowerCase().includes(query.toLowerCase());
      const matchDept = dept === "All" || e.department === dept;
      const matchCategory = category === "All" || e.category === category;
      const matchStatus = status === "All" || e.status === status;
      const matchRisk = riskLevel === "All" || e._ai.risk.level === riskLevel;
      const matchMaint = maintStatus === "All" || maintStatusOf(e) === maintStatus;
      const matchMfr = manufacturer === "All" || e.manufacturer === manufacturer;
      const matchEng = engineer === "All" || e.assignedEngineer === engineer;
      return matchQuery && matchDept && matchCategory && matchStatus && matchRisk && matchMaint && matchMfr && matchEng;
    });

    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "riskDesc") list = [...list].sort((a, b) => b._ai.risk.score - a._ai.risk.score);
    if (sort === "ageDesc") list = [...list].sort((a, b) => daysBetween(b.installDate, NOW) - daysBetween(a.installDate, NOW));
    return list;
  }, [equipment, query, dept, category, status, riskLevel, maintStatus, manufacturer, engineer, sort]);

  function exportCSV() {
    const headers = ["Asset Tag", "Name", "Category", "Department", "Status", "Condition", "Risk Score", "Risk Level", "Assigned Engineer", "Next Maintenance"];
    const rows = filtered.map((e) => [
      e.assetTag, e.name, e.category, e.department, e.status, e.condition,
      e._ai.risk.score, e._ai.risk.level, e.assignedEngineer, fmtDate(e.nextMaintenanceDate),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medtrack-equipment-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (equipment.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={ClipboardList}
          title="No equipment added yet"
          description="Start building your hospital equipment inventory by adding your first medical device, importing a spreadsheet, or scanning an existing QR asset tag."
          action={
            <button onClick={openAddEquipment} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
              <Plus size={14} /> Add equipment
            </button>
          }
          secondaryAction={
            <button onClick={openImportEquipment} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-4 py-2.5 text-ink hover:bg-accent-soft transition-colors">
              <Upload size={14} /> Import equipment
            </button>
          }
        />
        <div className="text-center mt-3">
          <button onClick={loadDemoData} className="text-xs text-accent font-medium hover:underline">
            Or just load the demo fleet to explore first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display">Equipment inventory</h1>
          <p className="text-sm text-muted mt-1">{filtered.length} of {equipment.length} assets shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openImportEquipment} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-soft transition-colors">
            <Upload size={14} /> Import
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-soft transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={openAddEquipment} className="flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-2 text-xs font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add equipment
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <Search size={15} color="#5B7591" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, asset tag, model, or serial number…"
          className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={dept} onChange={setDept} options={["All", ...DEPARTMENTS]} label="Department" />
        <Select value={category} onChange={setCategory} options={["All", ...CATEGORIES]} label="Category" />
        <Select value={status} onChange={setStatus} options={["All", ...STATUSES]} label="Status" />
        <Select value={riskLevel} onChange={setRiskLevel} options={["All", ...RISK_LEVELS]} label="Risk" />
        <Select value={maintStatus} onChange={setMaintStatus} options={MAINT_STATUSES} label="Maintenance" />
        <Select value={manufacturer} onChange={setManufacturer} options={manufacturers} label="Manufacturer" />
        <Select value={engineer} onChange={setEngineer} options={engineers} label="Engineer" />
        <Select value={sort} onChange={setSort} options={SORTS.map((s) => s.key)} display={(k) => SORTS.find((s) => s.key === k).label} />
      </div>

      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
              <th className="text-left px-4 py-3 font-medium">Equipment</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Risk</th>
              <th className="text-left px-4 py-3 font-medium">Next maintenance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((eq, i) => (
              <tr
                key={eq.id}
                onClick={() => openEquipment(eq.id)}
                className="cursor-pointer hover:bg-accent-soft transition-colors bg-surface"
                style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}
              >
                <td className="px-4 py-3">
                  <div className="text-ink">{eq.name}</div>
                  <div className="text-[11px] font-mono text-muted">{eq.assetTag} · {eq.model}</div>
                </td>
                <td className="px-4 py-3 text-muted">{eq.department}</td>
                <td className="px-4 py-3"><StatusBadge status={eq.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={eq._ai.risk.level} color={eq._ai.risk.color} />
                    <span className="text-xs font-mono text-muted">{eq._ai.risk.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted text-xs font-mono">{fmtDate(eq.nextMaintenanceDate)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setScheduleFor(eq.id); }}
                      title="Schedule maintenance"
                      className="text-faint hover:text-accent transition-colors"
                    >
                      <Wrench size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); viewQRTag(eq.id); }}
                      title="View QR asset tag"
                      className="text-faint hover:text-accent transition-colors"
                    >
                      <QrCode size={15} />
                    </button>
                    <ChevronRight size={15} color="#93A9C0" />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted bg-surface">No equipment matches these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScheduleMaintenanceDialog open={!!scheduleFor} onClose={() => setScheduleFor(null)} equipmentId={scheduleFor} />
    </div>
  );
}

function Select({ value, onChange, options, display, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-surface text-ink text-xs px-3 py-2 outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {display ? display(o) : label ? `${label}: ${o}` : o}
        </option>
      ))}
    </select>
  );
}
