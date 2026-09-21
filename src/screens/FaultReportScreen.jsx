import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Plus, ChevronRight, AlertTriangle } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { FAULT_CATEGORIES, TICKET_STATUSES } from "../data/faultTickets.js";
import { TicketStatusBadge, PriorityBadge } from "../components/Badges.jsx";
import { fmtDate } from "../lib/dates.js";
import EmptyState from "../components/EmptyState.jsx";

// Emergency/Critical auto-classification: critical-criticality equipment
// reporting a Malfunction or Electrical Fault is escalated automatically.
function classifyPriority(equipment, category) {
  if (!equipment) return "Medium";
  const crit = equipment.clinicalCriticality;
  if (
    crit === "Critical" &&
    (category === "Malfunction" || category === "Electrical Fault")
  )
    return "Emergency";
  if (crit === "Critical" || crit === "High") return "Critical";
  if (crit === "Moderate") return "High";
  return "Medium";
}

export default function FaultReporting() {
  const { openEquipment } = useApp();
  const { equipment, tickets, workOrders, addTicket, updateTicketStatus, addWorkOrder } =
    useData();
  const { can, role, profile } = useRole();
  const getEquipmentById = (id) => equipment.find((e) => e.id === id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    equipmentId: "",
    category: FAULT_CATEGORIES[0],
    description: "",
    reportedBy: "",
    department: "",
  });

  const [submitError, setSubmitError] = useState(null);

  // Work-order-from-ticket creation state, keyed by ticket id.
  const [creatingWoId, setCreatingWoId] = useState(null);
  const [woErrors, setWoErrors] = useState({});

  async function handleCreateWorkOrder(t, eq, priority) {
    if (creatingWoId) return; // guard against duplicate/concurrent submission
    setCreatingWoId(t.id);
    setWoErrors((prev) => ({ ...prev, [t.id]: null }));
    try {
      await addWorkOrder({
        equipmentId: t.equipmentId,
        faultTicketId: t.id,
        type: "Corrective",
        title: `Fault repair — ${eq?.name || t.equipmentId}`,
        description: t.description,
        priority,
        createdBy: profile?.name || role,
      });
      // addWorkOrder() already refreshes tickets/work-order data and shows
      // a success toast — nothing further to do here.
    } catch (err) {
      console.error("[FaultReport] Failed to create work order:", err);
      setWoErrors((prev) => ({
        ...prev,
        [t.id]: err.message || "Failed to create work order. Please try again.",
      }));
    } finally {
      setCreatingWoId(null);
    }
  }

  async function submit() {
    setSubmitError(null);
    if (!form.equipmentId || !form.description) {
      return;
    }
    try {
      await addTicket({
        equipmentId: form.equipmentId,
        category: form.category,
        description: form.description,
        reportedBy: form.reportedBy || profile?.name || role,
        department:
          form.department ||
          profile?.department ||
          getEquipmentById(form.equipmentId)?.department ||
          "—",
      });
      setShowForm(false);
      setForm({
        equipmentId: "",
        category: FAULT_CATEGORIES[0],
        description: "",
        reportedBy: "",
        department: "",
      });
    } catch (err) {
      console.error("[FaultReport] Failed to submit fault report:", err);
      setSubmitError(err.message || "Failed to submit fault report. Please try again.");
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display">
            Fault reporting
          </h1>
          <p className="text-sm text-muted mt-1">
            {tickets.length} tickets tracked
          </p>
        </div>
        {can("reportFault") && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Report fault
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">New fault report</h3>
          <select
            value={form.equipmentId}
            onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
            className="text-sm border border-border rounded-lg px-3 py-2 outline-none"
          >
            <option value="">Select equipment…</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} — {eq.assetTag}
              </option>
            ))}
          </select>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="text-sm border border-border rounded-lg px-3 py-2 outline-none"
          >
            {FAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the problem…"
            className="text-sm border border-border rounded-lg px-3 py-2 outline-none"
            rows={3}
          />
          <input
            value={form.reportedBy}
            onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
            placeholder="Reported by (optional)"
            className="text-sm border border-border rounded-lg px-3 py-2 outline-none"
          />
          <p className="text-[11px] text-faint">
            Photo/video/voice-note attachments arrive with the backend in a
            later phase.
          </p>
          {submitError && (
            <div className="text-xs text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-3 py-2">
              {submitError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2"
            >
              Submit report
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border text-xs font-semibold px-4 py-2 text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {can("manageWorkOrders") && (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const eq = getEquipmentById(t.equipmentId);
            const priority = classifyPriority(eq, t.category);
            // Sourced from workOrders (loaded from the work_orders table via
            // workOrderService), not a local/derived guess — reflects the
            // actual fault_ticket_id linkage in the database.
            const hasWorkOrder = workOrders.some((w) => w.faultTicketId === t.id);
            const canCreateWorkOrder =
              t.status !== "Completed" && t.status !== "Closed" && !hasWorkOrder;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-card flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-muted">{t.id}</span>
                    <TicketStatusBadge status={t.status} />
                    <PriorityBadge priority={priority} />
                  </div>
                  <button
                    onClick={() => eq && openEquipment(eq.id)}
                    className="text-sm font-medium text-ink hover:text-accent transition-colors flex items-center gap-1"
                  >
                    {eq ? eq.name : "Unknown equipment"}{" "}
                    <ChevronRight size={12} />
                  </button>
                  <div className="text-xs text-muted mt-1">
                    {t.category} · reported by {t.reportedBy} · {t.department}
                  </div>
                  <div className="text-sm text-ink mt-2">{t.description}</div>
                  <div className="text-[11px] text-faint mt-2">
                    {fmtDate(t.createdAt)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <select
                    value={t.status}
                    onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 outline-none shrink-0"
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {canCreateWorkOrder && (
                    <button
                      onClick={() => handleCreateWorkOrder(t, eq, priority)}
                      disabled={creatingWoId === t.id}
                      className="text-xs font-semibold rounded-lg border border-border px-3 py-1.5 text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingWoId === t.id ? "Creating…" : "Create Work Order"}
                    </button>
                  )}
                  {woErrors[t.id] && (
                    <div className="text-[11px] text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-2 py-1 max-w-[220px] text-right">
                      {woErrors[t.id]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {tickets.length === 0 && (
            <EmptyState icon={AlertTriangle} title="No fault reports yet." />
          )}
        </div>
      )}
    </div>
  );
}
