export default function EmptyState({ icon: Icon, title, description, action, secondaryAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-xl border border-dashed border-border bg-surface">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center mb-4">
          <Icon size={22} color="#2F7DE1" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-muted mt-1.5 max-w-sm">{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
