import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-muted">
      <Loader2 size={22} className="animate-spin" color="#2F7DE1" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
