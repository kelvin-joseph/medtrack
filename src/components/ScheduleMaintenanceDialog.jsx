import { useState } from "react";
import { X, Wrench } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { MAINTENANCE_TYPES, PRIORITIES, RECURRENCE_OPTIONS, suggestPriority } from "../lib/workOrderEngine.js";
import FormField, { TextInput, Select, TextArea } from "./FormField.jsx";

export default function ScheduleMaintenanceDialog({ open, onClose, equipmentId: presetEquipmentId }) {
  const { equipment, users, settings, addWorkOrder } = useData();
  const engineers = [...new Set(users.filter((u) => u.role.includes("Biomedical")).map((u) => u.name))];

  const [equipmentId, setEquipmentId] = useState(presetEquipmentId || "");
  const selectedEq = equipment.find((e) => e.id === equipmentId);

  const [type, setType] = useState("Preventive");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(selectedEq ? suggestPriority(selectedEq) : "Medium");
  const [assignedEngineer, setAssignedEngineer] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState("none");
  const [customDays, setCustomDays] = useState(30);
  const [checklist, setChecklist] = useState(
    (settings.maintenance?.defaultChecklist || []).map((text) => ({ text, done: false }))
  );
  const [newItem, setNewItem] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  function pickEquipment(id) {
    setEquipmentId(id);
    const eq = equipment.find((e) => e.id === id);
    if (eq) {
      setPriority(suggestPriority(eq));
      setAssignedEngineer(eq.assignedEngineer || "");
    }
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    setChecklist([...checklist, { text: newItem.trim(), done: false }]);
    setNewItem("");
  }

  function submit() {
    if (!equipmentId) return;
    addWorkOrder({
      equipmentId, type, title: title || `${type} — ${selectedEq?.name || ""}`,
      description: "", priority, assignedEngineer, scheduledDate, dueDate,
      recurrence: { frequency, customDays: frequency === "custom" ? customDays : undefined },
      checklist, notes, createdBy: "Biomedical Engineer",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#0F3058]/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface sm:rounded-2xl rounded-t-2xl shadow-tag p-5 max-h-[90vh] overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5"><Wrench size={15} color="#2F7DE1" /> Schedule maintenance</h3>
          <button onClick={onClose}><X size={17} color="#5B7591" /></button>
        </div>

        {!presetEquipmentId && (
          <FormField label="Equipment" required>
            <Select value={equipmentId} onChange={(e) => pickEquipment(e.target.value)}>
              <option value="">Select equipment…</option>
              {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.name} — {eq.assetTag}</option>)}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Maintenance type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority" hint={selectedEq ? "AI-suggested from current risk" : undefined}>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormField>
        </div>

        <FormField label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quarterly ventilator service" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Assigned engineer">
            <Select value={assignedEngineer} onChange={(e) => setAssignedEngineer(e.target.value)}>
              <option value="">Unassigned</option>
              {engineers.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </FormField>
          <FormField label="Recurrence">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {RECURRENCE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Scheduled date">
            <TextInput type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </FormField>
          <FormField label="Due date">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>

        {frequency === "custom" && (
          <FormField label="Repeat every (days)">
            <TextInput type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
          </FormField>
        )}

        <div>
          <label className="text-xs font-medium text-ink">Checklist</label>
          <div className="flex flex-col gap-1.5 mt-1 mb-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ink bg-accent-soft rounded-lg px-3 py-1.5">
                <span className="flex-1">{item.text}</span>
                <button onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))} className="text-faint hover:text-[#D9364B]"><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item…" onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} />
            <button onClick={addChecklistItem} className="shrink-0 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink">Add</button>
          </div>
        </div>

        <FormField label="Notes">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        <div className="flex gap-2 mt-1">
          <button onClick={submit} disabled={!equipmentId} className="flex-1 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50">
            Schedule maintenance
          </button>
          <button onClick={onClose} className="rounded-lg border border-border text-sm font-semibold px-4 py-2.5 text-muted">Cancel</button>
        </div>
      </div>
    </div>
  );
}
