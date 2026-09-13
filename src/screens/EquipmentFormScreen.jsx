import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { useApp, SCREENS } from "../context/AppContext.jsx";
import { useData } from "../context/AppDataContext.jsx";
import { STATUSES, CONDITIONS } from "../data/equipment.js";
import { validateEquipment } from "../lib/validation.js";
import StepProgress from "../components/StepProgress.jsx";
import FormField, { TextInput, Select } from "../components/FormField.jsx";

const STEPS = ["Basic Info", "Location", "Lifecycle", "Maintenance", "Review"];
const USAGE_LEVELS = ["Low", "Medium", "High", "Very High"];
const CRITICALITY_LEVELS = ["Critical", "High", "Moderate", "Low"];

function emptyForm() {
  return {
    name: "",
    assetTag: "",
    category: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    department: "",
    location: "",
    assignedEngineer: "",
    vendor: "",
    status: "Operational",
    condition: "Good",
    clinicalCriticality: "Moderate",
    purchaseDate: "",
    installDate: "",
    warrantyStart: "",
    warrantyExpiry: "",
    expectedLifespanYears: 10,
    operatingHoursPerWeek: 40,
    usageFrequency: "Medium",
    lastMaintenanceDate: "",
    nextMaintenanceDate: "",
    lastCalibrationDate: "",
    nextCalibrationDate: "",
  };
}

export default function EquipmentFormScreen() {
  const { navigate, editingEquipmentId, openEquipment } = useApp();
  const { equipment, settings, users, addEquipment, updateEquipment } =
    useData();
  const isEdit = !!editingEquipmentId;
  const existing = isEdit
    ? equipment.find((e) => e.id === editingEquipmentId)
    : null;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(
    existing ? { ...emptyForm(), ...existing } : emptyForm(),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const departments = [
    ...new Set([
      ...(settings.departments || []).map((d) => d.name),
      ...equipment.map((e) => e.department),
    ]),
  ];
  const categories = [
    ...new Set([
      ...(settings.categories || []),
      ...equipment.map((e) => e.category),
    ]),
  ];
  const engineers = [
    ...new Set(
      users.filter((u) => u.role.includes("Biomedical")).map((u) => u.name),
    ),
  ];

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const STEP_REQUIRED_FIELDS = {
    0: ["name", "assetTag", "category"],
    1: ["department"],
    2: ["installDate"],
  };

  function goNext() {
    const fieldsToCheck = STEP_REQUIRED_FIELDS[step];
    if (fieldsToCheck) {
      const { errors: e } = validateEquipment(form);
      // Only block on errors for fields actually shown on this step —
      // validateEquipment checks the WHOLE form (all steps at once), so
      // without this filter, step 0 would block forever on department/
      // installDate before the user ever sees those fields.
      const stepErrors = Object.fromEntries(
        Object.entries(e).filter(([field]) => fieldsToCheck.includes(field)),
      );
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      if (Object.keys(stepErrors).length > 0) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    if (step === 0) {
      navigate(SCREENS.EQUIPMENT);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function applyMaintenanceDefaults() {
    const interval = settings.maintenance?.defaultIntervalDays || 90;
    const base = form.installDate || new Date().toISOString().slice(0, 10);
    const next = new Date(new Date(base).getTime() + interval * 86400000)
      .toISOString()
      .slice(0, 10);
    set("nextMaintenanceDate", form.nextMaintenanceDate || next);
    set("lastMaintenanceDate", form.lastMaintenanceDate || base);
    set("nextCalibrationDate", form.nextCalibrationDate || next);
    set("lastCalibrationDate", form.lastCalibrationDate || base);
  }

  async function save(addAnother = false) {
    if (saving) return; // guard against duplicate submission (double-click, etc.)

    const { errors: e, isValid } = validateEquipment(form);
    setErrors(e);
    if (!isValid) {
      setStep(0);
      return;
    }

    setSaving(true);
    setSaveError(null);
    const payload = {
      ...form,
      expectedLifespanYears: Number(form.expectedLifespanYears) || 10,
      operatingHoursPerWeek: Number(form.operatingHoursPerWeek) || 0,
      maintenanceRecords: existing?.maintenanceRecords || [],
      repairRecords: existing?.repairRecords || [],
      documents: existing?.documents || [],
    };

    try {
      if (isEdit) {
        await updateEquipment(editingEquipmentId, payload);
        openEquipment(editingEquipmentId);
      } else {
        const created = await addEquipment(payload);
        if (addAnother) {
          setForm(emptyForm());
          setStep(0);
        } else {
          openEquipment(created.id);
        }
      }
      // Navigation above only runs once the awaited call has actually
      // succeeded -- if it throws, we go straight to catch instead and
      // never leave this screen.
    } catch (err) {
      setSaveError(err.message || "Failed to save equipment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-ink font-display">
          {isEdit ? "Edit equipment" : "Add equipment"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {isEdit
            ? `Updating ${existing?.name}`
            : "Register a new piece of equipment in your inventory."}
        </p>
      </div>

      <StepProgress steps={STEPS} currentStep={step} />

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card flex flex-col gap-4">
        {step === 0 && (
          <>
            <FormField label="Equipment name" required error={errors.name}>
              <TextInput
                value={form.name}
                error={errors.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ventilator ICU-05"
              />
            </FormField>
            <FormField label="Asset tag" required error={errors.assetTag}>
              <TextInput
                value={form.assetTag}
                error={errors.assetTag}
                onChange={(e) => set("assetTag", e.target.value)}
                placeholder="e.g. MT-VEN-015"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" required error={errors.category}>
                <Select
                  value={form.category}
                  error={errors.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Manufacturer">
                <TextInput
                  value={form.manufacturer}
                  onChange={(e) => set("manufacturer", e.target.value)}
                />
              </FormField>
              <FormField label="Model">
                <TextInput
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </FormField>
              <FormField label="Serial number">
                <TextInput
                  value={form.serialNumber}
                  onChange={(e) => set("serialNumber", e.target.value)}
                />
              </FormField>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Department" required error={errors.department}>
                <Select
                  value={form.department}
                  error={errors.department}
                  onChange={(e) => set("department", e.target.value)}
                >
                  <option value="">Select…</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Room / Location">
                <TextInput
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. ICU Bay 4"
                />
              </FormField>
              <FormField label="Assigned engineer">
                <Select
                  value={form.assignedEngineer}
                  onChange={(e) => set("assignedEngineer", e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {engineers.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Vendor / Supplier">
                <TextInput
                  value={form.vendor}
                  onChange={(e) => set("vendor", e.target.value)}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Condition">
                <Select
                  value={form.condition}
                  onChange={(e) => set("condition", e.target.value)}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Clinical criticality"
                hint="How important to patient care"
              >
                <Select
                  value={form.clinicalCriticality}
                  onChange={(e) => set("clinicalCriticality", e.target.value)}
                >
                  {CRITICALITY_LEVELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Purchase date" error={errors.purchaseDate}>
              <TextInput
                type="date"
                value={form.purchaseDate}
                error={errors.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
              />
            </FormField>
            <FormField
              label="Installation date"
              required
              error={errors.installDate}
            >
              <TextInput
                type="date"
                value={form.installDate}
                error={errors.installDate}
                onChange={(e) => set("installDate", e.target.value)}
              />
            </FormField>
            <FormField label="Warranty start">
              <TextInput
                type="date"
                value={form.warrantyStart}
                onChange={(e) => set("warrantyStart", e.target.value)}
              />
            </FormField>
            <FormField label="Warranty expiry">
              <TextInput
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => set("warrantyExpiry", e.target.value)}
              />
            </FormField>
            <FormField
              label="Expected useful life (years)"
              error={errors.expectedLifespanYears}
            >
              <TextInput
                type="number"
                value={form.expectedLifespanYears}
                error={errors.expectedLifespanYears}
                onChange={(e) => set("expectedLifespanYears", e.target.value)}
              />
            </FormField>
            <FormField
              label="Operating hours / week"
              error={errors.operatingHoursPerWeek}
            >
              <TextInput
                type="number"
                value={form.operatingHoursPerWeek}
                error={errors.operatingHoursPerWeek}
                onChange={(e) => set("operatingHoursPerWeek", e.target.value)}
              />
            </FormField>
            <FormField label="Usage frequency">
              <Select
                value={form.usageFrequency}
                onChange={(e) => set("usageFrequency", e.target.value)}
              >
                {USAGE_LEVELS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {step === 3 && (
          <>
            <button
              onClick={applyMaintenanceDefaults}
              className="self-start text-xs font-semibold text-accent hover:underline mb-1"
            >
              Fill in from Settings → Maintenance defaults
            </button>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Last maintenance date">
                <TextInput
                  type="date"
                  value={form.lastMaintenanceDate}
                  onChange={(e) => set("lastMaintenanceDate", e.target.value)}
                />
              </FormField>
              <FormField label="Next maintenance date">
                <TextInput
                  type="date"
                  value={form.nextMaintenanceDate}
                  onChange={(e) => set("nextMaintenanceDate", e.target.value)}
                />
              </FormField>
              <FormField label="Last calibration date">
                <TextInput
                  type="date"
                  value={form.lastCalibrationDate}
                  onChange={(e) => set("lastCalibrationDate", e.target.value)}
                />
              </FormField>
              <FormField label="Next calibration date">
                <TextInput
                  type="date"
                  value={form.nextCalibrationDate}
                  onChange={(e) => set("nextCalibrationDate", e.target.value)}
                />
              </FormField>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink mb-1">
              Review before saving
            </h3>
            {[
              ["Name", form.name],
              ["Asset tag", form.assetTag],
              ["Category", form.category],
              ["Department", form.department],
              ["Location", form.location],
              ["Status", form.status],
              ["Condition", form.condition],
              ["Criticality", form.clinicalCriticality],
              ["Install date", form.installDate],
              ["Next maintenance", form.nextMaintenanceDate || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between text-sm py-1.5 border-b border-divider last:border-0"
              >
                <span className="text-muted">{label}</span>
                <span className="text-ink font-medium">{value || "—"}</span>
              </div>
            ))}
          </div>
        )}

        {saveError && (
          <div className="text-xs text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-3 py-2 mt-3">
            {saveError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-divider mt-1">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <div className="flex gap-2">
              {!isEdit && (
                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  className="rounded-lg border border-border text-sm font-semibold px-4 py-2 text-ink disabled:opacity-50"
                >
                  Save &amp; add another
                </button>
              )}
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Check size={15} />{" "}
                {saving
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Save equipment"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
