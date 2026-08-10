export const TICKET_STATUSES = [
  "New", "Assigned", "In Progress", "Awaiting Spare Parts", "Awaiting Vendor", "Completed", "Closed",
];

export const FAULT_CATEGORIES = ["Malfunction", "Electrical Fault", "Calibration Issue", "Accident/Damage", "Other"];

export const SEED_TICKETS = [
  {
    id: "TCK-001", equipmentId: "EQ-004", reportedBy: "ICU Nurse Station", department: "ICU",
    category: "Malfunction", description: "Occlusion alarm keeps false-triggering on Infusion Pump IP-12.",
    status: "In Progress", createdAt: "2026-07-20T09:10:00.000Z",
  },
  {
    id: "TCK-002", equipmentId: "EQ-012", reportedBy: "CSSD Supervisor", department: "Central Sterile",
    category: "Electrical Fault", description: "Autoclave tripping the department circuit breaker on startup.",
    status: "Awaiting Vendor", createdAt: "2026-07-22T14:05:00.000Z",
  },
  {
    id: "TCK-003", equipmentId: "EQ-008", reportedBy: "Radiology Lead Tech", department: "Radiology",
    category: "Calibration Issue", description: "CT image showing artifacts again during weekly QA scan.",
    status: "Assigned", createdAt: "2026-07-23T11:40:00.000Z",
  },
  {
    id: "TCK-004", equipmentId: "EQ-002", reportedBy: "ICU Nurse", department: "ICU",
    category: "Other", description: "Requesting routine check — display flickers occasionally.",
    status: "New", createdAt: "2026-07-24T16:22:00.000Z",
  },
];
