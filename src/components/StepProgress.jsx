import { Check } from "lucide-react";

export default function StepProgress({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: done ? "#1F9D6B" : active ? "#2F7DE1" : "#EAF2FB",
                  color: done || active ? "#FFFFFF" : "#5B7591",
                }}
              >
                {done ? <Check size={13} /> : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${active ? "text-ink font-semibold" : "text-faint"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="h-px w-6 sm:w-10 bg-border shrink-0 mb-4" />}
          </div>
        );
      })}
    </div>
  );
}
