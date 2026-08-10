import { useState } from "react";
import {
  Bell, CheckCheck, Wrench, Brain, AlertTriangle, Shield, CalendarClock,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { computeNotifications } from "../lib/alerts.js";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "maintenance-overdue", label: "Maintenance Overdue" },
  { value: "maintenance-due", label: "Maintenance Due" },
  { value: "ai-prediction", label: "AI Predictions" },
  { value: "fault-report", label: "Fault Reports" },
  { value: "warranty-expiry", label: "Warranty Expiry" },
  { value: "calibration-due", label: "Calibration Due" },
];

const TYPE_ICON = {
  "maintenance-overdue": Wrench,
  "maintenance-due": Wrench,
  "ai-prediction": Brain,
  "fault-report": AlertTriangle,
  "warranty-expiry": Shield,
  "calibration-due": CalendarClock,
};
const TYPE_COLOR = {
  "maintenance-overdue": "#D9364B",
  "maintenance-due": "#D89A1F",
  "ai-prediction": "#7C5FE0",
  "fault-report": "#E07A2F",
  "warranty-expiry": "#2F7DE1",
  "calibration-due": "#1F9D6B",
};
const SEVERITY_BORDER = { critical: "#D9364B", high: "#E07A2F", medium: "#D89A1F", low: "#93A9C0" };
const SEVERITY_PILL = {
  critical: { color: "#D9364B", bg: "#D9364B1A" },
  high: { color: "#E07A2F", bg: "#E07A2F1A" },
  medium: { color: "#D89A1F", bg: "#D89A1F1A" },
  low: { color: "#5B7591", bg: "#5B75911A" },
};

// Urgency groups instead of calendar-date groups: these notifications are
// derived live from current equipment/ticket state rather than
// timestamped historical events, so grouping by "when it happened" would
// be fabricated. Grouping by urgency stays honest while still organizing
// the feed the way the date-groups in the reference design intended to.
const URGENCY_GROUPS = [
  { key: "critical", label: "Needs Attention Now" },
  { key: "high", label: "High Priority" },
  { key: "medium", label: "Upcoming" },
  { key: "low", label: "Informational" },
];

export default function NotificationsScreen() {
  const { equipment, tickets, settings, readNotificationIds, markNotificationRead, markAllNotificationsRead } = useData();
  const { openEquipment } = useApp();
  const [filter, setFilter] = useState("all");

  const all = computeNotifications(equipment, tickets, settings);
  const unreadCount = all.filter((n) => !readNotificationIds.has(n.id)).length;
  const filtered = filter === "all" ? all : all.filter((n) => n.type === filter);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink font-display flex items-center gap-2">
            <Bell size={20} color="#2F7DE1" /> Notifications
          </h1>
          <p className="text-sm text-muted mt-1">{unreadCount} unread of {all.length} total</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsRead(all.map((n) => n.id))}
            className="flex items-center gap-1.5 rounded-lg border border-border text-xs font-semibold px-3 py-2 text-ink hover:bg-accent-soft transition-colors"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filter === c.value ? "bg-accent text-white border-accent" : "bg-surface text-muted border-border hover:border-accent/50"
            }`}
          >
            {c.label}
            {c.value === "all" && unreadCount > 0 && (
              <span className="ml-1.5 bg-[#D9364B] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {URGENCY_GROUPS.map((group) => {
        const items = filtered.filter((n) => n.severity === group.key);
        if (items.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{group.label}</div>
            <div className="rounded-xl border border-border bg-surface shadow-card divide-y divide-divider overflow-hidden">
              {items.map((n) => {
                const isRead = readNotificationIds.has(n.id);
                const Icon = TYPE_ICON[n.type] || Bell;
                const pill = SEVERITY_PILL[n.severity];
                return (
                  <div
                    key={n.id}
                    onClick={() => { markNotificationRead(n.id); if (n.equipmentId) openEquipment(n.equipmentId); }}
                    className="flex items-start gap-3 px-4 sm:px-5 py-4 cursor-pointer hover:bg-accent-soft transition-colors"
                    style={{ borderLeft: `3px solid ${SEVERITY_BORDER[n.severity]}`, backgroundColor: isRead ? "transparent" : "#F8FBFE" }}
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: TYPE_COLOR[n.type] + "17" }}>
                      <Icon size={14} color={TYPE_COLOR[n.type]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm ${isRead ? "text-muted font-medium" : "text-ink font-semibold"}`}>
                          {n.title}
                          {!isRead && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 leading-snug ${isRead ? "text-muted" : "text-ink/80"}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ color: pill.color, backgroundColor: pill.bg }}>
                          {n.severity}
                        </span>
                        {n.equipmentId && <span className="text-xs text-accent font-medium">View Equipment →</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-faint">
          <Bell size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No notifications in this category.</p>
        </div>
      )}
    </div>
  );
}
