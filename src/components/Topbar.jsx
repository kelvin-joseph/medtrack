import { useState } from "react";
import { Bell, ChevronDown, AlertTriangle, Info, LogOut, Activity } from "lucide-react";
import { useApp, SCREENS } from "../context/AppContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { useData } from "../context/AppDataContext.jsx";
import { computeAlerts } from "../lib/alerts.js";

export default function Topbar() {
  const { navigate } = useApp();
  const { profile, role, signOut } = useRole();
  const { equipment } = useData();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const alerts = computeAlerts(equipment).slice(0, 8);
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <header className="h-14 shrink-0 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 md:hidden">
        <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <Activity size={14} color="#FFFFFF" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-ink font-display">MedTrack</span>
      </div>
      <div className="hidden md:block text-sm text-muted">
        Smart Biomedical Equipment Maintenance &amp; Predictive Failure Management
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative">
          <button
            onClick={() => setShowNotifs((s) => !s)}
            className="relative h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent-soft transition-colors"
          >
            <Bell size={16} color="#5B7591" />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#D9364B] text-white text-[9px] flex items-center justify-center font-mono">
                {criticalCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <>
              <div className="sm:hidden fixed inset-0 bg-[#0F3058]/40 z-30" onClick={() => setShowNotifs(false)} />
              <div
                className="fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[70vh]
                           sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:rounded-xl sm:max-h-96
                           overflow-y-auto border border-border bg-surface shadow-tag z-40"
              >
                <div className="px-4 py-3 border-b border-divider text-sm font-semibold text-ink flex items-center justify-between sticky top-0 bg-surface">
                  Notifications
                  <button
                    onClick={() => { setShowNotifs(false); navigate(SCREENS.NOTIFICATIONS); }}
                    className="text-[11px] text-accent font-medium"
                  >
                    View all
                  </button>
                </div>
                {alerts.length === 0 && <div className="px-4 py-6 text-xs text-muted text-center">No active alerts.</div>}
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-divider last:border-0">
                    {a.severity === "critical" ? (
                      <AlertTriangle size={13} color="#D9364B" className="mt-0.5 shrink-0" />
                    ) : (
                      <Info size={13} color="#93A9C0" className="mt-0.5 shrink-0" />
                    )}
                    <div className="text-xs text-ink leading-snug">{a.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowAccount((s) => !s)}
            className="flex items-center gap-1.5 md:gap-2 rounded-lg border border-border px-2.5 md:px-3 py-2 text-xs text-ink hover:bg-accent-soft transition-colors"
          >
            <span className="font-medium max-w-[90px] sm:max-w-none truncate">{profile?.name || "Account"}</span>
            <ChevronDown size={13} color="#5B7591" />
          </button>
          {showAccount && (
            <>
              <div className="sm:hidden fixed inset-0 bg-[#0F3058]/40 z-30" onClick={() => setShowAccount(false)} />
              <div
                className="fixed inset-x-0 bottom-0 rounded-t-2xl
                           sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-xl
                           border border-border bg-surface shadow-tag z-40 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-divider">
                  <div className="text-sm font-medium text-ink truncate">{profile?.name}</div>
                  <div className="text-[11px] text-muted truncate">{profile?.email}</div>
                  <div className="text-[10px] uppercase tracking-wide font-mono text-accent mt-1">{role}</div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#D9364B] hover:bg-accent-soft transition-colors flex items-center gap-1.5"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
