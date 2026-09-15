import { useState } from "react";
import {
  Settings, Building2, MapPin, Tag, Wrench, Cpu, Bell, Database,
  Plus, X, Sparkles, RotateCcw, Trash2, Download, Loader2,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import FormField, { TextInput, Select } from "../components/FormField.jsx";

const TABS = [
  { key: "hospital", label: "Hospital Profile", icon: Building2 },
  { key: "departments", label: "Departments & Locations", icon: MapPin },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "risk", label: "Risk & AI", icon: Cpu },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "data", label: "Data Management", icon: Database },
];

export default function SettingsScreen() {
  const [tab, setTab] = useState("hospital");

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-ink font-display flex items-center gap-2">
          <Settings size={20} color="#2F7DE1" /> Settings
        </h1>
        <p className="text-sm text-muted mt-1">System configuration — System Administrator only.</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? "text-accent border-accent" : "text-muted border-transparent hover:text-ink"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "hospital" && <HospitalProfileTab />}
      {tab === "departments" && <DepartmentsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "maintenance" && <MaintenanceSettingsTab />}
      {tab === "risk" && <RiskSettingsTab />}
      {tab === "notifications" && <NotificationsSettingsTab />}
      {tab === "data" && <DataManagementTab />}
    </div>
  );
}

/* ---------------------------------- Hospital Profile ---------------------------------- */
function HospitalProfileTab() {
  const { settings, updateSettingsSection } = useData();
  const [form, setForm] = useState(settings.hospital);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function save() {
    if (saving) return; // guard against duplicate submission
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettingsSection("hospital", form);
      // Success feedback: updateSettingsSection already shows a "Settings
      // saved." toast on success (same shared pattern used elsewhere, e.g.
      // addWorkOrder) -- no separate confirmation needed here.
    } catch (err) {
      setSaveError(err.message || "Failed to save hospital profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">Hospital profile</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Hospital name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Contact email">
          <TextInput type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </FormField>
        <FormField label="Phone">
          <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
        <FormField label="Time zone">
          <TextInput value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} />
        </FormField>
        <FormField label="Currency">
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
          </Select>
        </FormField>
        <FormField label="Address">
          <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </FormField>
      </div>
      {saveError && (
        <div className="text-xs text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="self-start flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        {saving ? "Saving…" : "Save hospital profile"}
      </button>
    </div>
  );
}

/* ---------------------------------- Departments ---------------------------------- */
function DepartmentsTab() {
  const { settings, updateSettings } = useData();
  const [newDept, setNewDept] = useState("");

  function add() {
    const name = newDept.trim();
    if (!name || settings.departments.some((d) => d.name === name)) return;
    const next = [...settings.departments, { id: `DEPT-${Date.now()}`, name, buildings: [] }];
    updateSettings({ departments: next });
    setNewDept("");
  }

  function remove(id) {
    updateSettings({ departments: settings.departments.filter((d) => d.id !== id) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">Departments &amp; locations</h3>
      <p className="text-xs text-muted -mt-2">
        These feed the Department dropdown when adding equipment. Full building/floor hierarchy is a future
        enhancement — this manages department names for now.
      </p>
      <div className="flex gap-2">
        <TextInput value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="e.g. Radiology" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.departments.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5 text-xs font-medium text-ink bg-accent-soft border border-border rounded-full pl-3 pr-2 py-1.5">
            {d.name}
            <button onClick={() => remove(d.id)} className="text-faint hover:text-[#D9364B]"><X size={12} /></button>
          </span>
        ))}
        {settings.departments.length === 0 && <span className="text-xs text-muted">No departments yet.</span>}
      </div>
    </div>
  );
}

/* ---------------------------------- Categories ---------------------------------- */
function CategoriesTab() {
  const { settings, updateSettings } = useData();
  const [newCat, setNewCat] = useState("");

  function add() {
    const name = newCat.trim();
    if (!name || settings.categories.includes(name)) return;
    updateSettings({ categories: [...settings.categories, name] });
    setNewCat("");
  }

  function remove(name) {
    updateSettings({ categories: settings.categories.filter((c) => c !== name) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">Equipment categories</h3>
      <p className="text-xs text-muted -mt-2">These feed the Category dropdown when adding equipment.</p>
      <div className="flex gap-2">
        <TextInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Ventilator" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.categories.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-xs font-medium text-ink bg-accent-soft border border-border rounded-full pl-3 pr-2 py-1.5">
            {c}
            <button onClick={() => remove(c)} className="text-faint hover:text-[#D9364B]"><X size={12} /></button>
          </span>
        ))}
        {settings.categories.length === 0 && <span className="text-xs text-muted">No categories yet.</span>}
      </div>
    </div>
  );
}

/* ---------------------------------- Maintenance Settings ---------------------------------- */
function MaintenanceSettingsTab() {
  const { settings, updateSettingsSection } = useData();
  const [form, setForm] = useState(settings.maintenance);
  const [newItem, setNewItem] = useState("");

  function save() {
    updateSettingsSection("maintenance", form);
  }

  function addChecklistItem() {
    const item = newItem.trim();
    if (!item) return;
    setForm({ ...form, defaultChecklist: [...form.defaultChecklist, item] });
    setNewItem("");
  }

  function removeChecklistItem(i) {
    setForm({ ...form, defaultChecklist: form.defaultChecklist.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">Maintenance settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Default maintenance interval (days)" hint="Used when scheduling new equipment's next service date.">
          <TextInput type="number" value={form.defaultIntervalDays} onChange={(e) => setForm({ ...form, defaultIntervalDays: Number(e.target.value) })} />
        </FormField>
        <FormField label="Reminder period (days before due)">
          <TextInput type="number" value={form.reminderPeriodDays} onChange={(e) => setForm({ ...form, reminderPeriodDays: Number(e.target.value) })} />
        </FormField>
        <FormField label="Overdue threshold (days)">
          <TextInput type="number" value={form.overdueThresholdDays} onChange={(e) => setForm({ ...form, overdueThresholdDays: Number(e.target.value) })} />
        </FormField>
        <FormField label="Calibration reminder (days before due)">
          <TextInput type="number" value={form.calibrationReminderDays} onChange={(e) => setForm({ ...form, calibrationReminderDays: Number(e.target.value) })} />
        </FormField>
      </div>

      <div>
        <label className="text-xs font-medium text-ink">Default maintenance checklist</label>
        <p className="text-[11px] text-faint mb-2">Shown when completing preventive maintenance on any equipment.</p>
        <div className="flex flex-col gap-1.5 mb-2">
          {form.defaultChecklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-ink bg-accent-soft rounded-lg px-3 py-1.5">
              <span className="flex-1">{item}</span>
              <button onClick={() => removeChecklistItem(i)} className="text-faint hover:text-[#D9364B]"><X size={13} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a checklist item…" onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} />
          <button onClick={addChecklistItem} className="shrink-0 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink">Add</button>
        </div>
      </div>

      <button onClick={save} className="self-start rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
        Save maintenance settings
      </button>
    </div>
  );
}

/* ---------------------------------- Risk & AI Settings ---------------------------------- */
function RiskSettingsTab() {
  const { settings, updateSettingsSection } = useData();
  const [form, setForm] = useState(settings.risk.thresholds);

  function save() {
    updateSettingsSection("risk", { thresholds: form });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">Risk &amp; AI settings</h3>
      <p className="text-xs text-muted -mt-2">
        These thresholds directly drive the AI risk engine's Very Low/Low/Moderate/High/Critical bands across
        the whole app — changing them here immediately re-scores every equipment record.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Low / Moderate boundary" hint="Score at or below this = Low risk">
          <TextInput type="number" min={0} max={100} value={form.low} onChange={(e) => setForm({ ...form, low: Number(e.target.value) })} />
        </FormField>
        <FormField label="Moderate / High boundary" hint="Score at or below this = Moderate">
          <TextInput type="number" min={0} max={100} value={form.moderate} onChange={(e) => setForm({ ...form, moderate: Number(e.target.value) })} />
        </FormField>
        <FormField label="High / Critical boundary" hint="Score at or below this = High">
          <TextInput type="number" min={0} max={100} value={form.high} onChange={(e) => setForm({ ...form, high: Number(e.target.value) })} />
        </FormField>
      </div>
      <button onClick={save} className="self-start rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
        Save risk thresholds
      </button>
    </div>
  );
}

/* ---------------------------------- Notification Settings ---------------------------------- */
const NOTIF_LABELS = {
  maintenanceReminders: "Preventive maintenance reminders",
  highRiskAlerts: "High-risk / AI prediction alerts",
  faultNotifications: "Fault report notifications",
  calibrationReminders: "Calibration reminders",
  warrantyExpiryAlerts: "Warranty expiry alerts",
};

function NotificationsSettingsTab() {
  const { settings, updateSettingsSection } = useData();

  function toggle(key) {
    updateSettingsSection("notifications", { [key]: !settings.notifications[key] });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-ink mb-1">Notification settings</h3>
      <p className="text-xs text-muted mb-3">Turning these off hides that category from the Notifications page and the bell icon.</p>
      {Object.entries(NOTIF_LABELS).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between py-2.5 border-t border-divider first:border-0 text-sm text-ink">
          {label}
          <input type="checkbox" checked={!!settings.notifications[key]} onChange={() => toggle(key)} />
        </label>
      ))}
    </div>
  );
}

/* ---------------------------------- Data Management ---------------------------------- */
function DataManagementTab() {
  const { dataMode, loadDemoData, resetDemoData, startEmptyHospital, clearAllLocalData, exportAllData } = useData();
  const [confirmAction, setConfirmAction] = useState(null);

  const CONFIRM_COPY = {
    reset: { title: "Reset demo data?", message: "This replaces all current equipment, tickets, spare parts, and users with a fresh copy of the demo fleet. Any changes you've made will be lost.", confirmLabel: "Reset demo data", run: resetDemoData },
    empty: { title: "Start with an empty hospital?", message: "This clears all equipment, tickets, spare parts, and users so you can build your own inventory from scratch.", confirmLabel: "Start empty", run: startEmptyHospital },
    clear: { title: "Clear all local data?", message: "This permanently wipes everything stored in this browser, including settings and the audit log. This cannot be undone.", confirmLabel: "Clear everything", run: clearAllLocalData },
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink mb-1">Data management</h3>
      <p className="text-xs text-muted mb-4">
        Currently in <span className="font-semibold text-ink">{dataMode === "demo" ? "Demo Data" : "Empty Hospital"}</span> mode.
        Everything here is stored locally in this browser — nothing is sent anywhere yet.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onClick={loadDemoData} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2.5 text-ink hover:bg-accent-soft transition-colors">
          <Sparkles size={13} /> Load demo data
        </button>
        <button onClick={() => setConfirmAction("reset")} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2.5 text-ink hover:bg-accent-soft transition-colors">
          <RotateCcw size={13} /> Reset demo data
        </button>
        <button onClick={() => setConfirmAction("empty")} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2.5 text-ink hover:bg-accent-soft transition-colors">
          <Trash2 size={13} /> Start empty hospital
        </button>
        <button onClick={exportAllData} className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2.5 text-ink hover:bg-accent-soft transition-colors">
          <Download size={13} /> Export local data (JSON)
        </button>
      </div>
      <button onClick={() => setConfirmAction("clear")} className="mt-3 w-full text-center text-xs font-semibold text-[#D9364B] hover:underline">
        Clear all local data
      </button>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? CONFIRM_COPY[confirmAction].title : ""}
        message={confirmAction ? CONFIRM_COPY[confirmAction].message : ""}
        confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction].confirmLabel : ""}
        onConfirm={() => { CONFIRM_COPY[confirmAction].run(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
