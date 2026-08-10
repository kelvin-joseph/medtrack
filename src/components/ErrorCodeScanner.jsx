import { useMemo, useState } from "react";
import { Search, ScanLine, AlertTriangle } from "lucide-react";
import { ERROR_CODE_CATEGORIES, errorCodesByCategory } from "../lib/errorCodes.js";

export default function ErrorCodeScanner() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  const results = useMemo(() => {
    const base = errorCodesByCategory(category);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((e) =>
      e.code.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || e.meaning.toLowerCase().includes(q)
    );
  }, [query, category]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 rounded-xl border border-border bg-surface shadow-card flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-divider">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
            <ScanLine size={15} color="#2F7DE1" /> Error Code Scanner
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter an error/alarm code or symptom…"
              className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {ERROR_CODE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                  category === c ? "bg-accent text-white border-accent" : "bg-surface text-muted border-border hover:border-accent/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-divider max-h-[520px]">
          {results.map((e) => (
            <button
              key={e.code}
              onClick={() => setSelected(e)}
              className={`w-full text-left px-4 py-3 hover:bg-accent-soft transition-colors ${selected?.code === e.code ? "bg-accent-soft" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-accent">{e.code}</span>
                <span className="text-[10px] text-faint uppercase tracking-wide">{e.category}</span>
              </div>
              <div className="text-sm font-medium text-ink mt-0.5">{e.title}</div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="text-sm text-muted text-center py-10 px-4">
              No matching codes in the reference database. Try a broader keyword, or ask the AI Assistant to help reason through the symptom.
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3 rounded-xl border border-border bg-surface shadow-card p-5">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <ScanLine size={32} className="text-faint mb-3" />
            <p className="text-sm text-muted">Select a code from the list to see the full diagnostic reference.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-white bg-navy rounded px-2 py-1">{selected.code}</span>
                <span className="text-[11px] text-muted uppercase tracking-wide">{selected.category}</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mt-2">{selected.title}</h3>
              <p className="text-sm text-muted mt-1">{selected.meaning}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2">Likely Causes</h4>
              <ul className="flex flex-col gap-1.5">
                {selected.likelyCauses.map((c, i) => (
                  <li key={i} className="text-sm text-ink/85 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2">Troubleshooting Steps</h4>
              <ol className="flex flex-col gap-1.5">
                {selected.steps.map((s, i) => (
                  <li key={i} className="text-sm text-ink/85 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent-soft text-accent text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-[#D9364B0D] border border-[#D9364B]/30 px-3.5 py-3">
              <AlertTriangle size={15} color="#D9364B" className="shrink-0 mt-0.5" />
              <p className="text-xs text-[#D9364B] leading-relaxed">{selected.safety}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
