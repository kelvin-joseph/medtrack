// Rule-based natural-language engine for the Biomedical AI Center.
//
// This is deliberately a pure, synchronous function of (message, equipment
// list, context equipment) — no I/O, no async — so `aiAssistantService.js`
// can wrap it in a Promise today and swap the wrapper's internals for a
// real hosted-LLM call later without this file, or the chat UI, needing to
// change at all.
//
// Scope: this assistant is a biomedical engineering colleague, not a
// general-purpose chatbot. It answers questions about medical equipment,
// troubleshooting, preventive maintenance, calibration, electrical safety,
// repair workflows, clinical engineering practice, and equipment
// operation/maintenance — and politely declines anything outside that
// (politics, entertainment, sports, finance/investing, or clinical
// diagnosis/prescription of a patient).

import { fmtDate, daysBetween, NOW } from "./dates.js";
import { searchErrorCodes } from "./errorCodes.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

/* ---------------------------- topic scope guard ---------------------------- */

const OFF_TOPIC_PATTERNS = [
  {
    category: "politics",
    re: /\b(election|president(?!ial\s+equipment)|senator|congress|political part(y|ies)|prime minister|geopolitics|government policy|vote for|democrat|republican)\b/i,
  },
  {
    category: "entertainment",
    re: /\b(movie|netflix|tv show|celebrity|song lyrics|music album|actor|actress|box office)\b/i,
  },
  {
    category: "sports",
    re: /\b(football match|basketball|world cup|premier league|nba|nfl|olympics|who won the (game|match))\b/i,
  },
  {
    category: "finance",
    re: /\b(stock market|stock price|cryptocurrency|bitcoin|invest(ment)?s?\b(?!.*(equipment|replacement))|forex|share price|mortgage|401k)\b/i,
  },
  {
    category: "diagnosis",
    re: /\b(diagnose (me|him|her|the patient)|what disease do i have|do i have (cancer|diabetes|covid)|is this (mole|rash|lump) cancerous|symptoms of (my|a) (illness|disease))\b/i,
  },
  {
    category: "prescription",
    re: /\b(prescribe|what dosage of|dosage for (me|my)|which medication should i take|can i take .* (mg|milligrams))\b/i,
  },
];

const IN_SCOPE_OVERRIDE =
  /\b(equipment|ventilator|monitor|infusion|defibrillator|calibrat|maintenance|repair|fault|error code|alarm|sterile|autoclave|dialysis|anaesthesia|anesthesia|biomedical|clinical engineer|leakage current|iec 60601|electrical safety)\b/i;

/** Returns an off-topic category if the message is clearly outside the
 * assistant's biomedical-engineering scope, otherwise null. A message that
 * also contains a clear biomedical/equipment term is let through — e.g.
 * "what's the maintenance cost trend" should never be caught by the
 * finance filter. */
export function detectOffTopic(message) {
  if (IN_SCOPE_OVERRIDE.test(message)) return null;
  for (const { category, re } of OFF_TOPIC_PATTERNS) {
    if (re.test(message)) return category;
  }
  return null;
}

export function offTopicReply(category) {
  const base =
    "I'm scoped specifically to biomedical engineering — equipment troubleshooting, preventive maintenance, calibration, electrical safety, repair workflows, and clinical engineering practice. ";
  if (category === "diagnosis" || category === "prescription") {
    return (
      base +
      "I can't help with diagnosing a patient's condition or advising on medications — that needs a qualified clinician. Happy to help with the equipment side of things, though."
    );
  }
  return (
    base +
    "I'm not able to help with that topic, but ask me anything about your equipment fleet, an alarm/error code, a maintenance question, or clinical engineering best practice."
  );
}

export function findMentionedEquipment(message, equipment) {
  const lower = message.toLowerCase();
  // Longer names first so "CT Scanner SOMATOM" doesn't get shadowed by a
  // shorter partial match elsewhere in the fleet.
  const sorted = [...equipment].sort((a, b) => b.name.length - a.name.length);
  return sorted.find(
    (eq) =>
      lower.includes(eq.name.toLowerCase()) ||
      lower.includes(eq.assetTag.toLowerCase()),
  );
}

function matchIntent(message) {
  const m = message.toLowerCase();
  if (/\b(hi|hello|hey|help|what can you do|how does this work)\b/.test(m))
    return "greeting";
  if (/\b(error code|fault code|alarm code)\b/.test(m)) return "error-code";
  if (
    searchErrorCodes(message.trim()).length > 0 &&
    /^[a-z0-9\-\s]{2,20}$/i.test(message.trim())
  )
    return "error-code";
  if (/\b(why|explain|reason|factor)\b/.test(m) && /\b(risk|score)\b/.test(m))
    return "why-risk";
  if (/\b(risk|score)\b/.test(m)) return "risk";
  if (/\b(fail|failure|probability|chance|likely)\b/.test(m))
    return "failure-probability";
  if (/\b(window|when will it (fail|break)|predicted)\b/.test(m))
    return "predicted-window";
  if (/\b(maintenance|due|service|schedule|overdue)\b/.test(m))
    return "maintenance";
  if (/\b(calibrat)\b/.test(m)) return "calibration";
  if (/\b(warranty)\b/.test(m)) return "warranty";
  if (/\b(fault|repair|breakdown|history|broken|issue)\b/.test(m))
    return "fault-history";
  if (/\b(recommend|should i|advice|action|what.*do)\b/.test(m))
    return "recommendations";
  if (/\b(replace|replacement)\b/.test(m)) return "replacement";
  if (/\b(condition|status|health)\b/.test(m)) return "condition";
  if (/\b(top|highest|worst|most urgent|which equipment|priority)\b/.test(m))
    return "top-risk";
  return "unknown";
}

function topRiskSummary(equipment) {
  const top = [...equipment]
    .sort((a, b) => b._ai.risk.score - a._ai.risk.score)
    .slice(0, 3);
  if (top.length === 0) return "There's no equipment on file yet to rank.";
  const lines = top.map(
    (eq, i) =>
      `${i + 1}. ${eq.name} (${eq.assetTag}) — ${eq._ai.risk.score}/100, ${eq._ai.risk.level} risk`,
  );
  return `Here's the current highest-risk equipment:\n\n${lines.join("\n")}\n\nAsk me about any of these by name for details.`;
}

function replyFor(intent, eq) {
  if (!eq) return null;
  const {
    risk,
    failureProb,
    window,
    priority,
    reliability,
    recommendations,
    replacement,
  } = eq._ai;

  switch (intent) {
    case "why-risk":
    case "risk":
      return (
        `${eq.name} has a risk score of ${risk.score}/100 (${risk.level} risk). Here's why:\n\n` +
        risk.explanation.map((e) => `• ${e}`).join("\n")
      );

    case "failure-probability":
      return (
        `Estimated failure probability for ${eq.name}:\n\n` +
        `• Next 30 days: ${failureProb.p30}%\n` +
        `• Next 90 days: ${failureProb.p90}%\n` +
        `• Next 6 months: ${failureProb.p180}%\n` +
        `• Next 12 months: ${failureProb.p365}%\n\n` +
        (failureProb.confidenceNote
          ? failureProb.confidenceNote
          : `Confidence in this estimate: ${failureProb.confidence}.`) +
        `\n\nThis is a decision-support estimate, not a guaranteed outcome.`
      );

    case "predicted-window":
      return window.start
        ? `${eq.name}'s predicted failure window is ${fmtDate(window.start)} – ${fmtDate(window.end)}, at roughly ${window.confidencePercent}% confidence. Main contributing factors: ${window.factors.join("; ")}. Recommended action: ${window.recommendedAction}.`
        : `There isn't enough maintenance history on ${eq.name} yet for a reliable predicted failure window. ${failureProb.confidenceNote || ""}`;

    case "maintenance": {
      const overdueDays = daysBetween(eq.nextMaintenanceDate, NOW);
      const status =
        overdueDays > 0
          ? `overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`
          : `due ${fmtDate(eq.nextMaintenanceDate)}`;
      return `${eq.name}'s next preventive maintenance is ${status}. Last serviced ${fmtDate(eq.lastMaintenanceDate)}, assigned to ${eq.assignedEngineer}.`;
    }

    case "calibration": {
      const calOverdue = daysBetween(eq.nextCalibrationDate, NOW);
      const status =
        calOverdue > 0
          ? `overdue by ${calOverdue} day${calOverdue === 1 ? "" : "s"}`
          : `due ${fmtDate(eq.nextCalibrationDate)}`;
      return `${eq.name}'s calibration is ${status}. Last calibrated ${fmtDate(eq.lastCalibrationDate)}.`;
    }

    case "warranty": {
      const warrantyDays = daysBetween(NOW, eq.warrantyExpiry);
      const status =
        warrantyDays < 0
          ? `expired ${fmtDate(eq.warrantyExpiry)}`
          : `active until ${fmtDate(eq.warrantyExpiry)} (${warrantyDays} days remaining)`;
      return `${eq.name}'s warranty is ${status}, through ${eq.vendor}.`;
    }

    case "fault-history": {
      if (eq.repairRecords.length === 0)
        return `${eq.name} has no recorded breakdowns or repairs on file.`;
      const recent = eq.repairRecords
        .slice(0, 3)
        .map(
          (r) =>
            `• ${fmtDate(r.date)}: ${r.faultDescription} (${r.finalStatus})`,
        )
        .join("\n");
      return (
        `${eq.name} has ${reliability.breakdownCount} recorded breakdown${reliability.breakdownCount === 1 ? "" : "s"}, ` +
        `${reliability.mttr ? `averaging ${reliability.mttr.toFixed(1)}h to repair (MTTR)` : ""}` +
        `${reliability.mtbf ? `, roughly every ${reliability.mtbf} days between failures (MTBF)` : ""}.\n\nMost recent:\n${recent}`
      );
    }

    case "recommendations":
      return (
        `For ${eq.name} (${priority.priority} priority — ${priority.reason}):\n\n` +
        recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")
      );

    case "replacement":
      return replacement.reasons.length > 0
        ? `Replacement priority for ${eq.name}: ${replacement.priority}.\n\n${replacement.reasons.map((r) => `• ${r}`).join("\n")}`
        : `${eq.name} doesn't show any replacement concerns right now.`;

    case "condition":
      return `${eq.name} is currently ${eq.status}, in ${eq.condition} condition, with a ${risk.level} risk rating (${risk.score}/100).`;

    default:
      return (
        `Here's a quick summary of ${eq.name}: ${risk.level} risk (${risk.score}/100), ` +
        `${failureProb.p90}% failure probability within 90 days, priority: ${priority.priority}. ` +
        `Ask me "why is it high risk", "when is maintenance due", "what's its fault history", or "what should I do" for more detail.`
      );
  }
}

/**
 * Looks up a free-text query against the error-code reference database.
 */
function errorCodeReply(message) {
  const matches = searchErrorCodes(message.trim());
  if (matches.length === 0) {
    return "I don't recognize that error/fault code in my reference database. Double-check the exact code shown on the unit's display or printout, or tell me the equipment category and symptom and I'll help you reason through it.";
  }
  const top = matches.slice(0, 2);
  return top
    .map(
      (e) =>
        `**${e.code} — ${e.title}** (${e.category})\n` +
        `${e.meaning}\n\n` +
        `Likely causes:\n${e.likelyCauses.map((c) => `• ${c}`).join("\n")}\n\n` +
        `Troubleshooting steps:\n${e.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` +
        `⚠ ${e.safety}`,
    )
    .join("\n\n---\n\n");
}

function knowledgeBaseReply(message) {
  const matches = searchKnowledgeBase(message.trim());
  if (matches.length === 0) {
    return null;
  }
  const top = matches[0];
  return (
    `**${top.title}** (${top.topic})\n${top.summary}\n\n` +
    top.content.map((line) => `• ${line}`).join("\n")
  );
}

/**
 * Main entry point. Returns { text, matchedEquipmentId }.
 * `contextEquipment` is whichever equipment is currently featured/selected
 * on the AI Center — used when the message doesn't name one.
 */
export function generateAssistantReply({
  message,
  equipment,
  contextEquipment,
}) {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      text: "Go ahead and ask me something about your equipment's risk, maintenance, fault history, an error code, or a biomedical engineering question.",
      matchedEquipmentId: null,
    };
  }

  const offTopic = detectOffTopic(trimmed);
  if (offTopic) {
    return { text: offTopicReply(offTopic), matchedEquipmentId: null };
  }

  const intent = matchIntent(trimmed);

  if (intent === "greeting") {
    return {
      text:
        "I'm your biomedical AI colleague. I can explain risk scores, failure probability, predicted failure windows, " +
        "maintenance and calibration status, fault/repair history, and recommended actions for any equipment on file — " +
        "I can also look up an alarm/error code, or answer general biomedical engineering questions on maintenance, " +
        "calibration, electrical safety, and repair workflow. Try naming a device, pasting an error code, or asking " +
        '"which equipment needs attention right now".',
      matchedEquipmentId: null,
    };
  }

  if (intent === "error-code") {
    return { text: errorCodeReply(trimmed), matchedEquipmentId: null };
  }

  if (intent === "top-risk") {
    return { text: topRiskSummary(equipment), matchedEquipmentId: null };
  }

  const mentioned = findMentionedEquipment(trimmed, equipment);
  const target = mentioned || contextEquipment;

  if (!target) {
    // No equipment named or in context — try the knowledge base before
    // giving up, since a lot of legitimate biomedical questions ("how do I
    // calibrate an infusion pump", "what's IEC 60601 leakage current")
    // aren't about a specific device on file.
    const kb = knowledgeBaseReply(trimmed);
    if (kb) return { text: kb, matchedEquipmentId: null };

    return {
      text:
        equipment.length === 0
          ? "There's no equipment on file yet — add some or load the demo fleet, then ask me again. In the meantime, I can still answer general biomedical engineering questions."
          : "I couldn't tell which equipment you mean, and couldn't find a matching topic in the knowledge base. Try naming a device directly, pasting an error code, or asking \"which equipment needs attention right now\".",
      matchedEquipmentId: null,
    };
  }

  const text = replyFor(intent, target);
  return {
    text:
      text ||
      "I'm not sure how to answer that yet — try asking about risk, maintenance, calibration, fault history, or recommendations.",
    matchedEquipmentId: target.id,
  };
}

/**
 * Proactive AI observations — the same kind of insight a biomedical
 * engineering colleague would volunteer without being asked. Pulled from
 * live equipment state (overdue maintenance, high failure probability,
 * repeated breakdowns) and phrased in natural language for the AI
 * Center's Command Center feed.
 */
export function generateProactiveInsights(equipment, limit = 6) {
  const insights = [];

  for (const eq of equipment) {
    const { risk, failureProb } = eq._ai;
    const overdueDays = daysBetween(eq.nextMaintenanceDate, NOW);
    const recent12mo = eq.repairRecords.filter(
      (r) => daysBetween(r.date, NOW) <= 365,
    );

    if (overdueDays > 0 && risk.score >= 60) {
      insights.push({
        id: `${eq.id}-pm-risk`,
        equipmentId: eq.id,
        severity: "critical",
        text: `${eq.name} has missed ${Math.max(1, Math.round(overdueDays / 30))} maintenance cycle${overdueDays > 45 ? "s" : ""}. Current risk score: ${risk.score}%. Preventive maintenance is recommended within the next ${overdueDays > 14 ? "3" : "7"} days.`,
      });
    } else if (overdueDays > 0) {
      insights.push({
        id: `${eq.id}-pm`,
        equipmentId: eq.id,
        severity: "warning",
        text: `${eq.name} is overdue for preventive maintenance by ${overdueDays} day${overdueDays === 1 ? "" : "s"}. Recommend scheduling this week.`,
      });
    }

    if (failureProb.p90 >= 60) {
      insights.push({
        id: `${eq.id}-failprob`,
        equipmentId: eq.id,
        severity: "critical",
        text: `${eq.name} is showing a ${failureProb.p90}% probability of failure within 90 days. Recommend prioritizing inspection ahead of routine schedule.`,
      });
    }

    if (recent12mo.length >= 3) {
      insights.push({
        id: `${eq.id}-repeat`,
        equipmentId: eq.id,
        severity: "warning",
        text: `${eq.name} has had ${recent12mo.length} breakdowns in the last 12 months. This pattern suggests an unresolved root cause rather than isolated faults — worth a deeper investigation.`,
      });
    }

    const calOverdue = daysBetween(eq.nextCalibrationDate, NOW);
    if (calOverdue > 30) {
      insights.push({
        id: `${eq.id}-cal`,
        equipmentId: eq.id,
        severity: "warning",
        text: `${eq.name}'s calibration expired ${calOverdue} days ago. Measurements from this device shouldn't be trusted clinically until it's recalibrated.`,
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return insights
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, limit);
}
