// CMMS engine: maintenance types, recurrence math, and the glue between
// work orders and the existing AI risk engine (priority suggestions,
// "likely to fail soon" surfacing). Pure functions only — services own
// persistence, screens own UI.

import { NOW, daysBetween } from "./dates.js";

export const MAINTENANCE_TYPES = [
  "Preventive", "Corrective", "Calibration", "Inspection",
  "Safety Testing", "Software Update", "Emergency Repair",
];

export const WORK_ORDER_STATUSES = ["Scheduled", "In Progress", "Completed", "Overdue", "Cancelled"];
export const PRIORITIES = ["Emergency", "Critical", "High", "Medium", "Low"];

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Biannually" },
  { value: "annual", label: "Annually" },
  { value: "custom", label: "Custom interval" },
];

const RECURRENCE_DAYS = { weekly: 7, monthly: 30, quarterly: 91, biannual: 182, annual: 365 };

/** Computes the next scheduled date given a recurrence rule. */
export function nextRecurrenceDate(fromDateStr, recurrence) {
  if (!recurrence || recurrence.frequency === "none") return null;
  const days = recurrence.frequency === "custom"
    ? Number(recurrence.customDays) || 30
    : RECURRENCE_DAYS[recurrence.frequency] || 30;
  const from = new Date(fromDateStr);
  return new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10);
}

/** AI-suggested priority for a new work order, derived from the equipment's existing risk/priority data. */
export function suggestPriority(equipment) {
  if (!equipment?._ai) return "Medium";
  return equipment._ai.priority.priority;
}

/** Derives display status — flips Scheduled/In Progress to Overdue once past due date. */
export function deriveStatus(workOrder) {
  if (workOrder.status === "Completed" || workOrder.status === "Cancelled") return workOrder.status;
  if (workOrder.dueDate && daysBetween(workOrder.dueDate, NOW) > 0) return "Overdue";
  return workOrder.status;
}

/** Equipment that's high/critical risk but has no open (non-completed, non-cancelled) work order — worth AI-flagging for scheduling. */
export function equipmentNeedingScheduling(equipment, workOrders) {
  const openEquipmentIds = new Set(
    workOrders.filter((w) => !["Completed", "Cancelled"].includes(w.status)).map((w) => w.equipmentId)
  );
  return equipment
    .filter((eq) => ["High", "Critical"].includes(eq._ai.risk.level) && !openEquipmentIds.has(eq.id))
    .sort((a, b) => b._ai.risk.score - a._ai.risk.score);
}
