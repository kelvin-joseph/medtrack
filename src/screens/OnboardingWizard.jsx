import { useState } from "react";
import {
  Activity, Building2, MapPin, Tag, Users, Sparkles, ArrowRight, ArrowLeft, Plus, X, Check,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { ROLES } from "../data/roles.js";
import StepProgress from "../components/StepProgress.jsx";
import FormField, { TextInput, Select } from "../components/FormField.jsx";

const STEPS = ["Welcome", "Hospital", "Departments", "Categories", "Team", "Finish"];

const SUGGESTED_CATEGORIES = [
  "Ventilator", "Patient Monitor", "ECG Machine", "Infusion Pump", "Defibrillator",
  "Ultrasound Machine", "X-Ray Machine", "CT Scanner", "MRI Machine", "Anaesthesia Machine",
  "Incubator", "Autoclave", "Dialysis Machine",
];

export default function OnboardingWizard() {
  const { settings, updateSettings } = useData();
  const { role, profile } = useRole();
  const [step, setStep] = useState(0);

  const [hospital, setHospital] = useState(settings.hospital);
  const [departments, setDepartments] = useState(settings.departments || []);
  const [newDept, setNewDept] = useState("");
  const [categories, setCategories] = useState(settings.categories || []);
  const [newCat, setNewCat] = useState("");
  const [team, setTeam] = useState([{ name: "", email: "", role: ROLES[0] }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function finish() {
    if (submitting) return; // guard against double-click/duplicate submission
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateSettings({
        onboardingComplete: true,
        hospital,
        departments,
        categories,
      });
      // No navigation call needed here — App.jsx's render gate reads
      // settings.onboardingComplete from this same context, so it moves
      // past this screen automatically once the awaited update above has
      // actually updated that state. If the update below throws, we never
      // reach this point and the wizard correctly stays put.
    } catch (err) {
      setSubmitError(err.message || "Failed to save your hospital setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function skip() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateSettings({ onboardingComplete: true });
    } catch (err) {
      setSubmitError(err.message || "Failed to skip setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function addDepartment() {
    const name = newDept.trim();
    if (!name || departments.some((d) => d.name === name)) return;
    setDepartments([...departments, { id: `DEPT-${Date.now()}`, name, buildings: [] }]);
    setNewDept("");
  }

  function toggleCategory(cat) {
    setCategories((c) => (c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]));
  }

  function addCustomCategory() {
    const name = newCat.trim();
    if (!name || categories.includes(name)) return;
    setCategories([...categories, name]);
    setNewCat("");
  }

  function updateTeamRow(i, patch) {
    setTeam((t) => t.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addTeamRow() {
    setTeam((t) => [...t, { name: "", email: "", role: ROLES[0] }]);
  }

  return (
    <div className="min-h-screen w-full bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-tag p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Activity size={18} color="#FFFFFF" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink font-display">Welcome to MedTrack</div>
            <div className="text-[11px] text-muted">Let's set up your hospital in a few quick steps.</div>
          </div>
        </div>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="min-h-[260px]">
          {step === 0 && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <Sparkles size={32} color="#2F7DE1" />
              <h2 className="text-base font-semibold text-ink">Welcome, {profile?.name || "there"} — you're signed in as {role}</h2>
              <p className="text-sm text-muted max-w-sm">
                In the next few steps we'll set up your hospital profile, departments, and equipment categories —
                then you can start adding your equipment.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5"><Building2 size={14} color="#2F7DE1" /> Hospital profile</h3>
              <FormField label="Hospital name" required>
                <TextInput value={hospital.name} onChange={(e) => setHospital({ ...hospital, name: e.target.value })} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Contact email">
                  <TextInput type="email" value={hospital.contactEmail} onChange={(e) => setHospital({ ...hospital, contactEmail: e.target.value })} />
                </FormField>
                <FormField label="Phone">
                  <TextInput value={hospital.phone} onChange={(e) => setHospital({ ...hospital, phone: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Address">
                <TextInput value={hospital.address} onChange={(e) => setHospital({ ...hospital, address: e.target.value })} />
              </FormField>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5"><MapPin size={14} color="#2F7DE1" /> Departments</h3>
              <p className="text-xs text-muted -mt-1">Add the departments that use biomedical equipment. You can add more later in Settings.</p>
              <div className="flex gap-2">
                <TextInput value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="e.g. ICU, Radiology, Surgery…" onKeyDown={(e) => e.key === "Enter" && addDepartment()} />
                <button onClick={addDepartment} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <span key={d.id} className="flex items-center gap-1.5 text-xs font-medium text-ink bg-accent-soft border border-border rounded-full pl-3 pr-2 py-1.5">
                    {d.name}
                    <button onClick={() => setDepartments(departments.filter((x) => x.id !== d.id))} className="text-faint hover:text-[#D9364B]"><X size={12} /></button>
                  </span>
                ))}
                {departments.length === 0 && <span className="text-xs text-muted">No departments added yet.</span>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5"><Tag size={14} color="#2F7DE1" /> Equipment categories</h3>
              <p className="text-xs text-muted -mt-1">Tap to select the categories you'll be tracking.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                      categories.includes(cat) ? "bg-accent text-white border-accent" : "bg-surface text-muted border-border hover:border-accent/50"
                    }`}
                  >
                    {categories.includes(cat) && <Check size={11} className="inline mr-1 -mt-0.5" />}
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <TextInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Add a custom category…" onKeyDown={(e) => e.key === "Enter" && addCustomCategory()} />
                <button onClick={addCustomCategory} className="shrink-0 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink">Add</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5"><Users size={14} color="#2F7DE1" /> Invite your team</h3>
              <p className="text-xs text-muted -mt-1">Optional — you can add users later from Users &amp; Roles.</p>
              {team.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <TextInput placeholder="Name" value={row.name} onChange={(e) => updateTeamRow(i, { name: e.target.value })} />
                  <TextInput placeholder="Email" value={row.email} onChange={(e) => updateTeamRow(i, { email: e.target.value })} />
                  <Select value={row.role} onChange={(e) => updateTeamRow(i, { role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </div>
              ))}
              <button onClick={addTeamRow} className="self-start flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                <Plus size={13} /> Add another person
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <Check size={32} color="#1F9D6B" />
              <h2 className="text-base font-semibold text-ink">You're all set, {hospital.name || "there"}!</h2>
              <p className="text-sm text-muted max-w-sm">
                Your hospital profile, {departments.length} department{departments.length === 1 ? "" : "s"}, and{" "}
                {categories.length} categor{categories.length === 1 ? "y" : "ies"} are saved. You can start adding
                equipment right away.
              </p>
            </div>
          )}
        </div>

        {submitError && (
          <div className="text-xs text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-3 py-2">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-divider">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} disabled={submitting} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors disabled:opacity-60">
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button onClick={skip} disabled={submitting} className="text-xs text-faint hover:text-muted underline disabled:opacity-60">
              {submitting ? "Skipping…" : "Skip setup for now"}
            </button>
          </div>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity">
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={finish} disabled={submitting} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-60">
              <Check size={15} /> {submitting ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
