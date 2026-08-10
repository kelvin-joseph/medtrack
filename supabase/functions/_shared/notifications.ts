// Shared logic for both notification Edge Functions (send-notification-digest
// and notify-fault-report): mapping raw Supabase rows into the same shape
// the frontend uses, computing risk/notification data with the app's real
// risk engine (imported directly — not a re-implementation, so server-side
// notifications can never drift out of sync with what the dashboard shows),
// and deciding who gets emailed for a given notification item.
//
// Recipient rules (as specified for the hospital):
//   Biomedical Engineers/Technicians — faults, assigned work orders,
//     maintenance due, equipment risks
//   Head of Biomedical Engineering — critical faults, overdue maintenance,
//     major AI risk alerts, departmental updates
//   Department Staff (nurses etc.) — only updates on faults THEY reported
//   System Administrator — users/security/system notifications (not
//     equipment-related — there's no signal source for this yet; see
//     supabase/SETUP.md for why this role gets nothing from these two
//     functions today)

// deno-lint-ignore-file no-explicit-any
import {
  computeRiskScore, computeFailureProbability, computePredictedWindow,
  computePriority, computeReliabilityStats, computeRecommendations,
  computeReplacementRecommendation,
} from "../../../src/lib/riskEngine.js";
import { computeNotifications } from "../../../src/lib/alerts.js";

export function fromEquipmentRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    condition: row.condition,
    location: row.location,
    department: row.department,
    clinicalCriticality: row.clinical_criticality,
    assignedEngineer: row.assigned_engineer,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row.details,
  };
}

export function fromTicketRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    reportedBy: row.reported_by,
    reportedById: row.reported_by_id,
    department: row.department,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Same computation as src/data/equipment.js's attachAI, without the
 * lucide-react icon import (irrelevant server-side, and not Deno-safe). */
export function attachAI(eq: any, thresholds: any) {
  const risk = computeRiskScore(eq, thresholds);
  const failureProb = computeFailureProbability(eq, risk);
  const window = computePredictedWindow(eq, risk, failureProb);
  const priority = computePriority(eq, risk, failureProb);
  const reliability = computeReliabilityStats(eq);
  const recommendations = computeRecommendations(eq, risk, failureProb);
  const replacement = computeReplacementRecommendation(eq, risk);
  return { ...eq, _ai: { risk, failureProb, window, priority, reliability, recommendations, replacement } };
}

export function enrichEquipmentList(list: any[], thresholds: any) {
  return list.map((eq) => attachAI(eq, thresholds));
}

export { computeNotifications };

/** Returns the list of profile rows (deduped) who should be emailed for
 * this notification item, given the hospital's routing rules above. */
export function recipientsForNotification(
  item: any,
  equipmentById: Map<string, any>,
  profilesByRole: Record<string, any[]>,
) {
  const eq = equipmentById.get(item.equipmentId);
  const isHighCriticality = eq?.clinicalCriticality === "Critical" || eq?.clinicalCriticality === "High";
  const bmes = profilesByRole["Biomedical Engineer"] || [];
  const heads = profilesByRole["Head of Biomedical Engineering"] || [];

  const recipients: any[] = [];

  switch (item.type) {
    case "fault-report":
      recipients.push(...bmes);
      if (item.severity === "high" || isHighCriticality) recipients.push(...heads);
      break;
    case "maintenance-overdue":
      recipients.push(...bmes, ...heads);
      break;
    case "maintenance-due":
      recipients.push(...bmes);
      break;
    case "ai-prediction":
      recipients.push(...bmes);
      if (item.severity === "critical") recipients.push(...heads);
      break;
    case "calibration-due":
    case "warranty-expiry":
      recipients.push(...bmes);
      break;
  }

  // Department Staff never gets equipment-fleet notifications generally —
  // only ever their own reported fault, handled separately by callers
  // (both Edge Functions add the reporter in explicitly when relevant,
  // since that's a per-ticket match, not a role-wide broadcast).

  const seen = new Set<string>();
  return recipients.filter((p) => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function groupProfilesByRole(profiles: any[]) {
  const byRole: Record<string, any[]> = {};
  for (const p of profiles) {
    if (!p.active) continue;
    (byRole[p.role] ||= []).push(p);
  }
  return byRole;
}

export function emailHtmlForItems(recipientName: string, items: any[], appUrl: string) {
  const rows = items
    .map(
      (i) => `<li style="margin-bottom:10px;"><strong>${escapeHtml(i.title)}</strong><br>${escapeHtml(i.message)}</li>`,
    )
    .join("");
  return `
    <div style="font-family:sans-serif;max-width:560px;">
      <p>Hi ${escapeHtml(recipientName || "there")},</p>
      <p>Here's what's waiting for you in MedTrack:</p>
      <ul style="padding-left:20px;">${rows}</ul>
      <p><a href="${escapeHtml(appUrl)}" style="color:#2563eb;">Open MedTrack</a></p>
      <p style="color:#888;font-size:12px;">You're receiving this because of your role in MedTrack's equipment maintenance system. Notification preferences can be adjusted in Settings.</p>
    </div>
  `;
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
