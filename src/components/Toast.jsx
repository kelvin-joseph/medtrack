import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isError = toast.type === "error";

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]">
      <div
        className="flex items-center gap-2.5 rounded-xl border shadow-tag px-4 py-3 bg-surface"
        style={{ borderColor: isError ? "#D9364B4D" : "#1F9D6B4D" }}
      >
        {isError ? <XCircle size={16} color="#D9364B" className="shrink-0" /> : <CheckCircle2 size={16} color="#1F9D6B" className="shrink-0" />}
        <span className="text-sm text-ink flex-1">{toast.message}</span>
        <button onClick={onDismiss} className="shrink-0 text-faint hover:text-ink"><X size={14} /></button>
      </div>
    </div>
  );
}
