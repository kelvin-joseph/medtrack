export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F3058]/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface shadow-tag p-5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="text-sm text-muted mt-2">{message}</p>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg text-white text-xs font-semibold px-4 py-2.5"
            style={{ backgroundColor: danger ? "#D9364B" : "#2F7DE1" }}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border text-xs font-semibold px-4 py-2.5 text-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
