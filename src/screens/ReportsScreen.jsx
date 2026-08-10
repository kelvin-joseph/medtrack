import { useState } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { fmtDate } from "../lib/dates.js";
import { exportCSV, exportXLSX } from "../lib/exportEngine.js";

const today = () => new Date().toISOString().slice(0, 10);

function buildReports({ equipment, tickets, auditLog }) {
  return [
    {
      key: "inventory",
      title: "Equipment Inventory",
      description: "Full asset register — category, department, status, and condition.",
      columns: [
        { header: "Asset Tag", key: "assetTag" },
        { header: "Equipment Name", key: "name", wrap: true },
        { header: "Category", key: "category" },
        { header: "Department", key: "department" },
        { header: "Location", key: "location" },
        { header: "Manufacturer", key: "manufacturer" },
        { header: "Model", key: "model" },
        { header: "Status", key: "status" },
        { header: "Condition", key: "condition" },
        { header: "Assigned Engineer", key: "assignedEngineer" },
        { header: "AI Risk Score", key: "riskScore", numFmt: "0" },
        { header: "AI Risk Level", key: "riskLevel" },
      ],
      rows: () => equipment.map((e) => ({
        assetTag: e.assetTag, name: e.name, category: e.category, department: e.department,
        location: e.location, manufacturer: e.manufacturer, model: e.model, status: e.status,
        condition: e.condition, assignedEngineer: e.assignedEngineer,
        riskScore: e._ai.risk.score, riskLevel: e._ai.risk.level,
      })),
    },
    {
      key: "maintenance",
      title: "Maintenance Activities",
      description: "All preventive maintenance records logged to date.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Date", key: "date" },
        { header: "Type", key: "type" },
        { header: "Maintenance Note", key: "note", wrap: true },
        { header: "Assigned Engineer", key: "engineer" },
        { header: "Cost (₦)", key: "cost", numFmt: "#,##0" },
      ],
      rows: () => equipment.flatMap((e) => e.maintenanceRecords.map((r) => ({
        equipment: e.name, category: e.category, date: fmtDate(r.date), type: r.type,
        note: r.note, engineer: r.engineer, cost: r.cost,
      }))),
    },
    {
      key: "failures",
      title: "Equipment Fault & Repair History",
      description: "Breakdown and repair history across the fleet, with root cause.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Date", key: "date" },
        { header: "Fault Description", key: "fault", wrap: true },
        { header: "Error Code", key: "errorCode" },
        { header: "Suspected Cause", key: "cause", wrap: true },
        { header: "Corrective Action", key: "action", wrap: true },
        { header: "Cost (₦)", key: "cost", numFmt: "#,##0" },
        { header: "Downtime (hrs)", key: "downtime", numFmt: "0.0" },
        { header: "Status", key: "status" },
        { header: "Assigned Engineer", key: "engineer" },
      ],
      rows: () => equipment.flatMap((e) => e.repairRecords.map((r) => ({
        equipment: e.name, category: e.category, date: fmtDate(r.date), fault: r.faultDescription,
        errorCode: r.errorCode, cause: r.suspectedCause, action: r.correctiveAction, cost: r.cost,
        downtime: r.downtimeHours, status: r.finalStatus, engineer: r.engineer,
      }))),
    },
    {
      key: "downtime",
      title: "Downtime Report",
      description: "Total downtime hours and breakdown count per equipment.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Total Downtime (hrs)", key: "downtime", numFmt: "0.0" },
        { header: "Breakdown Count", key: "breakdowns", numFmt: "0" },
      ],
      rows: () => equipment.map((e) => ({
        equipment: e.name, category: e.category,
        downtime: e._ai.reliability.totalDowntime, breakdowns: e._ai.reliability.breakdownCount,
      })),
    },
    {
      key: "costs",
      title: "Maintenance & Repair Costs",
      description: "Total maintenance + repair cost per equipment.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Total Cost (₦)", key: "cost", numFmt: "#,##0" },
      ],
      rows: () => equipment.map((e) => ({ equipment: e.name, category: e.category, cost: e._ai.reliability.totalCost })),
    },
    {
      key: "risk",
      title: "AI Equipment Risk Report",
      description: "AI risk score, level, and failure probability per equipment.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Assigned Engineer", key: "engineer" },
        { header: "AI Risk Score", key: "score", numFmt: "0" },
        { header: "AI Risk Level", key: "level" },
        { header: "Failure Probability (90d)", key: "p90", numFmt: "0" },
        { header: "AI Recommendation", key: "recommendation", wrap: true },
      ],
      rows: () => equipment.map((e) => ({
        equipment: e.name, category: e.category, engineer: e.assignedEngineer,
        score: e._ai.risk.score, level: e._ai.risk.level, p90: e._ai.failureProb.p90,
        recommendation: e._ai.recommendations[0] || "No action recommended at this time.",
      })),
    },
    {
      key: "replacement",
      title: "Equipment Replacement Priority",
      description: "AI-assisted replacement priority per equipment.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Replacement Priority", key: "priority" },
        { header: "AI Reasoning", key: "reasons", wrap: true },
      ],
      rows: () => equipment.map((e) => ({
        equipment: e.name, category: e.category, priority: e._ai.replacement.priority,
        reasons: e._ai.replacement.reasons.join("; ") || "No replacement concerns identified.",
      })),
    },
    {
      key: "engineer",
      title: "Engineer Performance",
      description: "Maintenance and repair records completed per assigned engineer.",
      columns: [
        { header: "Engineer", key: "engineer" },
        { header: "Records Completed", key: "count", numFmt: "0" },
      ],
      rows: () => {
        const byEngineer = {};
        equipment.forEach((e) => {
          [...e.maintenanceRecords, ...e.repairRecords].forEach((r) => {
            const name = r.engineer || "Unassigned";
            byEngineer[name] = (byEngineer[name] || 0) + 1;
          });
        });
        return Object.entries(byEngineer).map(([engineer, count]) => ({ engineer, count }));
      },
    },
    {
      key: "compliance",
      title: "Preventive Maintenance Compliance",
      description: "PM overdue vs. on-time, by equipment.",
      columns: [
        { header: "Equipment", key: "equipment" },
        { header: "Category", key: "category" },
        { header: "Next Maintenance Due", key: "due" },
        { header: "Maintenance Status", key: "status" },
      ],
      rows: () => equipment.map((e) => ({
        equipment: e.name, category: e.category, due: fmtDate(e.nextMaintenanceDate),
        status: new Date(e.nextMaintenanceDate) < new Date() ? "Overdue" : "On Time",
      })),
    },
    {
      key: "audit",
      title: "System Audit Trail",
      description: "Full log of who changed what, and when, across this session.",
      columns: [
        { header: "Timestamp", key: "timestamp" },
        { header: "Actor (Role)", key: "actor" },
        { header: "Action", key: "action" },
        { header: "Target", key: "target" },
        { header: "Details", key: "details", wrap: true },
      ],
      rows: () => auditLog.map((a) => ({
        timestamp: fmtDate(a.timestamp), actor: a.actor, action: a.action, target: a.target, details: a.details,
      })),
    },
  ];
}

/** The flagship multi-sheet workbook: everything a hospital biomedical
 * engineering department would want in one professionally formatted file —
 * timestamps, categories, maintenance status, assigned engineers, fault
 * history, and AI risk scores, across the whole fleet. */
function buildComprehensiveWorkbook({ equipment, tickets, auditLog }) {
  const generatedAt = new Date().toLocaleString("en-GB");
  return {
    filename: `medtrack-comprehensive-fleet-report-${today()}.xlsx`,
    sheets: [
      {
        name: "Equipment Overview",
        title: "Comprehensive Fleet Report — Equipment Overview",
        subtitle: `Generated ${generatedAt} · ${equipment.length} assets tracked`,
        columns: [
          { header: "Asset Tag", key: "assetTag" },
          { header: "Equipment Name", key: "name", wrap: true },
          { header: "Category", key: "category" },
          { header: "Department", key: "department" },
          { header: "Status", key: "status" },
          { header: "Condition", key: "condition" },
          { header: "Assigned Engineer", key: "assignedEngineer" },
          { header: "Next Maintenance", key: "nextMaintenance" },
          { header: "Maintenance Status", key: "maintenanceStatus" },
          { header: "AI Risk Score", key: "riskScore", numFmt: "0" },
          { header: "AI Risk Level", key: "riskLevel" },
          { header: "Failure Probability (90d)", key: "p90", numFmt: "0" },
          { header: "Open Fault Reports", key: "openFaults", numFmt: "0" },
        ],
        rows: equipment.map((e) => ({
          assetTag: e.assetTag, name: e.name, category: e.category, department: e.department,
          status: e.status, condition: e.condition, assignedEngineer: e.assignedEngineer,
          nextMaintenance: fmtDate(e.nextMaintenanceDate),
          maintenanceStatus: new Date(e.nextMaintenanceDate) < new Date() ? "Overdue" : "On Time",
          riskScore: e._ai.risk.score, riskLevel: e._ai.risk.level, p90: e._ai.failureProb.p90,
          openFaults: tickets.filter((t) => t.equipmentId === e.id && !["Completed", "Closed"].includes(t.status)).length,
        })),
      },
      {
        name: "Maintenance Log",
        title: "Comprehensive Fleet Report — Maintenance Log",
        subtitle: `Generated ${generatedAt}`,
        columns: [
          { header: "Timestamp", key: "date" },
          { header: "Equipment", key: "equipment" },
          { header: "Category", key: "category" },
          { header: "Type", key: "type" },
          { header: "Maintenance Note", key: "note", wrap: true },
          { header: "Assigned Engineer", key: "engineer" },
          { header: "Cost (₦)", key: "cost", numFmt: "#,##0" },
        ],
        rows: equipment.flatMap((e) => e.maintenanceRecords.map((r) => ({
          date: fmtDate(r.date), equipment: e.name, category: e.category, type: r.type,
          note: r.note, engineer: r.engineer, cost: r.cost,
        }))),
      },
      {
        name: "Fault History",
        title: "Comprehensive Fleet Report — Fault & Repair History",
        subtitle: `Generated ${generatedAt}`,
        columns: [
          { header: "Timestamp", key: "date" },
          { header: "Equipment", key: "equipment" },
          { header: "Category", key: "category" },
          { header: "Fault Description", key: "fault", wrap: true },
          { header: "Error Code", key: "errorCode" },
          { header: "Corrective Action", key: "action", wrap: true },
          { header: "Downtime (hrs)", key: "downtime", numFmt: "0.0" },
          { header: "Status", key: "status" },
          { header: "Assigned Engineer", key: "engineer" },
        ],
        rows: equipment.flatMap((e) => e.repairRecords.map((r) => ({
          date: fmtDate(r.date), equipment: e.name, category: e.category, fault: r.faultDescription,
          errorCode: r.errorCode, action: r.correctiveAction, downtime: r.downtimeHours,
          status: r.finalStatus, engineer: r.engineer,
        }))),
      },
      {
        name: "AI Risk Analysis",
        title: "Comprehensive Fleet Report — AI Risk Analysis",
        subtitle: `Generated ${generatedAt} · Decision-support estimates, not guaranteed outcomes`,
        columns: [
          { header: "Equipment", key: "equipment" },
          { header: "Category", key: "category" },
          { header: "AI Risk Score", key: "score", numFmt: "0" },
          { header: "AI Risk Level", key: "level" },
          { header: "Failure Probability (90d)", key: "p90", numFmt: "0" },
          { header: "Predicted Failure Window", key: "window" },
          { header: "AI Recommendation", key: "recommendation", wrap: true },
        ],
        rows: equipment.map((e) => ({
          equipment: e.name, category: e.category, score: e._ai.risk.score, level: e._ai.risk.level,
          p90: e._ai.failureProb.p90,
          window: e._ai.window.start ? `${fmtDate(e._ai.window.start)} – ${fmtDate(e._ai.window.end)}` : "Insufficient data",
          recommendation: e._ai.recommendations[0] || "No action recommended at this time.",
        })),
      },
    ],
  };
}

export default function ReportsScreen() {
  const { equipment, tickets, auditLog } = useData();
  const [busyKey, setBusyKey] = useState(null);

  const reports = buildReports({ equipment, tickets, auditLog });

  async function runExcel(report) {
    setBusyKey(report.key);
    try {
      await exportXLSX({
        filename: `medtrack-${report.key}-${today()}.xlsx`,
        sheets: [{
          name: report.title,
          title: report.title,
          subtitle: `Generated ${new Date().toLocaleString("en-GB")}`,
          columns: report.columns,
          rows: report.rows(),
        }],
      });
    } finally {
      setBusyKey(null);
    }
  }

  function runCSV(report) {
    exportCSV({
      filename: `medtrack-${report.key}-${today()}.csv`,
      title: report.title,
      columns: report.columns,
      rows: report.rows(),
    });
  }

  async function runComprehensive() {
    setBusyKey("comprehensive");
    try {
      await exportXLSX(buildComprehensiveWorkbook({ equipment, tickets, auditLog }));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display flex items-center gap-2">
            <BarChart3 size={20} color="#2F7DE1" /> Reports &amp; analytics
          </h1>
          <p className="text-sm text-muted mt-1">Generate and export professionally formatted reports across the fleet.</p>
        </div>
        <button
          onClick={runComprehensive}
          disabled={busyKey === "comprehensive"}
          className="flex items-center gap-2 rounded-lg bg-navy text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busyKey === "comprehensive" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Comprehensive Fleet Report (.xlsx)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="rounded-xl border border-border bg-surface p-4 shadow-card flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">{r.title}</h3>
              <p className="text-xs text-muted mt-1">{r.description}</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <button onClick={() => runCSV(r)} className="flex items-center gap-1.5 rounded-lg border border-border text-[11px] font-semibold px-2.5 py-1.5 text-ink hover:bg-accent-soft transition-colors">
                <FileText size={12} /> CSV
              </button>
              <button
                onClick={() => runExcel(r)}
                disabled={busyKey === r.key}
                className="flex items-center gap-1.5 rounded-lg bg-accent text-white text-[11px] font-semibold px-2.5 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busyKey === r.key ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-card">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-ink">Recent activity (audit trail)</h3>
          <p className="text-xs text-muted mt-0.5">{auditLog.length} action{auditLog.length === 1 ? "" : "s"} recorded this session</p>
        </div>
        <div className="divide-y divide-divider max-h-72 overflow-y-auto">
          {auditLog.slice(0, 20).map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="text-ink font-medium">{a.action}</span>
                <span className="text-muted"> — {a.details}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted">{a.actor}</div>
                <div className="text-[10px] text-faint font-mono">{fmtDate(a.timestamp)}</div>
              </div>
            </div>
          ))}
          {auditLog.length === 0 && <div className="text-sm text-muted text-center py-6">No actions recorded yet this session.</div>}
        </div>
      </div>
    </div>
  );
}
