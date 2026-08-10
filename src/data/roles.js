export const ROLES = [
  "Biomedical Engineer",
  "Head of Biomedical Engineering",
  "Hospital Administrator",
  "Department Staff",
  "System Administrator",
  "Demo Viewer",
];

// Coarse per-role capability map. Phase 1 has no real auth — this only
// drives which actions/buttons are visible for the selected role, so
// stakeholders can preview what each role would see.
export const PERMISSIONS = {
  "Biomedical Engineer": {
    registerEquipment: true, editEquipment: true, performMaintenance: true,
    createSchedules: true, recordBreakdowns: true, uploadDocuments: true,
    scanQR: true, viewAIRisk: true, updateCondition: true,
    approveReports: false, assignTasks: false, viewCosts: true,
    viewReplacementRecs: true, reportFault: true, manageUsers: false,
  },
  "Head of Biomedical Engineering": {
    registerEquipment: true, editEquipment: true, performMaintenance: true,
    createSchedules: true, recordBreakdowns: true, uploadDocuments: true,
    scanQR: true, viewAIRisk: true, updateCondition: true,
    approveReports: true, assignTasks: true, viewCosts: true,
    viewReplacementRecs: true, reportFault: true, manageUsers: false,
  },
  "Hospital Administrator": {
    registerEquipment: false, editEquipment: false, performMaintenance: false,
    createSchedules: false, recordBreakdowns: false, uploadDocuments: false,
    scanQR: false, viewAIRisk: true, updateCondition: false,
    approveReports: false, assignTasks: false, viewCosts: true,
    viewReplacementRecs: true, reportFault: false, manageUsers: false,
  },
  "Department Staff": {
    registerEquipment: false, editEquipment: false, performMaintenance: false,
    createSchedules: false, recordBreakdowns: false, uploadDocuments: false,
    scanQR: true, viewAIRisk: false, updateCondition: false,
    approveReports: false, assignTasks: false, viewCosts: false,
    viewReplacementRecs: false, reportFault: true, manageUsers: false,
  },
  "System Administrator": {
    registerEquipment: true, editEquipment: true, performMaintenance: true,
    createSchedules: true, recordBreakdowns: true, uploadDocuments: true,
    scanQR: true, viewAIRisk: true, updateCondition: true,
    approveReports: true, assignTasks: true, viewCosts: true,
    viewReplacementRecs: true, reportFault: true, manageUsers: true,
  },
  // Read-only. Every write flag is false on purpose — this is UI-level
  // hiding of write actions (buttons don't render), NOT the real security
  // boundary. The actual enforcement has to be RLS on the demo account's
  // Supabase user; this table just keeps the demo UI honest about what
  // it's allowed to do.
  "Demo Viewer": {
    registerEquipment: false, editEquipment: false, performMaintenance: false,
    createSchedules: false, recordBreakdowns: false, uploadDocuments: false,
    scanQR: false, viewAIRisk: true, updateCondition: false,
    approveReports: false, assignTasks: false, viewCosts: true,
    viewReplacementRecs: true, reportFault: false, manageUsers: false,
  },
};

// Which nav items each role sees. Keys match SCREENS in context/AppContext.jsx.
export const NAV_ACCESS = {
  "Biomedical Engineer": [
    "dashboard", "equipment", "maintenance", "fault-reports", "ai-predictions",
    "qr-scanner", "calibration", "notifications",
  ],
  "Head of Biomedical Engineering": [
    "dashboard", "equipment", "maintenance", "fault-reports", "ai-predictions",
    "qr-scanner", "calibration", "reports", "notifications",
  ],
  "Hospital Administrator": [
    "dashboard", "equipment", "ai-predictions", "calibration", "reports", "notifications",
  ],
  "Department Staff": ["dashboard", "fault-reports", "qr-scanner", "notifications"],
  "System Administrator": [
    "dashboard", "equipment", "maintenance", "fault-reports", "ai-predictions",
    "qr-scanner", "calibration", "reports",
    "notifications", "users", "settings",
  ],
  "Demo Viewer": [
    "dashboard", "equipment", "maintenance", "fault-reports", "ai-predictions",
    "qr-scanner", "calibration", "reports", "notifications",
  ],
};
