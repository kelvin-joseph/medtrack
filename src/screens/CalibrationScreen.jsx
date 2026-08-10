import { CalendarCheck, FileCheck } from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { NOW, daysBetween, fmtDate } from "../lib/dates.js";
import EmptyState from "../components/EmptyState.jsx";

function calStatus(eq) {
  const d = daysBetween(eq.nextCalibrationDate, NOW);
  if (d > 0) return { label: "Overdue", color: "#D9364B" };
  if (d >= -30) return { label: "Due Soon", color: "#D89A1F" };
  return { label: "Up to Date", color: "#1F9D6B" };
}

export default function CalibrationScreen() {
  const { equipment, loadDemoData } = useData();
  const { openEquipment } = useApp();

  if (equipment.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={CalendarCheck}
          title="No calibration records yet"
          description="Calibration due dates are tracked per equipment record. Add equipment or load the demo fleet to see this screen populated."
          action={
            <button onClick={loadDemoData} className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
              Load demo data
            </button>
          }
        />
      </div>
    );
  }

  const sorted = [...equipment].sort((a, b) => new Date(a.nextCalibrationDate) - new Date(b.nextCalibrationDate));

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-ink font-display flex items-center gap-2">
          <CalendarCheck size={20} color="#2F7DE1" /> Calibration management
        </h1>
        <p className="text-sm text-muted mt-1">Tracking calibration status across all equipment.</p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
              <th className="text-left px-4 py-3 font-medium">Equipment</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Last Calibration</th>
              <th className="text-left px-4 py-3 font-medium">Next Calibration</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((eq, i) => {
              const status = calStatus(eq);
              return (
                <tr
                  key={eq.id}
                  onClick={() => openEquipment(eq.id)}
                  className="cursor-pointer hover:bg-accent-soft transition-colors bg-surface"
                  style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}
                >
                  <td className="px-4 py-3">
                    <div className="text-ink">{eq.name}</div>
                    <div className="text-[11px] font-mono text-muted">{eq.assetTag}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{eq.department}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{fmtDate(eq.lastCalibrationDate)}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{fmtDate(eq.nextCalibrationDate)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold"
                      style={{ color: status.color, backgroundColor: status.color + "17" }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <FileCheck size={12} /> {eq.vendor}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
