import { useState } from "react";
import { Users, Plus, Search, MoreVertical, X } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { ROLES, PERMISSIONS } from "../data/roles.js";
import { fmtDate } from "../lib/dates.js";

const ROLE_COLORS = {
  "Biomedical Engineer": "#2F7DE1",
  "Head of Biomedical Engineering": "#7C5FE0",
  "Hospital Administrator": "#1F9D6B",
  "Department Staff": "#D89A1F",
  "System Administrator": "#D9364B",
};
const AVATAR_COLORS = ["#2F7DE1", "#1F9D6B", "#7C5FE0", "#5B7591", "#D9364B", "#D89A1F"];

const PERMISSION_LABELS = {
  registerEquipment: "Register equipment",
  editEquipment: "Edit equipment / criticality",
  performMaintenance: "Perform maintenance",
  createSchedules: "Create maintenance schedules",
  recordBreakdowns: "Record breakdowns/repairs",
  uploadDocuments: "Upload documents",
  scanQR: "Scan QR asset tags",
  viewAIRisk: "View AI risk predictions",
  updateCondition: "Update equipment condition",
  approveReports: "Approve maintenance reports",
  assignTasks: "Assign tasks to engineers",
  viewCosts: "View maintenance costs",
  viewReplacementRecs: "View replacement recommendations",
  reportFault: "Report equipment faults",
  manageUsers: "Manage users & permissions",
};

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function UsersScreen() {
  const { users, usersLoading, usersError, refreshUsers, addUser, toggleUserActive } = useData();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: ROLES[0], department: "" });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const roleCounts = ROLES.map((r) => ({ role: r, count: users.filter((u) => u.role === r).length }));

  const filtered = users.filter((u) => {
    const matchQuery = (u.name + u.email).toLowerCase().includes(query.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchQuery && matchRole;
  });

  async function submit() {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    setFormError(null);
    const { error } = await addUser({ ...form });
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    setShowAdd(false);
    setForm({ name: "", email: "", role: ROLES[0], department: "" });
  }

  async function handleToggle(id) {
    setOpenMenuId(null);
    setTogglingId(id);
    await toggleUserActive(id);
    setTogglingId(null);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display flex items-center gap-2">
            <Users size={20} color="#2F7DE1" /> Users &amp; roles
          </h1>
          <p className="text-sm text-muted mt-1">{usersLoading ? "Loading users…" : `${users.length} users`} · System Administrator only</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-3 py-2 hover:opacity-90 transition-opacity">
          <Plus size={14} /> Add user
        </button>
      </div>

      {usersError && (
        <div className="rounded-xl border border-[#D9364B4D] bg-[#D9364B0D] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-[#D9364B]">Couldn't load users: {usersError}</span>
          <button onClick={refreshUsers} className="text-xs font-semibold text-[#D9364B] shrink-0">Retry</button>
        </div>
      )}

      {/* Role overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {roleCounts.map((r) => (
          <button
            key={r.role}
            onClick={() => setRoleFilter(roleFilter === r.role ? "All" : r.role)}
            className="rounded-xl border p-3 text-left transition-colors"
            style={{
              borderColor: roleFilter === r.role ? ROLE_COLORS[r.role] : "#D7E4F2",
              backgroundColor: roleFilter === r.role ? ROLE_COLORS[r.role] + "0D" : "#FFFFFF",
            }}
          >
            <div className="text-2xl font-semibold font-display text-ink">{r.count}</div>
            <div className="text-[11px] text-muted leading-tight mt-1">{r.role}</div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 flex-1 min-w-[220px]">
          <Search size={15} color="#5B7591" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
          />
        </div>
        {roleFilter !== "All" && (
          <button onClick={() => setRoleFilter("All")} className="text-xs text-accent font-medium px-2">
            Clear role filter
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Last Login</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className="bg-surface" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-ink font-medium truncate">{u.name}</div>
                      <div className="text-[11px] text-muted truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: ROLE_COLORS[u.role], backgroundColor: ROLE_COLORS[u.role] + "17" }}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{u.department}</td>
                <td className="px-4 py-3 text-muted text-xs font-mono">{fmtDate(u.lastLogin)}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold"
                    style={{ color: u.active ? "#1F9D6B" : "#93A9C0", backgroundColor: u.active ? "#1F9D6B17" : "#93A9C017" }}
                  >
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                    disabled={togglingId === u.id}
                    className="text-faint hover:text-ink transition-colors disabled:opacity-40"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === u.id && (
                    <div className="absolute right-4 top-10 z-10 w-40 rounded-lg border border-border bg-surface shadow-tag overflow-hidden">
                      <button
                        onClick={() => handleToggle(u.id)}
                        className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-accent-soft"
                      >
                        {u.active ? "Disable user" : "Activate user"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted bg-surface">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role permissions matrix — built from the real permission map, not hardcoded */}
      <div className="rounded-xl border border-border bg-surface shadow-card">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-ink">Role permissions matrix</h3>
          <p className="text-xs text-muted mt-0.5">What each role can do in this phase (drives visible actions across the app)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-muted uppercase tracking-wide font-mono">
                <th className="text-left px-5 py-3 font-medium">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center px-3 py-3 font-medium" style={{ color: ROLE_COLORS[r] }}>
                    {r.split(" ").map((w) => w[0]).join("")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSION_LABELS).map(([key, label], i) => (
                <tr key={key} style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                  <td className="px-5 py-2.5 text-ink">{label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="text-center px-3 py-2.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: PERMISSIONS[r][key] ? "#1F9D6B" : "#E5EEF7" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0F3058]/40" onClick={() => !submitting && setShowAdd(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface shadow-tag p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Add user</h3>
              <button onClick={() => setShowAdd(false)} disabled={submitting}><X size={16} color="#5B7591" /></button>
            </div>
            <p className="text-xs text-muted -mt-2 mb-3">
              They'll get an email invite to set their own password — no temporary password to hand out.
            </p>
            <div className="flex flex-col gap-3">
              {formError && (
                <div className="text-xs text-[#D9364B] bg-[#D9364B0D] border border-[#D9364B4D] rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
              <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={submitting} className="text-sm border border-border rounded-lg px-3 py-2 outline-none disabled:opacity-60" />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={submitting} className="text-sm border border-border rounded-lg px-3 py-2 outline-none disabled:opacity-60" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={submitting} className="text-sm border border-border rounded-lg px-3 py-2 outline-none disabled:opacity-60">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={submitting} className="text-sm border border-border rounded-lg px-3 py-2 outline-none disabled:opacity-60" />
              <div className="flex gap-2 mt-1">
                <button onClick={submit} disabled={submitting} className="flex-1 rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2 disabled:opacity-60">
                  {submitting ? "Sending invite…" : "Send invite"}
                </button>
                <button onClick={() => setShowAdd(false)} disabled={submitting} className="flex-1 rounded-lg border border-border text-xs font-semibold px-4 py-2 text-muted disabled:opacity-60">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
