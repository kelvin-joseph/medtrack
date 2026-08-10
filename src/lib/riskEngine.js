// Rule-based risk & predictive-failure engine.
//
// This is the "initial fallback" model described in the brief: transparent,
// explainable, and usable with zero historical data. It's designed so a
// future ML model could slot in behind the same function signatures
// (computeRiskScore, computeFailureProbability, computePredictedWindow)
// without the UI needing to change.

import { NOW, DAY, daysBetween } from "./dates.js";

/** Small deterministic string hash — used to seed per-equipment visual variation. */
export function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const USAGE_WEIGHT = { "Very High": 1, High: 0.8, Medium: 0.5, Low: 0.25 };
const CRITICALITY_WEIGHT = {
  Critical: 1,
  High: 0.75,
  Moderate: 0.5,
  Low: 0.25,
};
const CRITICALITY_BY_CATEGORY = {
  Ventilator: "Critical",
  "Anaesthesia Machine": "Critical",
  Defibrillator: "Critical",
  Incubator: "Critical",
  "Patient Monitor": "High",
  "Infusion Pump": "High",
  "CT Scanner": "High",
  "MRI Machine": "High",
  "Dialysis Machine": "High",
  Autoclave: "High",
  "X-Ray Machine": "Moderate",
  "Ultrasound Machine": "Moderate",
  "ECG Machine": "Moderate",
  "Operating Theatre Equipment": "Moderate",
};

export function defaultCriticality(category) {
  return CRITICALITY_BY_CATEGORY[category] || "Moderate";
}

function recentRepairs(eq, days = 365) {
  return eq.repairRecords.filter((r) => daysBetween(r.date, NOW) <= days);
}

function totalDowntimeHours(eq, days = 365) {
  return recentRepairs(eq, days).reduce(
    (sum, r) => sum + (r.downtimeHours || 0),
    0,
  );
}

const DEFAULT_THRESHOLDS = { low: 20, moderate: 40, high: 60 }; // upper bound of each band; critical is anything above `high`

/**
 * Risk score 0-100. Bands are configurable via Settings → Risk & AI
 * (System Administrator); these are the defaults matching the brief:
 *  0-20 Very Low · 21-40 Low · 41-60 Moderate · 61-80 High · 81-100 Critical
 */
export function computeRiskScore(eq, thresholds = DEFAULT_THRESHOLDS) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // Any of these being missing/invalid used to silently produce a NaN score
  // — and since NaN fails every `<=` threshold check below, it fell through
  // to the final `else` and displayed as "Critical", the worst possible
  // label, for a data-entry gap rather than an actual risk finding. Missing
  // inputs are tracked here and called out in the explanation instead.
  const missingFields = [];

  const rawAgeDays = daysBetween(eq.installDate, NOW);
  const hasValidAge = Number.isFinite(rawAgeDays);
  if (!hasValidAge) missingFields.push("install date");
  const ageYears = hasValidAge ? rawAgeDays / 365 : 0;

  const lifespan = eq.expectedLifespanYears > 0 ? eq.expectedLifespanYears : 10;
  if (!(eq.expectedLifespanYears > 0))
    missingFields.push("expected useful life");

  const ageRatio = Math.min(ageYears / lifespan, 1.3) / 1.3;
  const ageFactor = ageRatio * 20;

  const usageFactor = (USAGE_WEIGHT[eq.usageFrequency] ?? 0.5) * 15;

  const breakdowns12mo = recentRepairs(eq, 365).length;
  const breakdownFactor = Math.min(breakdowns12mo / 4, 1) * 20;

  const rawDaysOverdue = daysBetween(eq.nextMaintenanceDate, NOW);
  const hasValidNextMaintenance = Number.isFinite(rawDaysOverdue);
  if (!hasValidNextMaintenance) missingFields.push("next maintenance date");
  const daysOverdue = hasValidNextMaintenance ? Math.max(0, rawDaysOverdue) : 0;
  const overdueFactor = Math.min(daysOverdue / 30, 1) * 15;

  const downtimeFactor = Math.min(totalDowntimeHours(eq, 365) / 200, 1) * 10;

  const costs = eq.repairRecords.map((r) => r.cost || 0);
  const costTrendUp = costs.length >= 2 && costs[costs.length - 1] > costs[0];
  const repairFactor =
    Math.min(eq.repairRecords.length / 5, 1) * 5 + (costTrendUp ? 5 : 0);

  const criticalityFactor =
    (CRITICALITY_WEIGHT[eq.clinicalCriticality] ?? 0.5) * 10;

  const score = Math.round(
    ageFactor +
      usageFactor +
      breakdownFactor +
      overdueFactor +
      downtimeFactor +
      repairFactor +
      criticalityFactor,
  );
  const clamped = Math.max(0, Math.min(100, score));

  let level, color;
  if (clamped <= t.low) {
    level = "Very Low";
    color = "#1F9D6B";
  } else if (clamped <= t.moderate) {
    level = "Low";
    color = "#5FB88B";
  } else if (clamped <= t.high) {
    level = "Moderate";
    color = "#D89A1F";
  } else if (clamped <= t.high + 20) {
    level = "High";
    color = "#E07A2F";
  } else {
    level = "Critical";
    color = "#D9364B";
  }

  // Human-readable "why" bullets, in order of contribution.
  const explanation = [];
  if (missingFields.length > 0) {
    explanation.push(
      `⚠ Partial estimate — missing: ${missingFields.join(", ")}. Fill these in on the equipment record for an accurate score.`,
    );
  }
  explanation.push(
    `${ageYears.toFixed(1)} years old (expected lifespan ${lifespan} years)`,
  );
  if (breakdowns12mo > 0)
    explanation.push(
      `${breakdowns12mo} breakdown${breakdowns12mo === 1 ? "" : "s"} in the last 12 months`,
    );
  if (daysOverdue > 0)
    explanation.push(
      `Preventive maintenance overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
    );
  if (eq.usageFrequency === "Very High" || eq.usageFrequency === "High")
    explanation.push(
      `Operating at ${eq.usageFrequency.toLowerCase()} utilization`,
    );
  if (costTrendUp)
    explanation.push("Repair cost trending upward over recent incidents");
  if (totalDowntimeHours(eq, 365) > 0)
    explanation.push(
      `${Math.round(totalDowntimeHours(eq, 365))} hours of downtime in the last 12 months`,
    );
  explanation.push(`Clinical criticality: ${eq.clinicalCriticality}`);

  return {
    score: clamped,
    level,
    color,
    breakdown: {
      age: Math.round(ageFactor),
      usage: Math.round(usageFactor),
      breakdowns: Math.round(breakdownFactor),
      overdue: Math.round(overdueFactor),
      downtime: Math.round(downtimeFactor),
      repairs: Math.round(repairFactor),
      criticality: Math.round(criticalityFactor),
    },
    explanation,
  };
}

const HISTORY_DEPTH_FOR = (eq) =>
  eq.maintenanceRecords.length + eq.repairRecords.length;

/** Failure probability at 30/90/180/365 days, scaled from the risk score. */
export function computeFailureProbability(eq, risk) {
  const s = risk.score / 100;
  const p30 = Math.round(Math.min(97, s * 22));
  const p90 = Math.round(Math.min(97, s * 48));
  const p180 = Math.round(Math.min(97, s * 68));
  const p365 = Math.round(Math.min(97, s * 88));

  const depth = HISTORY_DEPTH_FOR(eq);
  let confidence, confidenceNote;
  if (depth >= 5) {
    confidence = "High";
    confidenceNote = null;
  } else if (depth >= 2) {
    confidence = "Moderate";
    confidenceNote = null;
  } else {
    confidence = "Low";
    confidenceNote =
      "Prediction confidence is low due to insufficient historical data.";
  }

  return { p30, p90, p180, p365, confidence, confidenceNote };
}

/** Predicted failure window (a range, not a single date) + contributing factors. */
export function computePredictedWindow(eq, risk, failureProb) {
  if (failureProb.confidence === "Low") {
    return {
      start: null,
      end: null,
      confidencePercent: null,
      factors: risk.explanation.slice(0, 3),
      recommendedAction: recommendedAction(risk, failureProb, eq),
    };
  }

  // Higher risk → sooner and narrower window.
  const centerDays = Math.max(14, Math.round(400 - risk.score * 3.4));
  const spread = Math.round(centerDays * 0.35);
  const start = new Date(NOW.getTime() + (centerDays - spread) * DAY);
  const end = new Date(NOW.getTime() + (centerDays + spread) * DAY);
  const confidencePercent = Math.round(
    50 + Math.min(HISTORY_DEPTH_FOR(eq), 10) * 3.5,
  );

  return {
    start,
    end,
    confidencePercent,
    factors: risk.explanation.slice(0, 4),
    recommendedAction: recommendedAction(risk, failureProb, eq),
  };
}

function recommendedAction(risk, failureProb, eq) {
  if (risk.level === "Critical") return "Immediate inspection recommended";
  if (risk.level === "High") return "Schedule maintenance within 7 days";
  if (risk.level === "Moderate") return "Schedule maintenance within 30 days";
  return "Continue routine monitoring";
}

/** Combines failure probability + clinical criticality into an overall priority. */
export function computePriority(eq, risk, failureProb) {
  const crit = eq.clinicalCriticality;
  const p90 = failureProb.p90;

  let priority, reason;
  if (crit === "Critical" && p90 >= 60) {
    priority = "Emergency";
    reason = "Critical equipment with high near-term failure probability";
  } else if (
    (crit === "Critical" && p90 >= 35) ||
    (crit === "High" && p90 >= 60)
  ) {
    priority = "Critical";
    reason = "High-criticality equipment trending toward failure";
  } else if (
    (crit === "High" && p90 >= 35) ||
    (crit === "Moderate" && p90 >= 60)
  ) {
    priority = "High";
    reason = "Elevated failure probability for this equipment's criticality";
  } else if (p90 >= 20) {
    priority = "Medium";
    reason = "Moderate failure probability";
  } else {
    priority = "Low";
    reason = "Low failure probability at current condition";
  }

  return { priority, reason };
}

/** Mean Time To Repair (avg downtime hours per resolved repair) + Mean Time Between Failures (days). */
export function computeReliabilityStats(eq) {
  const resolved = eq.repairRecords.filter((r) => r.downtimeHours != null);
  const mttr = resolved.length
    ? resolved.reduce((s, r) => s + r.downtimeHours, 0) / resolved.length
    : null;

  const operatingDays = daysBetween(eq.installDate, NOW);
  const mtbf =
    eq.repairRecords.length && Number.isFinite(operatingDays)
      ? Math.round(operatingDays / eq.repairRecords.length)
      : null;

  const totalDowntime = eq.repairRecords.reduce(
    (s, r) => s + (r.downtimeHours || 0),
    0,
  );
  const totalCost = [...eq.maintenanceRecords, ...eq.repairRecords].reduce(
    (s, r) => s + (r.cost || 0),
    0,
  );

  return {
    mttr,
    mtbf,
    totalDowntime,
    totalCost,
    breakdownCount: eq.repairRecords.length,
  };
}

/** AI-style maintenance recommendations, phrased as decision support (not autonomous decisions). */
export function computeRecommendations(eq, risk, failureProb) {
  const recs = [];
  const daysOverdue = Math.max(0, daysBetween(eq.nextMaintenanceDate, NOW));
  if (daysOverdue > 0)
    recs.push(
      `Schedule preventive maintenance within 7 days (overdue by ${daysOverdue} days).`,
    );

  const recurring = eq.repairRecords.filter(
    (r) => r.finalStatus && r.finalStatus.toLowerCase().includes("recurring"),
  );
  if (recurring.length > 0) {
    recs.push(
      `Equipment has experienced ${recurring.length + 1} similar failure${recurring.length > 0 ? "s" : ""}. Investigate recurring root cause.`,
    );
  }

  const costs = eq.repairRecords.map((r) => r.cost || 0);
  if (costs.length >= 2) {
    const change =
      ((costs[costs.length - 1] - costs[0]) / Math.max(costs[0], 1)) * 100;
    if (change > 25)
      recs.push(
        `Maintenance cost has increased by ${Math.round(change)}% across recent repairs. Consider replacement review.`,
      );
  }

  if (failureProb.p90 >= 60)
    recs.push(
      "Inspect high-wear components (battery, sensors, seals) at next visit.",
    );
  if (daysBetween(eq.installDate, NOW) / 365 >= eq.expectedLifespanYears)
    recs.push(
      "Equipment has exceeded its expected useful life — prioritize replacement assessment.",
    );

  if (recs.length === 0)
    recs.push(
      "No urgent action needed — continue routine preventive maintenance.",
    );
  return recs;
}

/** AI-assisted replacement recommendation for the lifecycle module. */
export function computeReplacementRecommendation(eq, risk) {
  const ageYears = daysBetween(eq.installDate, NOW) / 365;
  const reasons = [];
  if (ageYears >= eq.expectedLifespanYears)
    reasons.push("Equipment age exceeds expected useful life");
  if (eq.repairRecords.length >= 3) reasons.push("High repair frequency");
  const costs = eq.repairRecords.map((r) => r.cost || 0);
  if (costs.length >= 2 && costs[costs.length - 1] > costs[0] * 1.25)
    reasons.push("Increasing maintenance costs");
  if (risk.score >= 61) reasons.push("High failure probability");

  let priority = "Low";
  if (reasons.length >= 3) priority = "HIGH PRIORITY";
  else if (reasons.length === 2) priority = "MEDIUM PRIORITY";
  else if (reasons.length === 1) priority = "MONITOR";

  return { priority, reasons };
}
