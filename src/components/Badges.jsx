function Pill({ label, color, bg, border }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide font-mono uppercase whitespace-nowrap"
      style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function RiskBadge({ level, color }) {
  return <Pill label={level} color={color} bg={color + "17"} border={color + "45"} />;
}

const STATUS_COLORS = {
  Operational: "#1F9D6B",
  "Under Maintenance": "#D89A1F",
  "Under Repair": "#E07A2F",
  "Out of Service": "#D9364B",
  Decommissioned: "#93A9C0",
};
export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#5B7591";
  return <Pill label={status} color={color} bg={color + "17"} border={color + "45"} />;
}

const CONDITION_COLORS = {
  Excellent: "#1F9D6B", Good: "#5FB88B", Fair: "#D89A1F", Poor: "#E07A2F", Critical: "#D9364B",
};
export function ConditionBadge({ condition }) {
  const color = CONDITION_COLORS[condition] || "#5B7591";
  return <Pill label={condition} color={color} bg={color + "17"} border={color + "45"} />;
}

const PRIORITY_COLORS = {
  Emergency: "#B91C3C", Critical: "#D9364B", High: "#E07A2F", Medium: "#D89A1F", Low: "#1F9D6B",
};
export function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || "#5B7591";
  return <Pill label={priority} color={color} bg={color + "17"} border={color + "45"} />;
}

const TICKET_COLORS = {
  New: "#2F7DE1", Assigned: "#7C5FE0", "In Progress": "#D89A1F",
  "Awaiting Spare Parts": "#E07A2F", "Awaiting Vendor": "#E07A2F",
  Completed: "#1F9D6B", Closed: "#93A9C0",
};
export function TicketStatusBadge({ status }) {
  const color = TICKET_COLORS[status] || "#5B7591";
  return <Pill label={status} color={color} bg={color + "17"} border={color + "45"} />;
}

const CRITICALITY_COLORS = { Critical: "#D9364B", High: "#E07A2F", Moderate: "#D89A1F", Low: "#1F9D6B" };
export function CriticalityBadge({ criticality }) {
  const color = CRITICALITY_COLORS[criticality] || "#5B7591";
  return <Pill label={criticality} color={color} bg={color + "17"} border={color + "45"} />;
}
