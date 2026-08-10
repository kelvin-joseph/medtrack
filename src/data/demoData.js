// Consolidated, clearly-labeled DEMO dataset. This is loaded only when the
// user explicitly chooses "Load Demo Data" (see AppDataContext) — a brand
// new hospital starts completely empty (see acceptance criterion #1 in the
// corrections doc). Never imported directly by screens; only services and
// AppDataContext should read from here.

import { EQUIPMENT_CATALOG } from "./equipmentCatalog.js";
import { SEED_TICKETS, TICKET_STATUSES, FAULT_CATEGORIES } from "./faultTickets.js";
import { USERS_CATALOG } from "./users.js";

export const DEMO_EQUIPMENT = EQUIPMENT_CATALOG;
export const DEMO_TICKETS = SEED_TICKETS;
export const DEMO_USERS = USERS_CATALOG;

export { TICKET_STATUSES, FAULT_CATEGORIES };

export const DEMO_DEPARTMENTS = [...new Set(EQUIPMENT_CATALOG.map((e) => e.department))];
export const DEMO_CATEGORIES = [...new Set(EQUIPMENT_CATALOG.map((e) => e.category))];

// A handful of demo work orders spanning statuses/types, for the CMMS
// screens (Calendar, Work Orders, Engineer Tasks) to have something real
// to show immediately after loading demo data.
export const DEMO_WORK_ORDERS = [
  {
    id: "WO-DEMO-1", equipmentId: "EQ-001", type: "Preventive",
    title: "Quarterly ventilator service", description: "Routine preventive service per manufacturer schedule.",
    priority: "High", status: "Scheduled", assignedEngineer: "Emeka Nwosu",
    scheduledDate: "2026-08-05", dueDate: "2026-08-05",
    recurrence: { frequency: "quarterly" },
    checklist: [
      { text: "Check power supply / battery", done: false },
      { text: "Inspect filters / consumables", done: false },
      { text: "Test alarms and safety interlocks", done: false },
    ],
    notes: "", createdBy: "Biomedical Engineer", createdAt: "2026-07-20T09:00:00.000Z",
  },
  {
    id: "WO-DEMO-2", equipmentId: "EQ-004", type: "Corrective",
    title: "Investigate recurring occlusion alarm", description: "Third occurrence — recommend sensor replacement.",
    priority: "Critical", status: "In Progress", assignedEngineer: "Kemi Yusuf",
    scheduledDate: "2026-07-28", dueDate: "2026-07-30",
    recurrence: { frequency: "none" },
    checklist: [{ text: "Replace occlusion sensor", done: false }, { text: "Function test", done: false }],
    notes: "Awaiting spare part delivery.", createdBy: "Biomedical Engineer", createdAt: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "WO-DEMO-3", equipmentId: "EQ-012", type: "Emergency Repair",
    title: "Autoclave tripping circuit breaker", description: "Suspected internal short circuit — CSSD offline.",
    priority: "Emergency", status: "Overdue", assignedEngineer: "Kemi Yusuf",
    scheduledDate: "2026-07-22", dueDate: "2026-07-23",
    recurrence: { frequency: "none" },
    checklist: [{ text: "Isolate power", done: true }, { text: "Inspect heating element wiring", done: false }],
    notes: "", createdBy: "Biomedical Engineer", createdAt: "2026-07-22T08:00:00.000Z",
  },
  {
    id: "WO-DEMO-4", equipmentId: "EQ-009", type: "Calibration",
    title: "Annual MRI gradient coil calibration", description: "",
    priority: "Medium", status: "Scheduled", assignedEngineer: "Emeka Nwosu",
    scheduledDate: "2026-08-10", dueDate: "2026-08-10",
    recurrence: { frequency: "annual" },
    checklist: [{ text: "Calibration check", done: false }],
    notes: "", createdBy: "Biomedical Engineer", createdAt: "2026-07-18T09:00:00.000Z",
  },
  {
    id: "WO-DEMO-5", equipmentId: "EQ-005", type: "Safety Testing",
    title: "Electrical safety test — defibrillator", description: "",
    priority: "Low", status: "Completed", assignedEngineer: "Kemi Yusuf",
    scheduledDate: "2026-07-10", dueDate: "2026-07-10", completedDate: "2026-07-10",
    recurrence: { frequency: "annual" },
    checklist: [{ text: "Leakage current test", done: true }, { text: "Ground continuity test", done: true }],
    notes: "Passed all checks.", createdBy: "Biomedical Engineer", createdAt: "2026-07-01T09:00:00.000Z",
  },
];

/** Default hospital-level settings — same shape whether demo or empty mode. */
export const DEFAULT_SETTINGS = {
  onboardingComplete: false,
  hospital: {
    name: "General Hospital",
    logoUrl: null,
    address: "",
    contactEmail: "",
    phone: "",
    timeZone: "Africa/Lagos",
    currency: "NGN",
  },
  departments: [], // [{ id, name, buildings: [{ id, name, floors: [...] }] }]
  categories: [],  // user-manageable equipment categories
  maintenance: {
    defaultIntervalDays: 90,
    reminderPeriodDays: 7,
    overdueThresholdDays: 1,
    calibrationReminderDays: 30,
    defaultChecklist: [
      "Check power supply / battery",
      "Inspect cables and connectors",
      "Inspect filters / consumables",
      "Test alarms and safety interlocks",
      "Verify display / readouts",
      "Perform functional test",
      "Calibration check",
    ],
  },
  risk: {
    // Matches the risk engine's own defaults (0-20 Very Low / 21-40 Low /
    // 41-60 Moderate / 61-80 High / 81-100 Critical) — keep these in sync
    // with DEFAULT_THRESHOLDS in lib/riskEngine.js.
    thresholds: { low: 20, moderate: 40, high: 60 },
    predictionPeriods: [30, 90, 180, 365],
  },
  notifications: {
    maintenanceReminders: true,
    highRiskAlerts: true,
    faultNotifications: true,
    calibrationReminders: true,
    warrantyExpiryAlerts: true,
  },
};

/** Demo-mode settings layer on top of the same defaults, populated with the demo fleet's departments/categories. */
export const DEMO_SETTINGS = {
  ...DEFAULT_SETTINGS,
  onboardingComplete: true, // loading demo data means you don't need the setup wizard
  hospital: { ...DEFAULT_SETTINGS.hospital, name: "MedTrack Demo Hospital" },
  departments: DEMO_DEPARTMENTS.map((name, i) => ({ id: `DEPT-${i + 1}`, name, buildings: [] })),
  categories: DEMO_CATEGORIES,
};
