export default function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2 shadow-card min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-wider font-mono text-muted leading-tight">{label}</span>
        <Icon size={15} color={accent || "#5B7591"} className="shrink-0" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink font-display">{value}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
    </div>
  );
}
