import { useState } from "react";
import { useApp, SCREENS } from "../context/AppContext.jsx";
import {
  ArrowLeft, MapPin, Wrench, AlertTriangle, Cpu, QrCode as QrIcon, FileText,
  DollarSign, GitCommitVertical, Plus, Download, Printer, Pencil, Archive, Trash2, CalendarPlus,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { CATEGORY_ICON } from "../data/equipment.js";
import { NOW, daysBetween, fmtDate } from "../lib/dates.js";
import RiskGauge from "../components/RiskGauge.jsx";
import QRCode from "../components/QRCode.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ScheduleMaintenanceDialog from "../components/ScheduleMaintenanceDialog.jsx";
import {
  RiskBadge, StatusBadge, ConditionBadge, PriorityBadge, CriticalityBadge,
} from "../components/Badges.jsx";

const TABS = [
  { key: "overview", label: "Overview", icon: MapPin },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "repairs", label: "Repairs", icon: AlertTriangle },
  { key: "ai", label: "AI Prediction", icon: Cpu },
  { key: "qr", label: "QR Code", icon: QrIcon },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "costs", label: "Costs", icon: DollarSign },
  { key: "timeline", label: "Timeline", icon: GitCommitVertical },
];

export default function EquipmentProfile() {
  const { selectedEquipmentId: id, navigate, openEditEquipment } = useApp();
  const { equipment, archiveEquipment, removeEquipment } = useData();
  const { can } = useRole();
  const [tab, setTab] = useState("overview");
  const [confirmAction, setConfirmAction] = useState(null); // "archive" | "delete" | null

  const eq = equipment.find((e) => e.id === id);
  if (!eq) {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted">No equipment selected.</p>
        <button onClick={() => navigate(SCREENS.EQUIPMENT)} className="text-sm text-accent font-semibold">
          Go to Equipment Inventory
        </button>
      </div>
    );
  }

  const Icon = CATEGORY_ICON[eq.category] || Wrench;

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      <button onClick={() => navigate(SCREENS.EQUIPMENT)} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit transition-colors">
        <ArrowLeft size={15} /> Back to inventory
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-accent-soft border border-border flex items-center justify-center">
            <Icon size={22} color="#2F7DE1" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink font-display">{eq.name}</h1>
            <div className="text-xs font-mono text-muted mt-0.5">{eq.assetTag} · {eq.model} · {eq.department}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={eq.status} />
          <ConditionBadge condition={eq.condition} />
          <RiskBadge level={eq._ai.risk.level} color={eq._ai.risk.color} />
          {can("editEquipment") && (
            <>
              <button
                onClick={() => openEditEquipment(eq.id)}
                title="Edit equipment"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-accent-soft transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmAction("archive")}
                title="Archive / decommission"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-accent-soft transition-colors"
              >
                <Archive size={14} />
              </button>
              <button
                onClick={() => setConfirmAction("delete")}
                title="Delete equipment"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-[#D9364B] hover:bg-[#D9364B0D] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === "delete" ? "Delete this equipment?" : "Archive this equipment?"}
        message={
          confirmAction === "delete"
            ? `This permanently removes ${eq.name} and its full maintenance/repair history. This cannot be undone.`
            : `This marks ${eq.name} as Decommissioned. It stays in your records but is flagged as no longer in service.`
        }
        confirmLabel={confirmAction === "delete" ? "Delete permanently" : "Archive equipment"}
        onConfirm={() => {
          if (confirmAction === "delete") {
            removeEquipment(eq.id);
            navigate(SCREENS.EQUIPMENT);
          } else {
            archiveEquipment(eq.id);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: TIcon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? "text-accent border-accent" : "text-muted border-transparent hover:text-ink"
            }`}
          >
            <TIcon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab eq={eq} />}
      {tab === "maintenance" && <MaintenanceTab eq={eq} />}
      {tab === "repairs" && <RepairsTab eq={eq} />}
      {tab === "ai" && <AIPredictionTab eq={eq} />}
      {tab === "qr" && <QRTab eq={eq} />}
      {tab === "documents" && <DocumentsTab eq={eq} />}
      {tab === "costs" && <CostsTab eq={eq} />}
      {tab === "timeline" && <TimelineTab eq={eq} />}
    </div>
  );
}

/* ---------------------------------- Overview ---------------------------------- */
function OverviewTab({ eq }) {
  const { can } = useRole();
  const { setCriticality, setCondition } = useData();

  const Field = ({ label, value }) => (
    <div className="flex justify-between text-sm py-1.5 border-b border-divider last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink text-right">{value}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-2">Identification</h3>
        <dl>
          <Field label="Asset Tag" value={eq.assetTag} />
          <Field label="Category" value={eq.category} />
          <Field label="Manufacturer" value={eq.manufacturer} />
          <Field label="Model" value={eq.model} />
          <Field label="Serial Number" value={eq.serialNumber} />
          <Field label="Vendor / Supplier" value={eq.vendor} />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-2">Location &amp; assignment</h3>
        <dl>
          <Field label="Department" value={eq.department} />
          <Field label="Room / Location" value={eq.location} />
          <Field label="Assigned Engineer" value={eq.assignedEngineer} />
          <Field label="Status" value={<StatusBadge status={eq.status} />} />
          <Field
            label="Condition"
            value={
              can("updateCondition") ? (
                <select
                  value={eq.condition}
                  onChange={(e) => setCondition(eq.id, e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 outline-none"
                >
                  {["Excellent", "Good", "Fair", "Poor", "Critical"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <ConditionBadge condition={eq.condition} />
              )
            }
          />
          <Field
            label="Clinical Criticality"
            value={
              can("editEquipment") ? (
                <select
                  value={eq.clinicalCriticality}
                  onChange={(e) => setCriticality(eq.id, e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 outline-none"
                >
                  {["Critical", "High", "Moderate", "Low"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <CriticalityBadge criticality={eq.clinicalCriticality} />
              )
            }
          />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-2">Dates &amp; lifecycle</h3>
        <dl>
          <Field label="Date Purchased" value={fmtDate(eq.purchaseDate)} />
          <Field label="Date Installed" value={fmtDate(eq.installDate)} />
          <Field label="Warranty Start" value={fmtDate(eq.warrantyStart)} />
          <Field label="Warranty Expiry" value={fmtDate(eq.warrantyExpiry)} />
          <Field label="Expected Useful Life" value={`${eq.expectedLifespanYears} years`} />
          <Field label="Current Age" value={`${(daysBetween(eq.installDate, NOW) / 365).toFixed(1)} years`} />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-2">Usage &amp; upcoming dates</h3>
        <dl>
          <Field label="Operating Hours / Week" value={eq.operatingHoursPerWeek} />
          <Field label="Usage Frequency" value={eq.usageFrequency} />
          <Field label="Last Maintenance" value={fmtDate(eq.lastMaintenanceDate)} />
          <Field label="Next Maintenance" value={fmtDate(eq.nextMaintenanceDate)} />
          <Field label="Last Calibration" value={fmtDate(eq.lastCalibrationDate)} />
          <Field label="Next Calibration" value={fmtDate(eq.nextCalibrationDate)} />
        </dl>
      </div>
    </div>
  );
}

/* ---------------------------------- Maintenance ---------------------------------- */
function MaintenanceTab({ eq }) {
  const { can } = useRole();
  const { addMaintenanceRecord, settings, workOrders, completeWorkOrder, cancelWorkOrder } = useData();
  const checklistTemplate = settings.maintenance?.defaultChecklist || [];
  const [showForm, setShowForm] = useState(false);
  const [checked, setChecked] = useState({});
  const [note, setNote] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const daysOverdue = daysBetween(eq.nextMaintenanceDate, NOW);
  const myWorkOrders = workOrders.filter((w) => w.equipmentId === eq.id && !["Completed", "Cancelled"].includes(w.status));

  function submit() {
    addMaintenanceRecord(eq.id, {
      type: "Preventive",
      date: NOW.toISOString().slice(0, 10),
      note: note || "Preventive maintenance checklist completed",
      engineer: eq.assignedEngineer,
      cost: 15000,
      checklist: checklistTemplate.filter((_, i) => checked[i]),
    });
    setShowForm(false);
    setChecked({});
    setNote("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Preventive maintenance schedule</h3>
          <p className="text-xs text-muted mt-1">
            Next due {fmtDate(eq.nextMaintenanceDate)}
            {daysOverdue > 0 && <span className="text-[#D9364B] font-medium"> — overdue by {daysOverdue} days</span>}
          </p>
        </div>
        {can("performMaintenance") && (
          <div className="flex gap-2">
            <button
              onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-1.5 text-ink hover:bg-accent-soft transition-colors"
            >
              <CalendarPlus size={13} /> Schedule maintenance
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus size={13} /> Complete maintenance checklist
            </button>
          </div>
        )}
      </div>

      {myWorkOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-3">Open work orders</h3>
          <div className="flex flex-col gap-2">
            {myWorkOrders.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <div className="text-sm text-ink">{w.type} — {w.title}</div>
                  <div className="text-[11px] text-muted">{fmtDate(w.scheduledDate)} · {w.assignedEngineer || "Unassigned"} · {w.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => completeWorkOrder(w.id)} className="text-xs font-semibold text-[#1F9D6B] hover:underline">Complete</button>
                  <button onClick={() => cancelWorkOrder(w.id)} className="text-xs font-semibold text-muted hover:underline">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScheduleMaintenanceDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} equipmentId={eq.id} />

      {showForm && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h4 className="text-sm font-semibold text-ink mb-3">Maintenance checklist — {eq.category}</h4>
          <div className="flex flex-col gap-2 mb-3">
            {checklistTemplate.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))} />
                {item}
              </label>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notes (optional)…"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={submit} className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2">Sign &amp; complete</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border text-xs font-semibold px-4 py-2 text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-3">Completed maintenance history</h3>
        <div className="flex flex-col">
          {eq.maintenanceRecords.length === 0 && <div className="text-sm text-muted py-4 text-center">No maintenance records yet.</div>}
          {eq.maintenanceRecords.map((r, i) => (
            <div key={r.id} className="flex items-start gap-3 py-2.5" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
              <div className="font-mono text-[11px] text-muted w-20 shrink-0 pt-0.5">{fmtDate(r.date)}</div>
              <div className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full h-fit shrink-0 text-[#1F9D6B] bg-[#1F9D6B17]">{r.type}</div>
              <div className="text-sm text-ink flex-1">
                {r.note}
                {r.checklist && r.checklist.length > 0 && (
                  <div className="text-xs text-muted mt-1">{r.checklist.length} checklist items completed</div>
                )}
              </div>
              <div className="text-xs text-muted shrink-0">{r.engineer}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Repairs ---------------------------------- */
function RepairsTab({ eq }) {
  const { can } = useRole();
  const { addRepairRecord } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ faultDescription: "", suspectedCause: "", correctiveAction: "", cost: "", downtimeHours: "" });

  const { mttr, mtbf, breakdownCount } = eq._ai.reliability;

  function submit() {
    addRepairRecord(eq.id, {
      date: NOW.toISOString().slice(0, 10),
      reportedBy: "Biomedical Engineer",
      faultDescription: form.faultDescription || "Reported fault",
      errorCode: "—",
      suspectedCause: form.suspectedCause || "Under investigation",
      diagnosis: "Pending",
      correctiveAction: form.correctiveAction || "Pending",
      partsReplaced: "—",
      cost: Number(form.cost) || 0,
      engineer: eq.assignedEngineer,
      repairStart: NOW.toISOString().slice(0, 10),
      repairCompletion: null,
      downtimeHours: Number(form.downtimeHours) || 0,
      finalStatus: "In Progress",
    });
    setShowForm(false);
    setForm({ faultDescription: "", suspectedCause: "", correctiveAction: "", cost: "", downtimeHours: "" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Breakdowns (lifetime)</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">{breakdownCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Mean Time To Repair</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">{mttr ? `${mttr.toFixed(1)}h` : "—"}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Mean Time Between Failures</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">{mtbf ? `${mtbf}d` : "—"}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Breakdown &amp; repair history</h3>
          {can("recordBreakdowns") && (
            <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity">
              <Plus size={13} /> Record breakdown
            </button>
          )}
        </div>

        {showForm && (
          <div className="rounded-lg border border-border p-4 mb-4 flex flex-col gap-2">
            <input placeholder="Fault description" value={form.faultDescription} onChange={(e) => setForm({ ...form, faultDescription: e.target.value })} className="text-sm border border-border rounded-lg px-3 py-2 outline-none" />
            <input placeholder="Suspected cause" value={form.suspectedCause} onChange={(e) => setForm({ ...form, suspectedCause: e.target.value })} className="text-sm border border-border rounded-lg px-3 py-2 outline-none" />
            <input placeholder="Corrective action" value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} className="text-sm border border-border rounded-lg px-3 py-2 outline-none" />
            <div className="flex gap-2">
              <input placeholder="Cost (₦)" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="text-sm border border-border rounded-lg px-3 py-2 outline-none flex-1" />
              <input placeholder="Downtime (hrs)" type="number" value={form.downtimeHours} onChange={(e) => setForm({ ...form, downtimeHours: e.target.value })} className="text-sm border border-border rounded-lg px-3 py-2 outline-none flex-1" />
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={submit} className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2">Save record</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border text-xs font-semibold px-4 py-2 text-muted">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {eq.repairRecords.length === 0 && <div className="text-sm text-muted py-4 text-center">No repair records yet.</div>}
          {eq.repairRecords.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted">{fmtDate(r.date)}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full text-[#E07A2F] bg-[#E07A2F17]">{r.finalStatus}</span>
              </div>
              <div className="text-sm text-ink font-medium">{r.faultDescription}</div>
              <div className="text-xs text-muted mt-1">Cause: {r.suspectedCause} · Action: {r.correctiveAction}</div>
              <div className="text-xs text-muted mt-1">Parts: {r.partsReplaced} · Cost: ₦{(r.cost || 0).toLocaleString()} · Downtime: {r.downtimeHours}h · Engineer: {r.engineer}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- AI Prediction ---------------------------------- */
function AIPredictionTab({ eq }) {
  const { risk, failureProb, window, priority, recommendations, replacement } = eq._ai;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col items-center shadow-card">
          <h3 className="text-sm font-semibold text-ink self-start mb-2">AI Risk Score</h3>
          <RiskGauge score={risk.score} color={risk.color} />
          <div className="text-xs text-muted text-center mt-1">{risk.score}/100 · <span style={{ color: risk.color }}>{risk.level} Risk</span></div>
        </div>

        <div className="col-span-2 rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-2">Why is this equipment {risk.level.toLowerCase()} risk?</h3>
          <ul className="flex flex-col gap-1.5">
            {risk.explanation.map((e, i) => (
              <li key={i} className="text-sm text-ink flex items-start gap-2">
                <span className="text-accent mt-1">•</span> {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-3">Estimated failure probability</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[["Next 30 Days", failureProb.p30], ["Next 90 Days", failureProb.p90], ["Next 6 Months", failureProb.p180], ["Next 12 Months", failureProb.p365]].map(([label, val]) => (
            <div key={label} className="rounded-lg border border-border p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide font-mono text-muted">{label}</div>
              <div className="text-xl font-semibold text-ink font-display mt-1">{val}%</div>
            </div>
          ))}
        </div>
        {failureProb.confidenceNote && (
          <p className="text-xs text-[#D89A1F] mt-3">{failureProb.confidenceNote}</p>
        )}
        <p className="text-[11px] text-faint mt-3">
          These are estimates for decision support, not guaranteed outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-2">Predicted failure window</h3>
          {window.start ? (
            <>
              <div className="text-sm text-ink font-medium">{fmtDate(window.start)} – {fmtDate(window.end)}</div>
              <div className="text-xs text-muted mt-1">Confidence: {window.confidencePercent}%</div>
              <div className="text-xs text-muted mt-2">Main contributing factors:</div>
              <ul className="mt-1 flex flex-col gap-1">
                {window.factors.map((f, i) => <li key={i} className="text-xs text-ink">• {f}</li>)}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted">{failureProb.confidenceNote}</p>
          )}
          <div className="mt-3 pt-3 border-t border-divider">
            <span className="text-xs text-muted">Recommended action: </span>
            <span className="text-xs text-ink font-medium">{window.recommendedAction}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-2">Priority level</h3>
          <div className="flex items-center gap-2 mb-2">
            <PriorityBadge priority={priority.priority} />
            <CriticalityBadge criticality={eq.clinicalCriticality} />
          </div>
          <p className="text-xs text-muted">{priority.reason}</p>

          <h4 className="text-xs font-semibold text-ink mt-4 mb-1">AI maintenance recommendations</h4>
          <ul className="flex flex-col gap-1">
            {recommendations.map((r, i) => <li key={i} className="text-xs text-ink">• {r}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-2">Replacement recommendation</h3>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-mono uppercase px-2.5 py-1 rounded-full font-semibold"
            style={{
              color: replacement.priority === "HIGH PRIORITY" ? "#D9364B" : replacement.priority === "MEDIUM PRIORITY" ? "#E07A2F" : "#5B7591",
              backgroundColor: replacement.priority === "HIGH PRIORITY" ? "#D9364B17" : replacement.priority === "MEDIUM PRIORITY" ? "#E07A2F17" : "#5B759117",
            }}
          >
            {replacement.priority}
          </span>
        </div>
        {replacement.reasons.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {replacement.reasons.map((r, i) => <li key={i} className="text-xs text-ink">• {r}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-muted">No replacement concerns at this time.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- QR Code ---------------------------------- */
function QRTab({ eq }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card flex flex-col items-center max-w-sm">
      <QRCode value={eq.assetTag} size={180} />
      <div className="text-sm font-semibold text-ink mt-3">{eq.name}</div>
      <div className="text-xs font-mono text-muted">{eq.assetTag}</div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink hover:bg-accent-soft transition-colors">
          <Printer size={13} /> Print
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2 hover:opacity-90 transition-opacity">
          <Download size={13} /> Download
        </button>
      </div>
      <p className="text-[11px] text-faint text-center mt-3">
        Encodes a secure asset reference only — no clinical data. Scanning opens this equipment's digital profile.
      </p>
    </div>
  );
}

/* ---------------------------------- Documents ---------------------------------- */
function DocumentsTab({ eq }) {
  const { can } = useRole();
  const { addDocument } = useData();

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">Documents</h3>
        {can("uploadDocuments") && (
          <button
            onClick={() => addDocument(eq.id, { name: "New Document.pdf", type: "Other" })}
            className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> Upload document
          </button>
        )}
      </div>
      {eq.documents.length === 0 && <div className="text-sm text-muted py-4 text-center">No documents uploaded yet.</div>}
      <div className="flex flex-col">
        {eq.documents.map((d, i) => (
          <div key={d.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
            <FileText size={15} color="#2F7DE1" className="shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-ink">{d.name}</div>
              <div className="text-[11px] text-muted">{d.type} · uploaded {fmtDate(d.uploadedDate)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Costs ---------------------------------- */
function CostsTab({ eq }) {
  const { totalCost } = eq._ai.reliability;
  const maintCost = eq.maintenanceRecords.reduce((s, r) => s + (r.cost || 0), 0);
  const repairCost = eq.repairRecords.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Total cost to date</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">₦{totalCost.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Preventive maintenance cost</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">₦{maintCost.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wide font-mono text-muted">Repair cost</div>
          <div className="text-2xl font-semibold text-ink font-display mt-1">₦{repairCost.toLocaleString()}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-3">Cost history</h3>
        <div className="flex flex-col">
          {[...eq.maintenanceRecords, ...eq.repairRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((r, i) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-sm" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                <span className="text-muted font-mono text-xs">{fmtDate(r.date)}</span>
                <span className="text-ink flex-1 px-3">{r.note || r.faultDescription}</span>
                <span className="text-ink font-mono">₦{(r.cost || 0).toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Timeline ---------------------------------- */
function TimelineTab({ eq }) {
  const events = [
    { date: eq.purchaseDate, label: "Purchased", type: "lifecycle" },
    { date: eq.installDate, label: "Installed", type: "lifecycle" },
    ...eq.maintenanceRecords.map((r) => ({ date: r.date, label: `Maintenance — ${r.note}`, type: "maintenance" })),
    ...eq.repairRecords.map((r) => ({ date: r.date, label: `Repair — ${r.faultDescription}`, type: "repair" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const DOT_COLOR = { lifecycle: "#2F7DE1", maintenance: "#1F9D6B", repair: "#D9364B" };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink mb-4">Equipment timeline</h3>
      <div className="flex flex-col">
        {events.map((e, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: DOT_COLOR[e.type] }} />
              {i < events.length - 1 && <span className="w-px flex-1 bg-divider" />}
            </div>
            <div className="pb-4">
              <div className="text-xs font-mono text-muted">{fmtDate(e.date)}</div>
              <div className="text-sm text-ink">{e.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
