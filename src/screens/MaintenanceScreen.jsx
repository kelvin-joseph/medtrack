import { useState } from "react";
import {
  AlertTriangle, CalendarClock, CalendarDays, CalendarRange, Wrench, Plus,
  Calendar as CalendarIcon, ClipboardList, Users, History as HistoryIcon,
  ChevronLeft, ChevronRight, Check, X as XIcon, Sparkles, Download,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { CATEGORY_ICON } from "../data/equipment.js";
import { NOW, daysBetween, fmtDate } from "../lib/dates.js";
import { equipmentNeedingScheduling, WORK_ORDER_STATUSES, MAINTENANCE_TYPES, PRIORITIES } from "../lib/workOrderEngine.js";
import EmptyState from "../components/EmptyState.jsx";
import ScheduleMaintenanceDialog from "../components/ScheduleMaintenanceDialog.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { PriorityBadge } from "../components/Badges.jsx";

const TABS = [
  { key: "upcoming", label: "Upcoming", icon: Wrench },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
  { key: "workorders", label: "Work Orders", icon: ClipboardList },
  { key: "engineers", label: "Engineer Tasks", icon: Users },
  { key: "history", label: "History", icon: HistoryIcon },
];

const STATUS_COLOR = {
  Scheduled: "#2F7DE1", "In Progress": "#D89A1F", Completed: "#1F9D6B", Overdue: "#D9364B", Cancelled: "#93A9C0",
};

function groupOf(eq) {
  const d = daysBetween(eq.nextMaintenanceDate, NOW);
  if (d > 0) return "overdue";
  if (d === 0) return "today";
  if (d >= -7) return "week";
  if (d >= -30) return "month";
  return "later";
}
const GROUPS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "#D9364B" },
  { key: "today", label: "Due Today", icon: CalendarClock, color: "#E07A2F" },
  { key: "week", label: "Due This Week", icon: CalendarDays, color: "#D89A1F" },
  { key: "month", label: "Due This Month", icon: CalendarRange, color: "#2F7DE1" },
];

export default function MaintenanceScreen() {
  const { equipment, workOrders, loadDemoData } = useData();
  const [tab, setTab] = useState("upcoming");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (equipment.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={Wrench}
          title="No maintenance scheduled"
          description="Preventive maintenance schedules and work orders are generated from your equipment records. Add equipment first, or load the demo fleet to see this screen populated."
          action={
            <button onClick={loadDemoData} className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
              Load demo data
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display">Maintenance</h1>
          <p className="text-sm text-muted mt-1">Preventive scheduling, work orders, and history across the fleet.</p>
        </div>
        <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2 hover:opacity-90 transition-opacity">
          <Plus size={14} /> Schedule maintenance
        </button>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? "text-accent border-accent" : "text-muted border-transparent hover:text-ink"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "upcoming" && <UpcomingTab equipment={equipment} workOrders={workOrders} />}
      {tab === "calendar" && <CalendarTab workOrders={workOrders} equipment={equipment} />}
      {tab === "workorders" && <WorkOrdersTab workOrders={workOrders} equipment={equipment} />}
      {tab === "engineers" && <EngineerTasksTab workOrders={workOrders} equipment={equipment} />}
      {tab === "history" && <HistoryTab workOrders={workOrders} equipment={equipment} />}

      <ScheduleMaintenanceDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}

/* ---------------------------------- Upcoming ---------------------------------- */
function UpcomingTab({ equipment, workOrders }) {
  const { openEquipment } = useApp();
  const [scheduleFor, setScheduleFor] = useState(null);

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: equipment.filter((eq) => groupOf(eq) === g.key).sort((a, b) => new Date(a.nextMaintenanceDate) - new Date(b.nextMaintenanceDate)),
  }));
  const needsScheduling = equipmentNeedingScheduling(equipment, workOrders).slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {needsScheduling.length > 0 && (
        <div className="rounded-xl border border-[#2F7DE1]/30 bg-accent-soft p-4">
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
            <Sparkles size={14} color="#2F7DE1" /> AI-flagged: high-risk equipment with no scheduled maintenance
          </h3>
          <div className="flex flex-col gap-2">
            {needsScheduling.map((eq) => (
              <button
                key={eq.id}
                onClick={() => setScheduleFor(eq.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-surface hover:border-accent/50 px-3 py-2 text-left transition-colors"
              >
                <div className="text-sm text-ink">{eq.name} <span className="text-xs text-muted">({eq._ai.risk.level} risk, score {eq._ai.risk.score})</span></div>
                <span className="text-xs font-semibold text-accent">Schedule now →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {grouped.map((g) => (
        <div key={g.key} className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: g.color }}>
            <g.icon size={14} /> {g.label} ({g.items.length})
          </h3>
          {g.items.length === 0 && <div className="text-sm text-muted py-2">Nothing here.</div>}
          <div className="flex flex-col gap-2">
            {g.items.map((eq) => {
              const Icon = CATEGORY_ICON[eq.category] || AlertTriangle;
              const overdueDays = daysBetween(eq.nextMaintenanceDate, NOW);
              return (
                <button
                  key={eq.id}
                  onClick={() => openEquipment(eq.id)}
                  className="flex items-center justify-between rounded-lg border border-border hover:border-accent/50 hover:bg-accent-soft px-3 py-2.5 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-accent-soft flex items-center justify-center shrink-0">
                      <Icon size={15} color="#4A6C93" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-ink truncate">{eq.name}</div>
                      <div className="text-[11px] font-mono text-muted truncate">{eq.assetTag} · {eq.department}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-mono" style={{ color: overdueDays > 0 ? "#D9364B" : "#5B7591" }}>
                      {overdueDays > 0 ? `Overdue ${overdueDays}d` : fmtDate(eq.nextMaintenanceDate)}
                    </div>
                    <div className="text-[11px] text-faint">{eq.assignedEngineer}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <ScheduleMaintenanceDialog open={!!scheduleFor} onClose={() => setScheduleFor(null)} equipmentId={scheduleFor} />
    </div>
  );
}

/* ---------------------------------- Calendar ---------------------------------- */
function CalendarTab({ workOrders, equipment }) {
  const { openEquipment } = useApp();
  const [view, setView] = useState("month"); // month | week | day
  const [cursor, setCursor] = useState(new Date(NOW));

  const eqById = Object.fromEntries(equipment.map((e) => [e.id, e]));
  const withDate = workOrders.filter((w) => w.scheduledDate);

  function shift(delta) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  }

  const ordersOn = (dateStr) => withDate.filter((w) => w.scheduledDate === dateStr);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-ink min-w-[140px] text-center">
            {view === "month" && cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            {view === "week" && `Week of ${fmtDate(startOfWeek(cursor))}`}
            {view === "day" && cursor.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short" })}
          </span>
          <button onClick={() => shift(1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink"><ChevronRight size={15} /></button>
        </div>
        <div className="flex gap-1">
          {["month", "week", "day"].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${view === v ? "bg-accent text-white border-accent" : "border-border text-muted"}`}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px]">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {status}</span>
        ))}
      </div>

      {view === "month" && <MonthGrid cursor={cursor} ordersOn={ordersOn} eqById={eqById} openEquipment={openEquipment} />}
      {view === "week" && <AgendaList days={weekDays(cursor)} ordersOn={ordersOn} eqById={eqById} openEquipment={openEquipment} />}
      {view === "day" && <AgendaList days={[cursor]} ordersOn={ordersOn} eqById={eqById} openEquipment={openEquipment} />}
    </div>
  );
}

function startOfWeek(d) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  return date;
}
function weekDays(d) {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => { const day = new Date(start); day.setDate(start.getDate() + i); return day; });
}
function toKey(d) { return d.toISOString().slice(0, 10); }

function MonthGrid({ cursor, ordersOn, eqById, openEquipment }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startPad = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];

  return (
    <div className="grid grid-cols-7 gap-1.5 text-[11px]">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="text-center text-faint font-mono uppercase py-1">{d}</div>
      ))}
      {cells.map((day, i) => {
        if (!day) return <div key={i} />;
        const dateKey = toKey(day);
        const orders = ordersOn(dateKey);
        const isToday = dateKey === toKey(NOW);
        return (
          <div key={i} className={`min-h-[64px] rounded-lg border p-1.5 ${isToday ? "border-accent bg-accent-soft" : "border-divider"}`}>
            <div className="text-ink font-medium mb-0.5">{day.getDate()}</div>
            <div className="flex flex-col gap-0.5">
              {orders.slice(0, 2).map((w) => (
                <button
                  key={w.id}
                  onClick={() => openEquipment(w.equipmentId)}
                  title={w.title}
                  className="text-left truncate rounded px-1 py-0.5 text-white"
                  style={{ backgroundColor: STATUS_COLOR[w.status] || "#93A9C0" }}
                >
                  {eqById[w.equipmentId]?.name || w.type}
                </button>
              ))}
              {orders.length > 2 && <span className="text-faint">+{orders.length - 2} more</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaList({ days, ordersOn, eqById, openEquipment }) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const dateKey = toKey(day);
        const orders = ordersOn(dateKey);
        return (
          <div key={dateKey}>
            <div className="text-xs font-semibold text-muted mb-1.5">{day.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</div>
            {orders.length === 0 && <div className="text-xs text-faint pl-2 pb-1">No maintenance scheduled.</div>}
            <div className="flex flex-col gap-1.5">
              {orders.map((w) => (
                <button
                  key={w.id}
                  onClick={() => openEquipment(w.equipmentId)}
                  className="flex items-center justify-between rounded-lg border border-border hover:bg-accent-soft px-3 py-2 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[w.status] }} />
                    <span className="text-sm text-ink">{eqById[w.equipmentId]?.name || "—"}</span>
                    <span className="text-xs text-muted">· {w.type}</span>
                  </div>
                  <span className="text-xs text-muted">{w.assignedEngineer || "Unassigned"}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Work Orders ---------------------------------- */
function WorkOrdersTab({ workOrders, equipment }) {
  const { completeWorkOrder, cancelWorkOrder, removeWorkOrder } = useData();
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const eqById = Object.fromEntries(equipment.map((e) => [e.id, e]));
  const filtered = workOrders.filter((w) =>
    (statusFilter === "All" || w.status === statusFilter) && (typeFilter === "All" || w.type === typeFilter)
  ).sort((a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0));

  if (workOrders.length === 0) {
    return <div className="text-sm text-muted text-center py-10">No work orders yet — use "Schedule maintenance" to create one.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-border rounded-lg px-3 py-2 outline-none">
          <option value="All">All statuses</option>
          {WORK_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border border-border rounded-lg px-3 py-2 outline-none">
          <option value="All">All types</option>
          {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
              <th className="text-left px-4 py-3 font-medium">Equipment</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Scheduled</th>
              <th className="text-left px-4 py-3 font-medium">Engineer</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w, i) => {
              const eq = eqById[w.equipmentId];
              const open = !["Completed", "Cancelled"].includes(w.status);
              return (
                <tr key={w.id} className="bg-surface" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                  <td className="px-4 py-3">
                    <div className="text-ink">{eq?.name || "—"}</div>
                    <div className="text-[11px] text-muted">{w.title}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{w.type}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={w.priority} /></td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold" style={{ color: STATUS_COLOR[w.status], backgroundColor: STATUS_COLOR[w.status] + "17" }}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">{fmtDate(w.scheduledDate)}</td>
                  <td className="px-4 py-3 text-muted">{w.assignedEngineer || "Unassigned"}</td>
                  <td className="px-4 py-3 text-right">
                    {open && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => completeWorkOrder(w.id)} title="Mark completed" className="text-[#1F9D6B] hover:opacity-70"><Check size={15} /></button>
                        <button onClick={() => cancelWorkOrder(w.id)} title="Cancel" className="text-faint hover:text-[#D9364B]"><XIcon size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this work order?"
        message="This permanently removes the work order record."
        confirmLabel="Delete"
        onConfirm={() => { removeWorkOrder(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ---------------------------------- Engineer Tasks ---------------------------------- */
function EngineerTasksTab({ workOrders, equipment }) {
  const { openEquipment } = useApp();
  const eqById = Object.fromEntries(equipment.map((e) => [e.id, e]));
  const engineers = [...new Set(workOrders.map((w) => w.assignedEngineer).filter(Boolean))];

  if (engineers.length === 0) {
    return <div className="text-sm text-muted text-center py-10">No work orders assigned to engineers yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {engineers.map((engineer) => {
        const mine = workOrders.filter((w) => w.assignedEngineer === engineer);
        const overdue = mine.filter((w) => w.status === "Overdue").length;
        const upcoming = mine.filter((w) => ["Scheduled", "In Progress"].includes(w.status)).length;
        const completed = mine.filter((w) => w.status === "Completed").length;
        return (
          <div key={engineer} className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <h3 className="text-sm font-semibold text-ink mb-2">{engineer}</h3>
            <div className="flex gap-4 text-xs mb-3">
              <span className="text-[#D9364B] font-semibold">{overdue} overdue</span>
              <span className="text-[#2F7DE1] font-semibold">{upcoming} upcoming</span>
              <span className="text-[#1F9D6B] font-semibold">{completed} completed</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {mine.filter((w) => w.status !== "Completed" && w.status !== "Cancelled").slice(0, 4).map((w) => (
                <button key={w.id} onClick={() => openEquipment(w.equipmentId)} className="flex items-center justify-between text-left text-xs rounded-lg hover:bg-accent-soft px-2 py-1.5">
                  <span className="text-ink">{eqById[w.equipmentId]?.name || "—"} — {w.type}</span>
                  <span style={{ color: STATUS_COLOR[w.status] }}>{w.status}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- History ---------------------------------- */
function HistoryTab({ workOrders, equipment }) {
  const [query, setQuery] = useState("");
  const eqById = Object.fromEntries(equipment.map((e) => [e.id, e]));

  const completed = workOrders
    .filter((w) => w.status === "Completed")
    .filter((w) => !query || (eqById[w.equipmentId]?.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0));

  function exportCSV() {
    const headers = ["Equipment", "Type", "Completed Date", "Engineer", "Notes"];
    const rows = completed.map((w) => [eqById[w.equipmentId]?.name || "", w.type, w.completedDate, w.assignedEngineer, w.notes]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "maintenance-history.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by equipment name…" className="text-sm border border-border rounded-lg px-3 py-2 outline-none flex-1 min-w-[200px]" />
        <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink hover:bg-accent-soft transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
              <th className="text-left px-4 py-3 font-medium">Equipment</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Completed</th>
              <th className="text-left px-4 py-3 font-medium">Engineer</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((w, i) => (
              <tr key={w.id} className="bg-surface" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                <td className="px-4 py-3 text-ink">{eqById[w.equipmentId]?.name || "—"}</td>
                <td className="px-4 py-3 text-muted">{w.type}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{fmtDate(w.completedDate)}</td>
                <td className="px-4 py-3 text-muted">{w.assignedEngineer}</td>
              </tr>
            ))}
            {completed.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted bg-surface">No completed maintenance yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
