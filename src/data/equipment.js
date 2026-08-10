import {
  Wind, HeartPulse, Activity, Syringe, Zap, Radar, ScanLine, Scan, Brain,
  Stethoscope, Baby, FlaskConical, Lightbulb, Droplet,
} from "lucide-react";
import {
  computeRiskScore, computeFailureProbability, computePredictedWindow,
  computePriority, computeReliabilityStats, computeRecommendations,
  computeReplacementRecommendation,
} from "../lib/riskEngine.js";

export const CATEGORY_ICON = {
  Ventilator: Wind,
  "Patient Monitor": Activity,
  "ECG Machine": HeartPulse,
  "Infusion Pump": Syringe,
  Defibrillator: Zap,
  "Ultrasound Machine": Radar,
  "X-Ray Machine": ScanLine,
  "CT Scanner": Scan,
  "MRI Machine": Brain,
  "Anaesthesia Machine": Stethoscope,
  Incubator: Baby,
  Autoclave: FlaskConical,
  "Operating Theatre Equipment": Lightbulb,
  "Dialysis Machine": Droplet,
};

export const STATUSES = ["Operational", "Under Maintenance", "Under Repair", "Out of Service", "Decommissioned"];
export const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"];

function attachAI(eq, thresholds) {
  const risk = computeRiskScore(eq, thresholds);
  const failureProb = computeFailureProbability(eq, risk);
  const window = computePredictedWindow(eq, risk, failureProb);
  const priority = computePriority(eq, risk, failureProb);
  const reliability = computeReliabilityStats(eq);
  const recommendations = computeRecommendations(eq, risk, failureProb);
  const replacement = computeReplacementRecommendation(eq, risk);
  return { risk, failureProb, window, priority, reliability, recommendations, replacement };
}

/** Attaches (or refreshes) the `_ai` block on a single equipment record. `thresholds` comes from Settings → Risk & AI. */
export function recomputeAI(eq, thresholds) {
  return { ...eq, _ai: attachAI(eq, thresholds) };
}

/** Attaches `_ai` across a whole list — used when seeding/loading equipment. */
export function enrichEquipmentList(list, thresholds) {
  return list.map((eq) => recomputeAI(eq, thresholds));
}
