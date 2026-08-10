export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-ink">
        {label} {required && <span className="text-[#D9364B]">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-faint">{hint}</span>}
      {error && <span className="text-[11px] text-[#D9364B]">{error}</span>}
    </div>
  );
}

const baseInputClass = "text-sm border rounded-lg px-3 py-2 outline-none w-full disabled:bg-[#F3F8FD] disabled:text-muted";

export function TextInput({ error, className = "", ...props }) {
  return (
    <input
      className={`${baseInputClass} ${error ? "border-[#D9364B]" : "border-border"} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ error, className = "", ...props }) {
  return (
    <textarea
      className={`${baseInputClass} ${error ? "border-[#D9364B]" : "border-border"} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select
      className={`${baseInputClass} ${error ? "border-[#D9364B]" : "border-border"} bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
