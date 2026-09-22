import { useState } from "react";
import { X, ClipboardCheck } from "lucide-react";
import FormField, { TextInput, Select, TextArea } from "./FormField.jsx";

const FINAL_STATUS_OPTIONS = ["Resolved", "Partially Resolved", "Recurring — monitor", "Unresolved"];

/**
 * Repair Record form shown when completing a Work Order.
 *
 * This component only collects and validates data — it does not call
 * repairRecordService or completeWorkOrder itself. The caller receives the
 * collected fields via onSubmit and is responsible for persisting them and
 * closing the dialog.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - workOrder: the selected Work Order (read-only context)
 *  - ticket: the linked Fault Ticket, if any (read-only context)
 *  - equipment: the equipment record for the Work Order (for display name)
 *  - onSubmit: (repairData) => void — called with the collected form data
 */
export default function CompleteWorkOrderDialog({ open, onClose, workOrder, ticket, equipment, onSubmit }) {
  const [errorCode, setErrorCode] = useState("");
  const [suspectedCause, setSuspectedCause] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [cost, setCost] = useState("0");
  const [downtimeHours, setDowntimeHours] = useState("0");
  const [finalStatus, setFinalStatus] = useState("");

  const [errors, setErrors] = useState({});

  if (!open) return null;

  function validate() {
    const nextErrors = {};
    if (!suspectedCause.trim()) nextErrors.suspectedCause = "Required.";
    if (!diagnosis.trim()) nextErrors.diagnosis = "Required.";
    if (!correctiveAction.trim()) nextErrors.correctiveAction = "Required.";
    if (!finalStatus) nextErrors.finalStatus = "Required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submit() {
    if (!validate()) return;
    // repairStart is deliberately not included here — it is not collected
    // from the engineer in this form, and must not be derived from
    // workOrder.scheduledDate or invented in any other way.
    onSubmit({
      workOrderId: workOrder?.id,
      equipmentId: workOrder?.equipmentId,
      engineer: workOrder?.assignedEngineer,
      reportedBy: ticket?.reportedBy,
      faultDescription: ticket?.description,
      errorCode: errorCode.trim() || undefined,
      suspectedCause: suspectedCause.trim(),
      diagnosis: diagnosis.trim(),
      correctiveAction: correctiveAction.trim(),
      partsReplaced: partsReplaced.trim() || undefined,
      cost: cost === "" ? 0 : Number(cost),
      downtimeHours: downtimeHours === "" ? 0 : Number(downtimeHours),
      finalStatus,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#0F3058]/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface sm:rounded-2xl rounded-t-2xl shadow-tag p-5 max-h-[90vh] overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <ClipboardCheck size={15} color="#2F7DE1" /> Complete work order — repair record
          </h3>
          <button onClick={onClose}><X size={17} color="#5B7591" /></button>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Work order details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Equipment">
              <TextInput value={equipment?.name || workOrder?.equipmentId || ""} disabled />
            </FormField>
            <FormField label="Work order ID">
              <TextInput value={workOrder?.id || ""} disabled />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Reported by">
              <TextInput value={ticket?.reportedBy || "—"} disabled />
            </FormField>
            <FormField label="Assigned engineer">
              <TextInput value={workOrder?.assignedEngineer || "—"} disabled />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Fault description">
              <TextArea rows={2} value={ticket?.description || "—"} disabled />
            </FormField>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Repair record — to be completed by the engineer
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Error code" hint="Optional">
              <TextInput value={errorCode} onChange={(e) => setErrorCode(e.target.value)} placeholder="e.g. E-104" />
            </FormField>
            <FormField label="Final status" required error={errors.finalStatus}>
              <Select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)}>
                <option value="">Select status…</option>
                {FINAL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Suspected cause" required error={errors.suspectedCause}>
              <TextArea rows={2} value={suspectedCause} onChange={(e) => setSuspectedCause(e.target.value)} />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Diagnosis" required error={errors.diagnosis}>
              <TextArea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Corrective action" required error={errors.correctiveAction}>
              <TextArea rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Parts replaced" hint="Optional">
              <TextInput value={partsReplaced} onChange={(e) => setPartsReplaced(e.target.value)} placeholder="e.g. Pressure sensor unit" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Cost" hint="Optional — defaults to 0">
              <TextInput type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
            </FormField>
            <FormField label="Downtime hours" hint="Optional — defaults to 0">
              <TextInput type="number" min="0" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={submit}
            className="flex-1 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            Save repair record
          </button>
          <button onClick={onClose} className="rounded-lg border border-border text-sm font-semibold px-4 py-2.5 text-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
