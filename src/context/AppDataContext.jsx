import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRole } from "./RoleContext.jsx";
import * as equipmentService from "../services/equipmentService.js";
import * as maintenanceService from "../services/maintenanceService.js";
import * as faultService from "../services/faultService.js";
import * as userService from "../services/userService.js";
import * as settingsService from "../services/settingsService.js";
import * as auditService from "../services/auditService.js";
import * as workOrderService from "../services/workOrderService.js";
import * as repairRecordService from "../services/repairRecordService.js";
import {
  readValue,
  writeValue,
  clearAllNamespacedData,
  exportAllNamespacedData,
} from "../services/storage.js";
import { nextRecurrenceDate } from "../lib/workOrderEngine.js";
import {
  DEMO_EQUIPMENT,
  DEMO_TICKETS,
  DEMO_SETTINGS,
  DEFAULT_SETTINGS,
  DEMO_WORK_ORDERS,
} from "../data/demoData.js";

const CORRECTIVE_TYPES = new Set(["Corrective", "Emergency Repair"]);

const AppDataContext = createContext(null);
const META_KEY = "meta";

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AppDataProvider({ children }) {
  const { role, profile } = useRole();
  const [isLoading, setIsLoading] = useState(true);
  const [dataMode, setDataMode] = useState("empty"); // "empty" | "demo"
  const [equipment, setEquipment] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [repairRecords, setRepairRecords] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [auditLog, setAuditLog] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // `users` now lives in the real `profiles` table (Supabase), not
  // localStorage — it's real hospital staff accounts, so it's deliberately
  // left OUT of refreshFromServices' synchronous localStorage batch below
  // and fetched separately with its own loading/error state. It's also
  // excluded from the demo-data seed/clear/reset flows further down: those
  // are for the local equipment/tickets/etc. demo sandbox only and must
  // never touch real login accounts.
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const list = await userService.getAll();
      setUsers(list);
      setUsersError(null);
    } catch (err) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Equipment, settings, work orders, fault tickets, and the audit log are
  // all Supabase-backed (async) now.
  const refreshFromServices = useCallback(async () => {
    setEquipment(await equipmentService.getAll());
    setWorkOrders(await workOrderService.getAll());
    setRepairRecords(await repairRecordService.getAll());
    setTickets(await faultService.getAll());
    setSettings(await settingsService.get());
    setAuditLog(await auditService.getAll());
  }, []);

  // `dataMode` is a cosmetic label only — see the "Currently in ... mode"
  // line in SettingsScreen. It must NEVER gate a clear()/seed() call on its
  // own. It used to (see git history): the old logic treated "no `meta` key
  // in this browser's localStorage" as "this hospital has never been set
  // up" and auto-wiped equipment/work orders/tickets/settings on that basis.
  // That was correct back when those lived in localStorage, but they're all
  // Supabase-backed now — shared across every browser and device for the
  // whole hospital. localStorage is scoped per origin (protocol+host+PORT),
  // so a fresh browser, a private window, or `npm run dev` simply picking a
  // different port than last time all look like "no meta key" and would
  // silently delete real shared data. Seeding/clearing now only ever
  // happens from an explicit action (loadDemoData / startEmptyHospital /
  // clearAllLocalData below), never automatically here.
  useEffect(() => {
    async function init() {
      const meta = readValue(META_KEY, null);
      setDataMode(meta?.dataMode || "empty");
      setReadNotificationIds(new Set(readValue("readNotifications", [])));
      await refreshFromServices();
      refreshUsers();
      setIsLoading(false);
    }
    init();
  }, [refreshFromServices, refreshUsers]);

  // Async now that audit_log is Supabase-backed. Every call site below
  // fires this without awaiting it (audit logging shouldn't block the UI
  // action that triggered it), so failures are caught and logged here
  // rather than surfacing as unhandled promise rejections.
  const logAudit = useCallback(
    async (action, target, details) => {
      try {
        await auditService.record(
          profile?.name || role,
          role,
          action,
          target,
          details,
        );
        setAuditLog(await auditService.getAll());
      } catch (err) {
        console.error("[AppDataContext] Failed to record audit entry:", err);
      }
    },
    [role, profile],
  );

  /* ---------------------------- data mode actions ---------------------------- */

  const loadDemoData = useCallback(async () => {
    await equipmentService.seed(DEMO_EQUIPMENT);
    await workOrderService.seed(DEMO_WORK_ORDERS);
    await faultService.seed(DEMO_TICKETS);
    // Demo *users* are intentionally not seeded here — real login accounts
    // live in Supabase and are managed from the Users & Roles screen.
    await settingsService.save(DEMO_SETTINGS);
    writeValue(META_KEY, { initialized: true, dataMode: "demo" });
    setDataMode("demo");
    await refreshFromServices();
    logAudit("Loaded demo data", "system", "Seeded the demo equipment fleet");
    showToast("Demo data loaded.");
  }, [refreshFromServices, logAudit, showToast]);

  const resetDemoData = useCallback(async () => {
    await loadDemoData();
    showToast("Demo data reset.");
  }, [loadDemoData, showToast]);

  const startEmptyHospital = useCallback(async () => {
    await equipmentService.clear();
    await workOrderService.clear();
    await faultService.clear();
    await settingsService.save(DEFAULT_SETTINGS);
    writeValue(META_KEY, { initialized: true, dataMode: "empty" });
    setDataMode("empty");
    await refreshFromServices();
    showToast("Started with an empty hospital.");
  }, [refreshFromServices, showToast]);

  const clearAllLocalData = useCallback(async () => {
    clearAllNamespacedData();
    await equipmentService.clear();
    await workOrderService.clear();
    await faultService.clear();
    await settingsService.save(DEFAULT_SETTINGS);
    writeValue(META_KEY, { initialized: true, dataMode: "empty" });
    setDataMode("empty");
    setReadNotificationIds(new Set());
    await refreshFromServices();
    showToast("Local data cleared.");
  }, [refreshFromServices, showToast]);

  const exportAllData = useCallback(() => {
    downloadJSON(
      `medtrack-export-${new Date().toISOString().slice(0, 10)}.json`,
      exportAllNamespacedData(),
    );
    showToast("Local data exported.");
  }, [showToast]);

  /* ---------------------------- equipment actions ---------------------------- */

  const addEquipment = useCallback(
    async (data) => {
      const created = await equipmentService.create(data);
      await refreshFromServices();
      logAudit("Added equipment", created.id, created.name);
      showToast("Equipment added successfully.");
      return created;
    },
    [refreshFromServices, logAudit, showToast],
  );

  const updateEquipmentRecord = useCallback(
    async (id, patch) => {
      await equipmentService.update(id, patch);
      await refreshFromServices();
      logAudit("Updated equipment", id, Object.keys(patch).join(", "));
      showToast("Equipment updated.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  const removeEquipment = useCallback(
    async (id) => {
      await equipmentService.remove(id);
      await refreshFromServices();
      logAudit("Deleted equipment", id, "");
      showToast("Equipment deleted.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  const archiveEquipment = useCallback(
    async (id) => {
      await equipmentService.update(id, { status: "Decommissioned" });
      await refreshFromServices();
      logAudit("Archived/decommissioned equipment", id, "");
      showToast("Equipment archived.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  const addMaintenanceRecord = useCallback(
    async (id, record) => {
      await maintenanceService.addRecord(id, record);
      await refreshFromServices();
      logAudit("Logged maintenance", id, record.note);
      showToast("Maintenance logged.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  const addRepairRecord = useCallback(
    async (id, record) => {
      await maintenanceService.addRepair(id, record);
      await refreshFromServices();
      logAudit("Recorded breakdown/repair", id, record.faultDescription);
      showToast("Repair recorded.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  // Real document uploads go straight from EquipmentProfileScreen's
  // DocumentsTab to equipmentDocumentsService (Storage + equipment_documents
  // table) -- they're not part of the equipment record's own patch/refresh
  // cycle the way maintenance/repair records are, so there's no
  // addDocument here. logAudit/showToast (both exposed below) are called
  // directly by DocumentsTab for the audit trail + toast on upload.

  const setCriticality = useCallback(
    async (id, clinicalCriticality) => {
      await equipmentService.update(id, { clinicalCriticality });
      await refreshFromServices();
      logAudit("Changed clinical criticality", id, clinicalCriticality);
    },
    [refreshFromServices, logAudit],
  );

  const setCondition = useCallback(
    async (id, condition) => {
      await equipmentService.update(id, { condition });
      await refreshFromServices();
      logAudit("Changed equipment condition", id, condition);
    },
    [refreshFromServices, logAudit],
  );

  /* ---------------------------- work order actions ---------------------------- */

  const addWorkOrder = useCallback(
    async (data) => {
      const created = await workOrderService.create(data);
      await refreshFromServices();
      logAudit(
        "Scheduled maintenance",
        created.id,
        `${created.type} — ${created.title || ""}`,
      );
      showToast("Maintenance scheduled.");
      return created;
    },
    [refreshFromServices, logAudit, showToast],
  );

  const updateWorkOrder = useCallback(
    async (id, patch) => {
      await workOrderService.update(id, patch);
      await refreshFromServices();
      logAudit("Updated work order", id, Object.keys(patch).join(", "));
    },
    [refreshFromServices, logAudit],
  );

  const cancelWorkOrder = useCallback(
    async (id) => {
      await workOrderService.update(id, { status: "Cancelled" });
      await refreshFromServices();
      logAudit("Cancelled work order", id, "");
      showToast("Work order cancelled.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  const removeWorkOrder = useCallback(
    async (id) => {
      await workOrderService.remove(id);
      await refreshFromServices();
      logAudit("Deleted work order", id, "");
    },
    [refreshFromServices, logAudit],
  );

  /** Completes a work order: logs the corresponding record on the equipment, and — if recurring — schedules the next occurrence. */
  const completeWorkOrder = useCallback(
    async (id, completion = {}) => {
      const allWorkOrders = await workOrderService.getAll();
      const wo = allWorkOrders.find((w) => w.id === id);
      if (!wo) return;
      const completedDate =
        completion.completedDate || new Date().toISOString().slice(0, 10);
      const note =
        completion.note || `${wo.type} completed — ${wo.title || ""}`.trim();

      // `repairAlreadyLogged` is set by completeWorkOrderWithRepair() once a
      // real repair_records row has already been created for this work
      // order — skips the legacy equipment.details.repairRecords JSON write
      // below so the repair isn't logged twice in two different places.
      if (CORRECTIVE_TYPES.has(wo.type) && !completion.repairAlreadyLogged) {
        await maintenanceService.addRepair(wo.equipmentId, {
          date: completedDate,
          reportedBy: wo.createdBy || "Biomedical Engineer",
          faultDescription: wo.title || wo.type,
          errorCode: "—",
          suspectedCause: wo.description || "—",
          diagnosis: "—",
          correctiveAction: note,
          partsReplaced: completion.partsReplaced || "—",
          cost: Number(completion.cost) || 0,
          engineer: wo.assignedEngineer,
          repairStart: wo.scheduledDate,
          repairCompletion: completedDate,
          downtimeHours: Number(completion.downtimeHours) || 0,
          finalStatus: "Resolved",
        });
      } else {
        await maintenanceService.addRecord(wo.equipmentId, {
          type: wo.type === "Preventive" ? "Preventive" : wo.type,
          date: completedDate,
          note,
          engineer: wo.assignedEngineer,
          cost: Number(completion.cost) || 0,
          checklist: (wo.checklist || [])
            .filter((c) => c.done)
            .map((c) => c.text),
        });
      }

      await workOrderService.update(id, { status: "Completed", completedDate });

      if (wo.recurrence && wo.recurrence.frequency !== "none") {
        const nextDate = nextRecurrenceDate(completedDate, wo.recurrence);
        await workOrderService.create({
          equipmentId: wo.equipmentId,
          type: wo.type,
          title: wo.title,
          description: wo.description,
          priority: wo.priority,
          assignedEngineer: wo.assignedEngineer,
          scheduledDate: nextDate,
          dueDate: nextDate,
          recurrence: wo.recurrence,
          checklist: (wo.checklist || []).map((c) => ({ ...c, done: false })),
          notes: "",
          status: "Scheduled",
          createdBy: wo.createdBy,
        });
      }

      await refreshFromServices();
      logAudit("Completed work order", id, wo.type);
      showToast("Maintenance completed and logged.");
    },
    [refreshFromServices, logAudit, showToast],
  );

  /**
   * Completes a corrective/emergency-repair work order via a real
   * repair_records row (from CompleteWorkOrderDialog) instead of the legacy
   * equipment.details.repairRecords JSON entry.
   *
   * The repair record is created FIRST; the work order is only marked
   * Completed if that succeeds. If repair record creation fails, this
   * throws and the work order is left completely untouched — the caller
   * (the dialog) is expected to catch this and show the error inline.
   */
  const completeWorkOrderWithRepair = useCallback(
    async (id, repairData) => {
      // Duplicate-prevention: check against the live table, not local
      // state, in case a prior attempt for this work order already
      // succeeded (e.g. the subsequent status update failed and the
      // engineer retried).
      const existing = await repairRecordService.getAll();
      const alreadyExists = existing.some((r) => r.workOrderId === id);
      if (!alreadyExists) {
        await repairRecordService.create({ ...repairData, workOrderId: id });
      }

      // Only reached if the repair record already existed or was just
      // created successfully. completeWorkOrder() still owns status,
      // completedDate, and recurrence — repairAlreadyLogged just tells it
      // to skip its own internal repair logging for this call.
      await completeWorkOrder(id, {
        cost: repairData.cost,
        downtimeHours: repairData.downtimeHours,
        repairAlreadyLogged: true,
      });
    },
    [completeWorkOrder],
  );

  /* ---------------------------- fault ticket actions ---------------------------- */

  const addTicket = useCallback(
    async (ticket) => {
      const created = await faultService.create(ticket);
      await refreshFromServices();
      logAudit("Reported fault", created.id, ticket.description);
      showToast("Fault report submitted.");
      return created;
    },
    [refreshFromServices, logAudit, showToast],
  );

  const updateTicketStatus = useCallback(
    async (id, status) => {
      await faultService.updateStatus(id, status);
      await refreshFromServices();
      logAudit("Updated fault ticket status", id, status);
    },
    [refreshFromServices, logAudit],
  );

  /* ---------------------------- user actions ---------------------------- */

  const addUser = useCallback(
    async (user) => {
      try {
        const created = await userService.create(user);
        await refreshUsers();
        logAudit("Added user", created.id, `${user.name} (${user.role})`);
        showToast(`Invite sent to ${user.email}.`);
        return { user: created, error: null };
      } catch (err) {
        const message = err.message || "Failed to add user.";
        showToast(message, "error");
        return { user: null, error: message };
      }
    },
    [refreshUsers, logAudit, showToast],
  );

  const toggleUserActive = useCallback(
    async (id) => {
      try {
        const updated = await userService.toggleActive(id);
        await refreshUsers();
        logAudit(
          updated?.active ? "Activated user" : "Disabled user",
          id,
          updated?.name || "",
        );
      } catch (err) {
        showToast(err.message || "Failed to update user.", "error");
      }
    },
    [refreshUsers, logAudit, showToast],
  );

  /* ---------------------------- settings actions ---------------------------- */

  const updateSettings = useCallback(
    async (patch) => {
      const next = await settingsService.update(patch);
      setSettings(next);
      setEquipment(await equipmentService.getAll()); // risk thresholds may have changed — re-enrich
      logAudit("Updated settings", "settings", Object.keys(patch).join(", "));
      showToast("Settings saved.");
    },
    [logAudit, showToast],
  );

  const updateSettingsSection = useCallback(
    async (section, patch) => {
      const next = await settingsService.updateSection(section, patch);
      setSettings(next);
      setEquipment(await equipmentService.getAll()); // risk thresholds may have changed — re-enrich
      logAudit(
        `Updated ${section} settings`,
        "settings",
        JSON.stringify(patch),
      );
      showToast("Settings saved.");
    },
    [logAudit, showToast],
  );

  /* ---------------------------- notifications ---------------------------- */

  const markNotificationRead = useCallback((id) => {
    setReadNotificationIds((set) => {
      const next = new Set(set).add(id);
      writeValue("readNotifications", [...next]);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback((ids) => {
    setReadNotificationIds((set) => {
      const next = new Set(set);
      ids.forEach((id) => next.add(id));
      writeValue("readNotifications", [...next]);
      return next;
    });
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        isLoading,
        dataMode,
        equipment,
        workOrders,
        repairRecords,
        tickets,
        users,
        usersLoading,
        usersError,
        settings,
        auditLog,
        logAudit,
        readNotificationIds,
        toast,
        showToast,
        dismissToast: () => setToast(null),

        loadDemoData,
        resetDemoData,
        startEmptyHospital,
        clearAllLocalData,
        exportAllData,

        addEquipment,
        updateEquipment: updateEquipmentRecord,
        removeEquipment,
        archiveEquipment,
        addMaintenanceRecord,
        addRepairRecord,
        setCriticality,
        setCondition,
        addWorkOrder,
        updateWorkOrder,
        cancelWorkOrder,
        removeWorkOrder,
        completeWorkOrder,
        completeWorkOrderWithRepair,
        addTicket,
        updateTicketStatus,
        addUser,
        toggleUserActive,
        refreshUsers,
        updateSettings,
        updateSettingsSection,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useData must be used within an AppDataProvider");
  return ctx;
}
