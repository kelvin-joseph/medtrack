import { AlertTriangle } from "lucide-react";

export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center rounded-xl border border-[#D9364B]/30 bg-[#D9364B0D]">
      <AlertTriangle size={22} color="#D9364B" />
      <p className="text-sm text-[#D9364B] max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-accent hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
