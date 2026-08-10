import {
  LayoutDashboard, ClipboardList, Wrench, AlertTriangle, Brain, QrCode,
  CalendarCheck, BarChart3, Bell, Users, Settings,
} from "lucide-react";
import { SCREENS } from "../context/AppContext.jsx";

export const NAV_ITEMS = [
  { key: "dashboard", screen: SCREENS.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { key: "equipment", screen: SCREENS.EQUIPMENT, label: "Equipment", icon: ClipboardList },
  { key: "maintenance", screen: SCREENS.MAINTENANCE, label: "Maintenance", icon: Wrench },
  { key: "fault-reports", screen: SCREENS.FAULT_REPORTS, label: "Fault Reports", icon: AlertTriangle },
  { key: "ai-predictions", screen: SCREENS.AI_PREDICTIONS, label: "Biomedical AI Center", icon: Brain },
  { key: "qr-scanner", screen: SCREENS.QR_SCANNER, label: "QR Scanner", icon: QrCode },
  { key: "calibration", screen: SCREENS.CALIBRATION, label: "Calibration", icon: CalendarCheck },
  { key: "reports", screen: SCREENS.REPORTS, label: "Reports & Analytics", icon: BarChart3 },
  { key: "notifications", screen: SCREENS.NOTIFICATIONS, label: "Notifications", icon: Bell },
  { key: "users", screen: SCREENS.USERS, label: "Users & Roles", icon: Users },
  { key: "settings", screen: SCREENS.SETTINGS, label: "Settings", icon: Settings },
];

// Bottom tab bar only has room for a handful of one-thumb-reach items on
// mobile; everything else lives behind "More". Keeps the most-used,
// time-sensitive screens fastest to reach.
export const MOBILE_PRIMARY_KEYS = ["dashboard", "equipment", "fault-reports", "ai-predictions"];
