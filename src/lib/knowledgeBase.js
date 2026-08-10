// Curated clinical/biomedical engineering knowledge base — general
// reference material (not tied to a specific equipment record) covering
// the domains the AI Center is scoped to: preventive maintenance,
// calibration, electrical safety, repair workflow, and clinical
// engineering practice.

export const KNOWLEDGE_BASE = [
  {
    id: "kb-pm-program",
    topic: "Preventive Maintenance",
    title: "Building a Risk-Based PM Schedule",
    summary: "How to set PM intervals using clinical criticality and manufacturer guidance instead of a flat calendar interval.",
    content: [
      "Start from the manufacturer's recommended PM interval and checklist — this is the compliance floor, not a ceiling.",
      "Layer in clinical criticality: life-support and critical-alarm equipment (ventilators, defibrillators, infusion pumps) generally warrant more frequent PM than low-criticality equipment, even if the OEM interval is the same.",
      "Factor in usage intensity — a ventilator running near-continuous ICU duty accumulates wear faster than the same model on standby.",
      "Track PM compliance rate as a KPI (target is commonly 100% for life-support equipment, ≥90% fleet-wide) and review overdue items weekly.",
      "Document every PM with: date, checklist completed, engineer, parts/consumables used, and any as-found abnormal readings — this history is what future risk scoring and audits both depend on.",
    ],
  },
  {
    id: "kb-pm-checklist",
    topic: "Preventive Maintenance",
    title: "Generic PM Checklist Structure",
    summary: "The core checklist categories most biomedical equipment PM procedures share, regardless of device type.",
    content: [
      "Visual/mechanical inspection: housing, cables, connectors, casters, mounting hardware.",
      "Power system check: power cord condition, battery health/runtime, charging function.",
      "Functional test: the device performs its core clinical function within spec (using a simulator/analyzer where applicable).",
      "Alarm and safety interlock test: confirm all critical alarms trigger and are audible/visible as designed.",
      "Calibration check: verify sensors/measurement systems read within tolerance against a reference standard.",
      "Cleaning and consumable replacement: filters, seals, batteries with defined service life.",
      "Electrical safety test: leakage current and ground continuity per IEC 60601-1 (see the Electrical Safety article).",
    ],
  },
  {
    id: "kb-calibration-basics",
    topic: "Calibration",
    title: "Calibration vs. Verification vs. Adjustment",
    summary: "Three related but distinct terms that are often used interchangeably — and shouldn't be.",
    content: [
      "Calibration is the act of comparing a device's output against a traceable reference standard and recording the deviation — it does not, by itself, change the device.",
      "Verification confirms a device is still within its stated tolerance; it's a pass/fail check, often done more frequently than full calibration.",
      "Adjustment is physically or electronically correcting the device to bring it back within tolerance after calibration reveals drift.",
      "A defensible calibration record includes: date, reference standard used (with its own current calibration/traceability), as-found readings, as-left readings (if adjusted), and the technician's identity.",
      "Never adjust a device using a reference standard that is itself out of calibration — this simply propagates error.",
    ],
  },
  {
    id: "kb-calibration-intervals",
    topic: "Calibration",
    title: "Setting Calibration Intervals",
    summary: "How to decide how often a given device or sensor needs calibration.",
    content: [
      "Default to the manufacturer's stated interval as the baseline.",
      "Shorten the interval for devices with a history of drift, or that operate in harsh conditions (temperature extremes, vibration, frequent transport).",
      "Lengthen the interval only with documented historical evidence the device consistently calibrates well within tolerance across several cycles — and only where regulatory/accreditation requirements permit it.",
      "High-consequence measurement devices (defibrillator energy delivery, ventilator O2/flow sensors, infusion pump flow rate) should generally not have calibration intervals extended purely for convenience.",
    ],
  },
  {
    id: "kb-electrical-safety-basics",
    topic: "Electrical Safety",
    title: "IEC 60601-1 Leakage Current Basics",
    summary: "What leakage current testing actually measures and why the limits exist.",
    content: [
      "IEC 60601-1 defines allowable leakage current limits (earth leakage, enclosure leakage, patient leakage/auxiliary current) to keep unintended current paths through a patient or operator below a physiologically safe threshold.",
      "Limits are tighter for Type BF and especially Type CF applied parts (direct cardiac connection) than for Type B, reflecting the higher risk of a direct-to-heart current path.",
      "Test under both normal condition (NC) and single fault condition (SFC, e.g. reversed polarity, open ground) — a device can pass NC and still fail SFC if internal insulation is marginal.",
      "A failed leakage test is a stop-use condition, not a note-and-monitor condition — the equipment should be quarantined from patient use until it passes.",
      "Common root causes of leakage failures in the field: cracked/pinched power cords, moisture ingress, and degraded internal insulation with age — check the cheap, fast items (cord, plug) before assuming an internal fault.",
    ],
  },
  {
    id: "kb-electrical-safety-grounding",
    topic: "Electrical Safety",
    title: "Ground Continuity and Isolated Power Systems",
    summary: "Why hospital-grade grounding and isolated power exist, and what a biomedical engineer checks.",
    content: [
      "Ground continuity testing confirms a low-resistance path (typically <0.1–0.2Ω per common standards) from the equipment's exposed metal to the ground pin, so fault current has a safe path to trip a breaker rather than flow through a person.",
      "Isolated power systems (common in ORs) intentionally float the supply from ground, so a single fault to ground doesn't trip power mid-procedure — a Line Isolation Monitor (LIM) alarms instead, and the second fault is what must be found and fixed urgently.",
      "Hospital-grade receptacles and plugs (identifiable by their green dot in the US convention) are tested to tighter grounding-retention specs than commercial-grade equivalents — don't substitute standard hardware in patient care areas.",
      "Any receptacle showing a failed ground or reversed polarity on routine testing should be taken out of service immediately — it's a facilities issue, but biomedical engineering should flag and track it.",
    ],
  },
  {
    id: "kb-repair-workflow",
    topic: "Repair Workflows",
    title: "A Structured Approach to Troubleshooting a Reported Fault",
    summary: "A repeatable diagnostic sequence to avoid guessing your way through a repair.",
    content: [
      "Reproduce and confirm the fault as reported before touching anything — get as much detail as possible from the person who reported it (what were they doing, what exactly did they see/hear).",
      "Check the obvious and cheap first: power connection, cables, consumables (filters, batteries, sensors) — a large share of 'equipment faults' are consumable or connection issues.",
      "Consult the error/alarm code if one was displayed — most modern devices log a specific fault code even if the operator didn't note it.",
      "Isolate: swap a suspect component (cable, sensor, battery) with a known-good spare where possible to confirm the failing part before ordering anything.",
      "Document the full chain: reported symptom → suspected cause → diagnostic steps → corrective action → parts used → downtime — this record feeds both compliance and the fleet's risk scoring.",
      "If the fault is intermittent and won't reproduce, don't close the ticket as resolved with no finding — note it as monitored/unresolved and flag it for a repeat-failure pattern.",
    ],
  },
  {
    id: "kb-root-cause",
    topic: "Repair Workflows",
    title: "Recognizing Recurring-Failure Patterns",
    summary: "When a repeat repair is a signal to stop repairing and start investigating.",
    content: [
      "Three or more similar faults on the same unit within 12 months is a strong signal the underlying root cause hasn't actually been fixed — treat the next occurrence as a root-cause investigation, not another quick swap.",
      "Compare repair records across the same equipment model/category fleet-wide — a fault repeating across multiple units of the same model may point to a systemic issue (a bad batch of consumables, an environmental factor, a training gap) rather than a per-unit hardware fault.",
      "Rising repair cost or downtime trend on a single unit, even across different fault types, is itself a replacement-planning signal — not just a maintenance one.",
    ],
  },
  {
    id: "kb-clinical-engineering-role",
    topic: "Clinical Engineering Practice",
    title: "The Biomedical Engineer's Role in Patient Safety",
    summary: "Why clinical engineering sits at the intersection of technical maintenance and patient safety, not just asset upkeep.",
    content: [
      "Clinical/biomedical engineering exists to ensure medical equipment performs safely and as intended — every PM, calibration, and repair ultimately traces back to patient outcomes, not just uptime metrics.",
      "Incident investigation (equipment-related adverse events or near-misses) is a core clinical engineering function — document objectively, preserve the device's as-found state where possible, and avoid speculation before the technical investigation is complete.",
      "Clinical engineers are often the bridge between OEM technical documentation and frontline clinical staff — translating a service bulletin or recall into a clear, actionable instruction for nurses/physicians is part of the job.",
      "Equipment recalls and hazard alerts should be tracked against the asset register by manufacturer/model/serial so an affected fleet can be identified quickly, not searched for ad hoc.",
    ],
  },
  {
    id: "kb-operation-training",
    topic: "Equipment Operation & Maintenance",
    title: "User Error vs. Equipment Fault",
    summary: "A framework for distinguishing an operator issue from a genuine equipment fault before opening a work order.",
    content: [
      "Ask what the operator was doing immediately before the fault appeared — many 'faults' are alarms functioning exactly as designed in response to a clinical or setup condition (e.g. an occlusion alarm from a genuinely kinked line).",
      "Check whether the same fault reproduces with a different, trained operator — if it only occurs with one user, it may point to a training gap rather than a hardware issue.",
      "Even when the root cause turns out to be user error, log the event — repeated operator-related alarms on the same equipment/unit can indicate a design or workflow issue worth escalating to clinical education, not just closing the ticket.",
      "Never dismiss a reported fault as 'probably user error' without at least a basic functional check — a genuine intermittent fault can look identical to an operator mistake on paper.",
    ],
  },
  {
    id: "kb-consumables",
    topic: "Equipment Operation & Maintenance",
    title: "Managing Equipment with Life-Limited Consumables",
    summary: "Sensors, batteries, filters, and absorbents with a defined service life need their own tracking, separate from PM dates.",
    content: [
      "Life-limited consumables (O2 cells, batteries, CO2 absorbent, HEPA/bacterial filters) degrade on their own timeline, independent of the PM schedule — track replacement dates separately.",
      "A device can be fully within its PM window and still be unsafe to use if a consumable has quietly expired — build consumable checks into every PM visit as a standard line item.",
      "Keep a minimum on-hand stock of high-turnover consumables for critical equipment categories so a routine replacement never becomes a downtime event waiting on procurement.",
    ],
  },
];

export function searchKnowledgeBase(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter((a) =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.topic.toLowerCase().includes(q) ||
    a.content.some((line) => line.toLowerCase().includes(q))
  );
}

export const KNOWLEDGE_BASE_TOPICS = ["All", ...new Set(KNOWLEDGE_BASE.map((a) => a.topic))];

export function knowledgeBaseByTopic(topic) {
  if (!topic || topic === "All") return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter((a) => a.topic === topic);
}
