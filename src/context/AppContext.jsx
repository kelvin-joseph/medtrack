import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export const SCREENS = {
  LOGIN: "login",
  DASHBOARD: "dashboard",
  EQUIPMENT: "equipment",
  EQUIPMENT_PROFILE: "equipment-profile",
  EQUIPMENT_FORM: "equipment-form",
  IMPORT_EQUIPMENT: "import-equipment",
  MAINTENANCE: "maintenance",
  FAULT_REPORTS: "fault-reports",
  AI_PREDICTIONS: "ai-predictions",
  QR_SCANNER: "qr-scanner",
  CALIBRATION: "calibration",
  REPORTS: "reports",
  NOTIFICATIONS: "notifications",
  USERS: "users",
  SETTINGS: "settings",
};

export function AppProvider({ children }) {
  const [screen, setScreen] = useState(SCREENS.DASHBOARD);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState(null); // null = "add" mode
  const [qrTargetId, setQrTargetId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigate = useCallback((next) => {
    setScreen(next);
    setMobileNavOpen(false);
  }, []);

  const openEquipment = useCallback((id) => {
    setSelectedEquipmentId(id);
    navigate(SCREENS.EQUIPMENT_PROFILE);
  }, [navigate]);

  const openAddEquipment = useCallback(() => {
    setEditingEquipmentId(null);
    navigate(SCREENS.EQUIPMENT_FORM);
  }, [navigate]);

  const openEditEquipment = useCallback((id) => {
    setEditingEquipmentId(id);
    navigate(SCREENS.EQUIPMENT_FORM);
  }, [navigate]);

  const openImportEquipment = useCallback(() => {
    navigate(SCREENS.IMPORT_EQUIPMENT);
  }, [navigate]);

  const viewQRTag = useCallback((id) => {
    setQrTargetId(id);
    navigate(SCREENS.QR_SCANNER);
  }, [navigate]);

  const consumeQrTarget = useCallback(() => {
    setQrTargetId(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen, navigate,
        selectedEquipmentId, openEquipment, viewQRTag,
        editingEquipmentId, openAddEquipment, openEditEquipment, openImportEquipment,
        qrTargetId, consumeQrTarget,
        mobileNavOpen, setMobileNavOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
