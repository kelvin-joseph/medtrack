import { useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { KNOWLEDGE_BASE_TOPICS, knowledgeBaseByTopic } from "../lib/knowledgeBase.js";

export default function KnowledgeBaseBrowser() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [openId, setOpenId] = useState(null);

  const articles = useMemo(() => {
    const base = knowledgeBaseByTopic(topic);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) =>
      a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.content.some((l) => l.toLowerCase().includes(q))
    );
  }, [query, topic]);

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card">
      <div className="px-5 pt-4 pb-3 border-b border-divider">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
          <BookOpen size={15} color="#2F7DE1" /> Biomedical Engineering Knowledge Base
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calibration, electrical safety, PM procedures…"
            className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {KNOWLEDGE_BASE_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                topic === t ? "bg-accent text-white border-accent" : "bg-surface text-muted border-border hover:border-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-divider">
        {articles.map((a) => {
          const isOpen = openId === a.id;
          return (
            <div key={a.id}>
              <button
                onClick={() => setOpenId(isOpen ? null : a.id)}
                className="w-full text-left px-5 py-3.5 hover:bg-accent-soft transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="text-xs text-muted mt-0.5">{a.summary}</div>
                  </div>
                  <span className="text-[10px] text-accent font-semibold uppercase tracking-wide shrink-0">{a.topic}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-4">
                  <ul className="flex flex-col gap-1.5 bg-accent-soft rounded-lg p-3.5">
                    {a.content.map((line, i) => (
                      <li key={i} className="text-sm text-ink/85 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {articles.length === 0 && (
          <div className="text-sm text-muted text-center py-10 px-4">No articles match that search.</div>
        )}
      </div>
    </div>
  );
}
