import { NOW, daysBetween } from "./dates.js";

/** Derives the hospital-wide critical alerts feed from the live equipment list. */
export function computeAlerts(equipmentList) {
  const alerts = [];

  for (const eq of equipmentList) {
    const { risk, failureProb } = eq._ai;

    if (eq.status === "Out of Service" && (eq.clinicalCriticality === "Critical" || eq.clinicalCriticality === "High")) {
      alerts.push({ id: `${eq.id}-offline`, severity: "critical", equipment: eq, message: `${eq.name} is offline (${eq.clinicalCriticality} criticality)` });
    }
    if (failureProb.p90 >= 60) {
      alerts.push({ id: `${eq.id}-failprob`, severity: "critical", equipment: eq, message: `${eq.name}: ${failureProb.p90}% failure probability within 90 days` });
    }
    const overdueDays = daysBetween(eq.nextMaintenanceDate, NOW);
    if (overdueDays > 0) {
      alerts.push({ id: `${eq.id}-pm`, severity: overdueDays > 14 ? "critical" : "warning", equipment: eq, message: `${eq.name}: preventive maintenance overdue by ${overdueDays} days` });
    }
    const calOverdue = daysBetween(eq.nextCalibrationDate, NOW);
    if (calOverdue > 0) {
      alerts.push({ id: `${eq.id}-cal`, severity: "warning", equipment: eq, message: `${eq.name}: calibration expired ${calOverdue} days ago` });
    }
    const warrantyDays = daysBetween(NOW, eq.warrantyExpiry);
    if (warrantyDays > 0 && warrantyDays <= 90) {
      alerts.push({ id: `${eq.id}-warranty`, severity: "info", equipment: eq, message: `${eq.name}: warranty expires in ${warrantyDays} days` });
    }
    const recent12mo = eq.repairRecords.filter((r) => daysBetween(r.date, NOW) <= 365);
    if (recent12mo.length >= 3) {
      alerts.push({ id: `${eq.id}-repeat`, severity: "warning", equipment: eq, message: `${eq.name}: ${recent12mo.length} repeated failures in the last 12 months` });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Richer, categorized notification feed for the Notifications screen —
 * mirrors the category set from the design brief (maintenance-overdue,
 * maintenance-due, ai-prediction, fault-report, warranty-expiry,
 * calibration-due). Each entry carries a `severity`
 * (critical/high/medium/low) and an `urgencyGroup` used to bucket the
 * feed since these are computed live rather than timestamped historical
 * events — there's no real "notification date" to group by honestly.
 */
export function computeNotifications(equipment, tickets = [], settings = null) {
  const items = [];

  for (const eq of equipment) {
    const { risk, failureProb } = eq._ai;

    const overdueDays = daysBetween(eq.nextMaintenanceDate, NOW);
    if (overdueDays > 0) {
      items.push({
        id: `${eq.id}-maint-overdue`, type: "maintenance-overdue",
        severity: overdueDays > 14 ? "critical" : "high",
        title: "Preventive maintenance overdue",
        message: `${eq.name} is overdue for preventive maintenance by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.`,
        equipmentId: eq.id,
      });
    } else if (overdueDays >= -7) {
      items.push({
        id: `${eq.id}-maint-due`, type: "maintenance-due",
        severity: "medium",
        title: "Maintenance due soon",
        message: `${eq.name} has preventive maintenance due within the week.`,
        equipmentId: eq.id,
      });
    }

    if (failureProb.p90 >= 60) {
      items.push({
        id: `${eq.id}-ai`, type: "ai-prediction",
        severity: risk.level === "Critical" ? "critical" : "high",
        title: "High failure probability predicted",
        message: `${eq.name}: ${failureProb.p90}% chance of failure within 90 days (risk score ${risk.score}/100).`,
        equipmentId: eq.id,
      });
    }

    const calOverdue = daysBetween(eq.nextCalibrationDate, NOW);
    if (calOverdue > 0) {
      items.push({
        id: `${eq.id}-cal`, type: "calibration-due",
        severity: calOverdue > 30 ? "high" : "medium",
        title: "Calibration overdue",
        message: `${eq.name}: calibration expired ${calOverdue} day${calOverdue === 1 ? "" : "s"} ago.`,
        equipmentId: eq.id,
      });
    }

    const warrantyDays = daysBetween(NOW, eq.warrantyExpiry);
    if (warrantyDays <= 0) {
      items.push({
        id: `${eq.id}-warr-expired`, type: "warranty-expiry",
        severity: "medium",
        title: "Warranty expired",
        message: `${eq.name}: warranty expired ${fmtAgo(-warrantyDays)}.`,
        equipmentId: eq.id,
      });
    } else if (warrantyDays <= 90) {
      items.push({
        id: `${eq.id}-warr-soon`, type: "warranty-expiry",
        severity: "low",
        title: "Warranty expiring soon",
        message: `${eq.name}: warranty expires in ${warrantyDays} days.`,
        equipmentId: eq.id,
      });
    }
  }

  for (const ticket of tickets) {
    if (["New", "Assigned", "In Progress"].includes(ticket.status)) {
      items.push({
        id: `${ticket.id}-fault`, type: "fault-report",
        severity: ticket.status === "New" ? "high" : "medium",
        title: `Fault report: ${ticket.status}`,
        message: `${ticket.category} reported by ${ticket.reportedBy} — ${ticket.description}`,
        equipmentId: ticket.equipmentId,
      });
    }
  }

  const NOTIF_TOGGLE_BY_TYPE = {
    "maintenance-overdue": "maintenanceReminders",
    "maintenance-due": "maintenanceReminders",
    "ai-prediction": "highRiskAlerts",
    "fault-report": "faultNotifications",
    "calibration-due": "calibrationReminders",
    "warranty-expiry": "warrantyExpiryAlerts",
  };
  const filtered = settings?.notifications
    ? items.filter((item) => settings.notifications[NOTIF_TOGGLE_BY_TYPE[item.type]] !== false)
    : items;

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

function fmtAgo(days) {
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return `${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? "" : "s"} ago`;
}
