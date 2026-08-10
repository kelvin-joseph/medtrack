import { useApp } from "../context/AppContext.jsx";
import {
  ClipboardList, CheckCircle2, Wrench, XCircle, Clock, AlertOctagon,
  ShieldAlert, Cpu, AlertTriangle, Info, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from "recharts";
import { useData } from "../context/AppDataContext.jsx";
import { computeAlerts } from "../lib/alerts.js";
import { NOW, daysBetween } from "../lib/dates.js";
import StatCard from "../components/StatCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

const CONDITION_ORDER = ["Excellent", "Good", "Fair", "Poor", "Critical"];
const CONDITION_COLOR = { Excellent: "#1F9D6B", Good: "#5FB88B", Fair: "#D89A1F", Poor: "#E07A2F", Critical: "#D9364B" };
const RISK_ORDER = ["Very Low", "Low", "Moderate", "High", "Critical"];
const RISK_COLOR = { "Very Low": "#1F9D6B", Low: "#5FB88B", Moderate: "#D89A1F", High: "#E07A2F", Critical: "#D9364B" };

function lastNMonths(n) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }) });
  }
  return months;
}

export default function Dashboard() {
  const { openEquipment } = useApp();
  const { equipment, loadDemoData } = useData();

  if (equipment.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={ClipboardList}
          title="Welcome to MedTrack"
          description="Your hospital's equipment inventory is empty. Add your first piece of equipment to start tracking maintenance and AI risk predictions, or load the demo fleet to see the app in action first."
          action={
            <button onClick={loadDemoData} className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
              <Sparkles size={14} /> Load demo data
            </button>
          }
        />
      </div>
    );
  }

  const total = equipment.length;
  const operational = equipment.filter((e) => e.status === "Operational").length;
  const underMaintenance = equipment.filter((e) => e.status === "Under Maintenance").length;
  const outOfService = equipment.filter((e) => e.status === "Out of Service" || e.status === "Under Repair").length;
  const maintenanceDue = equipment.filter((e) => {
    const d = daysBetween(NOW, e.nextMaintenanceDate);
    return d >= 0 && d <= 7;
  }).length;
  const overdueMaintenance = equipment.filter((e) => daysBetween(e.nextMaintenanceDate, NOW) > 0).length;
  const highRisk = equipment.filter((e) => ["High", "Critical"].includes(e._ai.risk.level)).length;
  const highFailureProb = equipment.filter((e) => e._ai.failureProb.p90 >= 60).length;

  const conditionDist = CONDITION_ORDER.map((c) => ({
    name: c, value: equipment.filter((e) => e.condition === c).length, color: CONDITION_COLOR[c],
  }));
  const riskDist = RISK_ORDER.map((r) => ({
    name: r, value: equipment.filter((e) => e._ai.risk.level === r).length, color: RISK_COLOR[r],
  }));

  const byDept = [...new Set(equipment.map((e) => e.department))].map((d) => ({
    department: d, count: equipment.filter((e) => e.department === d).length,
  }));
  const months = lastNMonths(8);
  const failureTrend = months.map(({ key, label }) => ({
    month: label,
    failures: equipment.reduce((sum, e) => sum + e.repairRecords.filter((r) => {
      const d = new Date(r.date);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    }).length, 0),
  }));
  const downtimeByMonth = months.map(({ key, label }) => ({
    month: label,
    hours: equipment.reduce((sum, e) => sum + e.repairRecords.filter((r) => {
      const d = new Date(r.date);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    }).reduce((s, r) => s + (r.downtimeHours || 0), 0), 0),
  }));
  const costByMonth = months.map(({ key, label }) => {
    const all = equipment.flatMap((e) => [...e.maintenanceRecords, ...e.repairRecords]);
    return {
      month: label,
      cost: all.filter((r) => {
        const d = new Date(r.date);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).reduce((s, r) => s + (r.cost || 0), 0),
    };
  });

  const alerts = computeAlerts(equipment).slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink font-display">Fleet overview</h1>
        <p className="text-sm text-muted mt-1">Real-time status across all tracked biomedical equipment.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Total Equipment" value={total} accent="#2F7DE1" />
        <StatCard icon={CheckCircle2} label="Operational" value={operational} accent="#1F9D6B" />
        <StatCard icon={Wrench} label="Under Maintenance" value={underMaintenance} accent="#D89A1F" />
        <StatCard icon={XCircle} label="Out of Service" value={outOfService} accent="#D9364B" />
        <StatCard icon={Clock} label="Maintenance Due" value={maintenanceDue} accent="#2F7DE1" sub="next 7 days" />
        <StatCard icon={AlertOctagon} label="Overdue Maintenance" value={overdueMaintenance} accent="#E07A2F" />
        <StatCard icon={ShieldAlert} label="High-Risk Equipment" value={highRisk} accent="#D9364B" />
        <StatCard icon={Cpu} label="High Failure Probability" value={highFailureProb} accent="#D9364B" sub="p90 ≥ 60%" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-3">Equipment Health Overview</h3>
          <div className="flex flex-col gap-2">
            {conditionDist.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs text-muted w-16 shrink-0">{c.name}</span>
                <div className="flex-1 h-2 rounded-full bg-accent-soft overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.value / total) * 100}%`, backgroundColor: c.color }} />
                </div>
                <span className="text-xs font-mono text-ink w-5 text-right">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="text-sm font-semibold text-ink mb-3">AI Risk Overview</h3>
          <div className="flex flex-col gap-2">
            {riskDist.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="text-xs text-muted w-16 shrink-0">{r.name}</span>
                <div className="flex-1 h-2 rounded-full bg-accent-soft overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, backgroundColor: r.color }} />
                </div>
                <span className="text-xs font-mono text-ink w-5 text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Equipment by Department">
          <BarChart data={byDept}>
            <CartesianGrid stroke="#E5EEF7" vertical={false} />
            <XAxis dataKey="department" stroke="#5B7591" fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={45} />
            <YAxis stroke="#5B7591" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#2F7DE1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Equipment Failure Trends">
          <LineChart data={failureTrend}>
            <CartesianGrid stroke="#E5EEF7" vertical={false} />
            <XAxis dataKey="month" stroke="#5B7591" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#5B7591" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="failures" stroke="#D9364B" strokeWidth={2} dot={{ r: 3, fill: "#D9364B" }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Equipment Downtime (hrs/month)">
          <BarChart data={downtimeByMonth}>
            <CartesianGrid stroke="#E5EEF7" vertical={false} />
            <XAxis dataKey="month" stroke="#5B7591" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#5B7591" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="hours" fill="#E07A2F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Maintenance Costs (₦/month)">
          <LineChart data={costByMonth}>
            <CartesianGrid stroke="#E5EEF7" vertical={false} />
            <XAxis dataKey="month" stroke="#5B7591" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#5B7591" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₦${v.toLocaleString()}`} />
            <Line type="monotone" dataKey="cost" stroke="#2F7DE1" strokeWidth={2} dot={{ r: 3, fill: "#2F7DE1" }} />
          </LineChart>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-3">Critical Alerts</h3>
        {alerts.length === 0 && <div className="text-sm text-muted text-center py-4">No active alerts.</div>}
        <div className="flex flex-col gap-2">
          {alerts.map((a) => (
            <button
              key={a.id}
              onClick={() => openEquipment(a.equipment.id)}
              className="flex items-center gap-3 rounded-lg border border-border hover:border-accent/50 hover:bg-accent-soft px-3 py-2.5 text-left transition-colors"
            >
              {a.severity === "critical" ? (
                <AlertTriangle size={15} color="#D9364B" className="shrink-0" />
              ) : (
                <Info size={15} color="#93A9C0" className="shrink-0" />
              )}
              <span className="text-sm text-ink">{a.message}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = { background: "#FFFFFF", border: "1px solid #D7E4F2", borderRadius: 8, fontSize: 12 };

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 className="text-xs font-semibold text-ink mb-1">{title}</h3>
      <ResponsiveContainer width="100%" height={190}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
