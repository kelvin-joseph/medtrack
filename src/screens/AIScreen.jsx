import { useState } from "react";
import {
  Brain, TrendingUp, Clock, Target, Zap, Info, ArrowRight, Wrench,
  MessageCircle, ScanLine, BookOpen, LayoutGrid, AlertTriangle, ShieldAlert,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useApp } from "../context/AppContext.jsx";
import { useData } from "../context/AppDataContext.jsx";
import { RiskBadge } from "../components/Badges.jsx";
import EmptyState from "../components/EmptyState.jsx";
import AICommandChat from "../components/AICommandChat.jsx";
import ErrorCodeScanner from "../components/ErrorCodeScanner.jsx";
import KnowledgeBaseBrowser from "../components/KnowledgeBaseBrowser.jsx";
import { simpleHash } from "../lib/riskEngine.js";
import { generateProactiveInsights } from "../lib/assistantEngine.js";

const tooltipStyle = { background: "#FFFFFF", border: "1px solid #D7E4F2", borderRadius: 8, fontSize: 12 };
const fmtShort = (d) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d);

const TABS = [
  { key: "command", label: "Command Center", icon: LayoutGrid },
  { key: "analytics", label: "Equipment Analytics", icon: TrendingUp },
  { key: "assistant", label: "AI Assistant", icon: MessageCircle },
  { key: "scanner", label: "Error Code Scanner", icon: ScanLine },
  { key: "knowledge", label: "Knowledge Base", icon: BookOpen },
];

// A plausible 6-month risk trajectory leading up to today's actual score.
// We don't have historical score snapshots stored, so this is a
// deterministic (seeded by equipment id) synthetic trend for visualization —
// clearly a stand-in, not a claim about past measured scores.
function riskTrend(eq) {
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const current = eq._ai.risk.score;
  const seed = simpleHash(eq.id);
  return months.map((month, i) => {
    const back = months.length - 1 - i;
    const noise = ((seed >> (i * 3)) % 7) - 3;
    const score = Math.max(5, Math.min(97, current - back * 6 + noise));
    return { month: `${month} '26`, score: i === months.length - 1 ? current : score };
  });
}

function factorList(eq) {
  const b = eq._ai.risk.breakdown;
  const weight = (v, max) => (v / max >= 0.66 ? "High" : v / max >= 0.33 ? "Medium" : "Low");
  const color = { High: "#D9364B", Medium: "#D89A1F", Low: "#93A9C0" };
  const ageYears = eq._ai.risk.explanation[0];
  const recentBreakdowns = eq.repairRecords.filter((r) => new Date(r.date) > new Date(Date.now() - 365 * 86400000)).length;
  return [
    { label: `Equipment age (${ageYears})`, value: b.age, max: 20, weight: weight(b.age, 20), desc: `Weighted against a ${eq.expectedLifespanYears}-year expected useful life for this equipment class.` },
    { label: `Usage intensity (${eq.usageFrequency})`, value: b.usage, max: 15, weight: weight(b.usage, 15), desc: `${eq.operatingHoursPerWeek} operating hours/week.` },
    { label: "Breakdown history", value: b.breakdowns, max: 20, weight: weight(b.breakdowns, 20), desc: `${recentBreakdowns} breakdown(s) in the past 12 months.` },
    { label: "Preventive maintenance compliance", value: b.overdue, max: 15, weight: weight(b.overdue, 15), desc: b.overdue > 0 ? "Overdue PM is a leading predictor of failure." : "Currently on schedule." },
    { label: "Downtime history", value: b.downtime, max: 10, weight: weight(b.downtime, 10), desc: `${eq._ai.reliability.totalDowntime}h total downtime recorded.` },
    { label: "Repair frequency & cost trend", value: b.repairs, max: 10, weight: weight(b.repairs, 10), desc: `${eq.repairRecords.length} repair record(s) on file.` },
    { label: `Clinical criticality (${eq.clinicalCriticality})`, value: b.criticality, max: 10, weight: weight(b.criticality, 10), desc: "Higher-criticality equipment is weighted more heavily." },
  ].map((f) => ({ ...f, color: color[f.weight] }));
}

function radarData(eq) {
  const b = eq._ai.risk.breakdown;
  return [
    { factor: "Age", value: Math.round((b.age / 20) * 100) },
    { factor: "Usage", value: Math.round((b.usage / 15) * 100) },
    { factor: "Breakdowns", value: Math.round((b.breakdowns / 20) * 100) },
    { factor: "PM Overdue", value: Math.round((b.overdue / 15) * 100) },
    { factor: "Downtime", value: Math.round((b.downtime / 10) * 100) },
    { factor: "Repairs", value: Math.round((b.repairs / 10) * 100) },
  ];
}

function RiskGaugeMini({ score, color, size = 140 }) {
  const angle = (Math.min(score, 100) / 100) * 180;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const needleRad = ((180 - angle) * Math.PI) / 180;
  const nx = cx + (r - 12) * Math.cos(needleRad);
  const ny = cy - (r - 12) * Math.sin(needleRad);
  const arcPath = (s, e) => {
    const sr = ((180 - s) * Math.PI) / 180, er = ((180 - e) * Math.PI) / 180;
    return `M ${cx + r * Math.cos(sr)} ${cy - r * Math.sin(sr)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(er)} ${cy - r * Math.sin(er)}`;
  };
  return (
    <svg width={size} height={size / 2 + 20}>
      <path d={arcPath(0, 180)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" strokeLinecap="round" />
      <path d={arcPath(0, (score / 100) * 180)} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#FFFFFF" />
      <text x={cx} y={cy - 20} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="22" fontWeight="600" fill="#FFFFFF">{score}</text>
    </svg>
  );
}

const INSIGHT_COLOR = { critical: "#D9364B", warning: "#D89A1F", info: "#2F7DE1" };

function InsightsFeed({ insights, onOpenEquipment }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card p-6 text-center">
        <ShieldAlert size={26} className="mx-auto mb-2 text-[#1F9D6B]" />
        <p className="text-sm text-ink font-medium">No proactive alerts right now</p>
        <p className="text-xs text-muted mt-1">The fleet is within normal risk and maintenance tolerances.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card divide-y divide-divider overflow-hidden">
      {insights.map((ins) => (
        <button
          key={ins.id}
          onClick={() => onOpenEquipment(ins.equipmentId)}
          className="w-full text-left flex items-start gap-3 px-4 sm:px-5 py-3.5 hover:bg-accent-soft transition-colors"
          style={{ borderLeft: `3px solid ${INSIGHT_COLOR[ins.severity]}` }}
        >
          <AlertTriangle size={15} color={INSIGHT_COLOR[ins.severity]} className="shrink-0 mt-0.5" />
          <p className="text-sm text-ink/90 leading-relaxed">{ins.text}</p>
        </button>
      ))}
    </div>
  );
}

export default function AIScreen() {
  const { openEquipment } = useApp();
  const { equipment, loadDemoData } = useData();
  const [tab, setTab] = useState("command");
  const topRisk = [...equipment].sort((a, b) => b._ai.risk.score - a._ai.risk.score);
  const [featuredId, setFeaturedId] = useState(topRisk[0]?.id || null);

  if (equipment.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={Brain}
          title="No equipment to analyze yet"
          description="The Biomedical AI Center calculates risk, predictions, and insights per equipment record. Add equipment or load the demo fleet to see it in action."
          action={
            <button onClick={loadDemoData} className="rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity">
              Load demo data
            </button>
          }
        />
      </div>
    );
  }

  const featured = equipment.find((e) => e.id === featuredId) || topRisk[0];
  const factors = factorList(featured);
  const trend = riskTrend(featured);
  const radar = radarData(featured);
  const { risk, failureProb, window, recommendations } = featured._ai;
  const insights = generateProactiveInsights(equipment, 8);

  const avgRisk = Math.round(equipment.reduce((s, e) => s + e._ai.risk.score, 0) / equipment.length);
  const highRiskCount = equipment.filter((e) => e._ai.risk.score >= 61).length;
  const overdueCount = equipment.filter((e) => new Date(e.nextMaintenanceDate) < new Date()).length;

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
        {/* Command header */}
        <div className="rounded-2xl p-5 md:p-6 text-white" style={{ background: "linear-gradient(135deg, #0B2340, #123B67 55%, #1B4C82)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Brain size={16} color="#B9CFFF" />
            </div>
            <div>
              <div className="text-base font-semibold">Biomedical AI Center</div>
              <div className="text-[#9FBBDA] text-xs">Intelligence hub for the equipment fleet — analytics, prediction, and a biomedical engineering colleague on call</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-[#9FBBDA] text-[11px] mb-1">Fleet Avg. Risk</div>
              <div className="text-xl font-semibold font-mono">{avgRisk}/100</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-[#9FBBDA] text-[11px] mb-1">High/Critical Risk</div>
              <div className="text-xl font-semibold font-mono text-[#F97066]">{highRiskCount}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-[#9FBBDA] text-[11px] mb-1">PM Overdue</div>
              <div className="text-xl font-semibold font-mono text-[#F5B759]">{overdueCount}</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1.5 border-b border-divider pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key ? "bg-navy text-white" : "text-muted hover:bg-accent-soft"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "command" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">AI Observations &amp; Alerts</h3>
              <InsightsFeed insights={insights} onOpenEquipment={openEquipment} />
            </div>

            <div className="rounded-xl border border-border bg-surface shadow-card">
              <div className="px-5 pt-4 pb-1">
                <h3 className="text-sm font-semibold text-ink">All Equipment — AI Risk Summary</h3>
                <p className="text-xs text-muted mt-0.5">Sorted by risk score</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-[#F3F8FD] text-muted text-[11px] uppercase tracking-wide font-mono">
                      <th className="text-left px-4 py-3 font-medium">Equipment</th>
                      <th className="text-left px-4 py-3 font-medium">Dept</th>
                      <th className="text-left px-4 py-3 font-medium">Risk Score</th>
                      <th className="text-left px-4 py-3 font-medium">Risk Level</th>
                      <th className="text-left px-4 py-3 font-medium">Failure Prob. (90d)</th>
                      <th className="text-left px-4 py-3 font-medium">Predicted Window</th>
                      <th className="text-left px-4 py-3 font-medium">Confidence</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRisk.map((eq, i) => (
                      <tr key={eq.id} className="bg-surface" style={{ borderTop: i === 0 ? "none" : "1px solid #E5EEF7" }}>
                        <td className="px-4 py-3">
                          <div className="text-ink font-medium">{eq.name}</div>
                          <div className="text-[11px] font-mono text-muted">{eq.assetTag}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{eq.department}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 bg-accent-soft rounded-full w-16">
                              <div className="h-full rounded-full" style={{ width: `${eq._ai.risk.score}%`, backgroundColor: eq._ai.risk.color }} />
                            </div>
                            <span className="text-xs font-mono font-semibold text-ink">{eq._ai.risk.score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><RiskBadge level={eq._ai.risk.level} color={eq._ai.risk.color} /></td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{eq._ai.failureProb.p90}%</td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {eq._ai.window.start ? `${fmtShort(eq._ai.window.start)} – ${fmtShort(eq._ai.window.end)}` : "Insufficient data"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{eq._ai.window.confidencePercent ? `${eq._ai.window.confidencePercent}%` : eq._ai.failureProb.confidence}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEquipment(eq.id)} className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                            Profile <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-[#2F7DE1]/30 bg-accent-soft p-3.5 flex items-start gap-2.5 text-xs text-ink">
              <Info size={15} color="#2F7DE1" className="shrink-0 mt-0.5" />
              <div>
                <strong>AI Prediction Disclaimer:</strong> Risk scores, failure probabilities, and predicted failure windows
                are estimates based on historical maintenance data and usage patterns. These are decision-support tools
                only — not guaranteed predictions. Review with a qualified Biomedical Engineer before acting.
              </div>
            </div>

            <div className="rounded-2xl p-5 md:p-6 text-white" style={{ background: "linear-gradient(135deg, #123B67, #1B4C82)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <Brain size={15} color="#B9CFFF" />
                  </div>
                  <span className="text-[#B9CFFF] text-sm font-semibold">
                    AI Predictive Analysis — {risk.level} Risk
                  </span>
                </div>
                <select
                  value={featuredId}
                  onChange={(e) => setFeaturedId(e.target.value)}
                  className="text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white outline-none"
                >
                  {topRisk.map((e) => <option key={e.id} value={e.id} className="text-ink">{e.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="flex flex-col items-center justify-center">
                  <RiskGaugeMini score={risk.score} color={risk.color} />
                  <div className="mt-2 text-center">
                    <div className="text-white font-semibold">{featured.name}</div>
                    <div className="text-[#9FBBDA] text-xs font-mono">{featured.assetTag}</div>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    { icon: Target, label: "Failure Probability (90d)", value: `${failureProb.p90}%`, color: "#F97066" },
                    { icon: TrendingUp, label: "Risk Score", value: `${risk.score}/100`, color: "#F97066" },
                    { icon: Clock, label: "Predicted Failure Window", value: window.start ? `${fmtShort(window.start)} – ${fmtShort(window.end)}` : "Insufficient data", color: "#F5B759" },
                    { icon: Zap, label: "Confidence Level", value: window.confidencePercent ? `${window.confidencePercent}%` : failureProb.confidence, color: "#7FB2FF" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl p-3 bg-white/5">
                      <div className="flex items-center gap-1.5 text-[#9FBBDA] text-xs mb-1">
                        <m.icon size={13} /> <span>{m.label}</span>
                      </div>
                      <div className="font-semibold text-base" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-[#9FBBDA] uppercase tracking-wide mb-2">Recommended Actions</div>
                  <div className="flex flex-col gap-2">
                    {recommendations.slice(0, 4).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#DCE7F5]">
                        <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${i === 0 ? "bg-[#D9364B] text-white" : "bg-white/20 text-white"}`}>{i + 1}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => openEquipment(featured.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#D9364B] text-white text-xs font-semibold py-2 hover:opacity-90 transition-opacity"
                  >
                    <Wrench size={13} /> Open equipment profile
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border bg-surface shadow-card">
                <div className="px-5 pt-4">
                  <h3 className="text-sm font-semibold text-ink">Contributing Risk Factors</h3>
                  <p className="text-xs text-muted mt-0.5">{factors.length} factors contributing to {featured.name}'s risk score</p>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {factors.map((f) => (
                    <div key={f.label}>
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{f.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: f.color, backgroundColor: f.color + "1A" }}>{f.weight} weight</span>
                        </div>
                        <span className="text-sm font-mono font-semibold text-ink">{f.value}/{f.max}</span>
                      </div>
                      <div className="h-2 bg-accent-soft rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full" style={{ width: `${(f.value / f.max) * 100}%`, backgroundColor: f.color }} />
                      </div>
                      <p className="text-xs text-muted">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-surface shadow-card">
                  <div className="px-4 pt-4">
                    <h3 className="text-sm font-semibold text-ink">Risk Score Trend</h3>
                    <p className="text-xs text-muted mt-0.5">6-month trajectory (illustrative)</p>
                  </div>
                  <div className="p-3">
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#E5EEF7" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#93A9C0" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#93A9C0" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="score" stroke="#D9364B" strokeWidth={2.5} dot={{ r: 3, fill: "#D9364B" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface shadow-card">
                  <div className="px-4 pt-4">
                    <h3 className="text-sm font-semibold text-ink">Risk Factor Radar</h3>
                    <p className="text-xs text-muted mt-0.5">Multi-dimensional view</p>
                  </div>
                  <div className="p-2">
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={radar}>
                        <PolarGrid stroke="#D7E4F2" />
                        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9, fill: "#5B7591" }} />
                        <Radar name="Risk" dataKey="value" stroke="#D9364B" fill="#D9364B" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-faint">
              AI predictions are estimates intended to support engineering decisions — they are not guaranteed outcomes or medical advice.
            </p>
          </div>
        )}

        {tab === "assistant" && (
          <AICommandChat equipment={equipment} contextEquipment={featured} />
        )}

        {tab === "scanner" && <ErrorCodeScanner />}

        {tab === "knowledge" && <KnowledgeBaseBrowser />}
      </div>
    </>
  );
}
