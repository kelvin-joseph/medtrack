import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileClock,
  Gauge,
  Mail,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wrench,
  X,
} from "lucide-react";

const features = [
  {
    icon: Stethoscope,
    title: "Equipment Management",
    text: "Track medical equipment with its identity, location, condition, history, and maintenance information.",
    details:
      "Every asset carries its full record — manufacturer, model, serial number, install date, warranty, vendor, and complete repair history, all searchable and filterable by department, category, or status.",
  },
  {
    icon: CalendarClock,
    title: "Maintenance Management",
    text: "Schedule, assign, and follow preventive and corrective maintenance from one place.",
    details:
      "Preventive schedules, calibration due dates, and open work orders live together, so nothing gets tracked in a separate spreadsheet or forgotten between shifts.",
  },
  {
    icon: ClipboardList,
    title: "Fault Reporting",
    text: "Capture equipment faults quickly and move them through assignment, diagnosis, repair, and closure.",
    details:
      "The moment a fault is reported, the right engineer gets an email — no waiting for someone to check a dashboard. Staff can also scan a QR code on the equipment to report a fault in seconds.",
  },
  {
    icon: BrainCircuit,
    title: "AI & Predictive Insights",
    text: "Use equipment data and risk signals to identify attention areas before they become bigger problems.",
    details:
      "Risk scores are calculated from real factors — age, usage, breakdown history, overdue maintenance — and every score comes with a plain-language explanation, not just a number.",
  },
  {
    icon: Mail,
    title: "Notifications",
    text: "Biomedical engineers and department heads get told what matters, automatically.",
    details:
      "New faults trigger an immediate email to the right engineer. Everyone else gets a daily digest of what needs attention — routed by role, so nobody's inbox fills with things that aren't theirs.",
  },
  {
    icon: FileClock,
    title: "Audit Trail & Roles",
    text: "Every action is logged. Every person only sees what their role needs.",
    details:
      "A permanent, append-only audit log records who did what and when. Access is scoped by role — Biomedical Engineers, Department Heads, Nurses, and Administrators each see exactly what their job requires.",
  },
];

const equipment = [
  {
    name: "Ventilator ICU-04",
    category: "Ventilator",
    health: 84,
    status: "Attention",
    color: "amber",
  },
  {
    name: "Patient Monitor WARD-12",
    category: "Patient Monitor",
    health: 92,
    status: "Good",
    color: "green",
  },
  {
    name: "Infusion Pump WARD-08",
    category: "Infusion Pump",
    health: 76,
    status: "Risk",
    color: "amber",
  },
  {
    name: "Defibrillator ER-02",
    category: "Defibrillator",
    health: 95,
    status: "Good",
    color: "green",
  },
];

function MiniDashboard() {
  return (
    <div
      className="landing-dashboard-wrap"
      aria-label="Medtrack dashboard preview"
    >
      <div className="landing-dashboard-glow" />
      <div className="landing-dashboard">
        <div className="landing-dashboard-sidebar">
          <div className="landing-mini-brand">
            <Activity size={15} /> Medtrack
          </div>
          {[
            [Gauge, "Dashboard", true],
            [Stethoscope, "Equipment"],
            [Wrench, "Maintenance"],
            [ClipboardList, "Work Orders"],
            [Activity, "Faults"],
            [BrainCircuit, "AI Insights"],
          ].map(([Icon, label, active]) => (
            <div
              key={label}
              className={`landing-mini-nav ${active ? "active" : ""}`}
            >
              <Icon size={13} /> <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="landing-dashboard-main">
          <div className="landing-dashboard-top">
            <div>
              <span className="landing-eyebrow">BIOMEDICAL ENGINEERING</span>
              <h3>Dashboard</h3>
            </div>
            <div className="landing-user-chip">
              <span /> Biomedical Engineer
            </div>
          </div>

          <div className="landing-stat-grid">
            <div className="landing-stat">
              <span>Total Equipment</span>
              <strong>256</strong>
              <small>All departments</small>
            </div>
            <div className="landing-stat">
              <span>Operational</span>
              <strong className="good">198</strong>
              <small>77%</small>
            </div>
            <div className="landing-stat">
              <span>Requires Attention</span>
              <strong className="warning">34</strong>
              <small>13%</small>
            </div>
            <div className="landing-stat">
              <span>Out of Service</span>
              <strong className="danger">24</strong>
              <small>10%</small>
            </div>
          </div>

          <div className="landing-dashboard-grid">
            <div className="landing-panel">
              <div className="landing-panel-head">
                <span>Equipment Health Overview</span>
                <span>Today</span>
              </div>
              <div className="landing-health-row">
                <div className="landing-ring">
                  <span>77%</span>
                </div>
                <div className="landing-legend">
                  <div>
                    <i className="dot good-dot" /> Good <b>77%</b>
                  </div>
                  <div>
                    <i className="dot warning-dot" /> Fair <b>13%</b>
                  </div>
                  <div>
                    <i className="dot danger-dot" /> Poor <b>10%</b>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-panel">
              <div className="landing-panel-head">
                <span>AI Prediction Alerts</span>
                <BrainCircuit size={14} />
              </div>
              <div className="landing-alert">
                <span className="alert-count danger-bg">5</span>
                <div>
                  <b>High risk of failure</b>
                  <small>Needs immediate attention</small>
                </div>
              </div>
              <div className="landing-alert">
                <span className="alert-count good-bg">12</span>
                <div>
                  <b>Maintenance recommended</b>
                  <small>Within the next 30 days</small>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-panel landing-orders">
            <div className="landing-panel-head">
              <span>Recent Work Orders</span>
              <span className="linkish">
                View all <ArrowRight size={12} />
              </span>
            </div>
            {[
              [
                "WO-1024",
                "Ventilator ICU-04",
                "Preventive Maintenance",
                "In Progress",
              ],
              ["WO-1023", "Patient Monitor ER-01", "Calibration", "Pending"],
              ["WO-1022", "Infusion Pump WARD-12", "Repair", "Completed"],
            ].map((row) => (
              <div className="landing-order-row" key={row[0]}>
                <b>{row[0]}</b>
                <span>{row[1]}</span>
                <span>{row[2]}</span>
                <em className={row[3].toLowerCase().replace(" ", "-")}>
                  {row[3]}
                </em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onViewDemo, demoLoading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState(null);

  const go = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <button
            className="landing-brand"
            onClick={() => go("top")}
            aria-label="Medtrack home"
          >
            <span className="landing-brand-mark">
              <Activity size={20} strokeWidth={2.5} />
            </span>
            <span>MEDTRACK</span>
          </button>

          <nav className={`landing-nav ${menuOpen ? "open" : ""}`}>
            <button onClick={() => go("features")}>Product</button>
            <button onClick={() => go("features")}>Features</button>
            <button onClick={() => go("workflow")}>How It Works</button>
            <button onClick={() => go("roles")}>For Hospitals</button>
            <button onClick={() => go("ai")}>AI Intelligence</button>
          </nav>

          <div className="landing-header-actions">
            {onViewDemo && (
              <button
                className="landing-signin"
                onClick={onViewDemo}
                disabled={demoLoading}
              >
                {demoLoading ? "Loading demo…" : "View Demo"}
              </button>
            )}
            <button className="landing-signin" onClick={onGetStarted}>
              Sign in
            </button>
            <button className="landing-primary small" onClick={onGetStarted}>
              Get Started <ArrowRight size={15} />
            </button>
            <button
              className="landing-menu"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open navigation"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-pill">
                <span /> AI-POWERED BIOMEDICAL ENGINEERING
              </div>
              <h1>
                Smarter Equipment.
                <br />
                <span>Predictive Maintenance.</span>
                <br />
                Better Outcomes.
              </h1>
              <p>
                Medtrack helps biomedical engineering teams monitor medical
                equipment, manage maintenance, detect faults, and use AI to
                identify equipment risk before failures happen.
              </p>
              <div className="landing-hero-actions">
                <button className="landing-primary" onClick={onGetStarted}>
                  Explore Medtrack <ArrowRight size={17} />
                </button>
                <button
                  className="landing-secondary"
                  onClick={() => go("features")}
                >
                  Explore Features <ChevronRight size={17} />
                </button>
                {onViewDemo && (
                  <button
                    className="landing-secondary"
                    onClick={onViewDemo}
                    disabled={demoLoading}
                  >
                    {demoLoading ? "Loading demo…" : "View Demo"}
                  </button>
                )}
              </div>
              <div className="landing-trust-row">
                <div>
                  <Sparkles size={16} /> AI-powered insights
                </div>
                <div>
                  <CalendarClock size={16} /> Predictive maintenance
                </div>
                <div>
                  <Activity size={16} /> Equipment monitoring
                </div>
                <div>
                  <ShieldCheck size={16} /> Secure &amp; reliable
                </div>
              </div>
            </div>
            <div className="landing-hero-visual">
              <MiniDashboard />
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <span className="landing-eyebrow">
                  BUILT FOR BIOMEDICAL ENGINEERS
                </span>
                <h2>Everything you need to manage equipment better.</h2>
              </div>
              <p>
                One focused workspace for equipment, maintenance, faults, work
                orders, and intelligent risk insights.
              </p>
            </div>
            <div className="landing-feature-grid">
              {features.map(({ icon: Icon, title, text, details }) => {
                const isOpen = expandedFeature === title;
                return (
                  <article
                    className={`landing-feature-card ${isOpen ? "open" : ""}`}
                    key={title}
                  >
                    <div className="landing-feature-icon">
                      <Icon size={20} />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    {isOpen && (
                      <p className="landing-feature-detail">{details}</p>
                    )}
                    <button
                      type="button"
                      className="landing-card-link"
                      onClick={() => setExpandedFeature(isOpen ? null : title)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "Show less" : "Learn more"}
                      <ChevronDown
                        size={14}
                        className={`card-link-chevron ${isOpen ? "rotated" : ""}`}
                      />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section landing-soft" id="workflow">
          <div className="landing-container">
            <div className="landing-split">
              <div>
                <span className="landing-eyebrow">
                  FROM REACTIVE TO PREDICTIVE
                </span>
                <h2>
                  Prevent failures.
                  <br />
                  Save time. Save cost.
                </h2>
                <p>
                  Medtrack brings equipment information, maintenance activity,
                  and AI risk signals together so biomedical teams can act
                  before downtime becomes a bigger problem.
                </p>
              </div>
              <div className="landing-process">
                {[
                  ["Monitor", "Collect equipment data", Activity],
                  ["Analyze", "Understand performance", BrainCircuit],
                  ["Predict", "Identify equipment risk", Gauge],
                  ["Prevent", "Take action early", Wrench],
                ].map(([title, text, Icon], i) => (
                  <div className="landing-process-step" key={title}>
                    <div className="landing-process-icon">
                      <Icon size={19} />
                    </div>
                    <div>
                      <b>{title}</b>
                      <small>{text}</small>
                    </div>
                    {i < 3 && (
                      <ArrowRight className="process-arrow" size={17} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="ai">
          <div className="landing-container">
            <div className="landing-ai-card">
              <div className="landing-ai-copy">
                <span className="landing-eyebrow">MEDTRACK AI CENTER</span>
                <h2>AI that understands biomedical engineering.</h2>
                <p>
                  Ask questions about equipment condition, troubleshooting,
                  maintenance, fault history, and risk. The AI experience is
                  designed around biomedical engineering workflows—not a generic
                  chatbot.
                </p>
                <div className="landing-checks">
                  <span>
                    <CheckCircle2 size={16} /> Equipment-aware assistance
                  </span>
                  <span>
                    <CheckCircle2 size={16} /> Troubleshooting guidance
                  </span>
                  <span>
                    <CheckCircle2 size={16} /> Predictive risk insights
                  </span>
                </div>
              </div>
              <div className="landing-chat">
                <div className="landing-chat-head">
                  <div className="landing-ai-avatar">
                    <Bot size={17} />
                  </div>
                  <div>
                    <b>Medtrack AI</b>
                    <small>Biomedical Intelligence</small>
                  </div>
                  <span className="online-dot" />
                </div>
                <div className="landing-chat-message user">
                  How do I troubleshoot this infusion pump error?
                </div>
                <div className="landing-chat-message ai">
                  <div className="landing-ai-avatar tiny">
                    <Bot size={14} />
                  </div>
                  <p>
                    Start by checking the power supply and battery condition.
                    Next, inspect the tubing pathway and occlusion sensor.
                    Follow the manufacturer's service procedure if the error
                    persists.
                  </p>
                </div>
                <div className="landing-chat-suggestions">
                  <span>Check power supply</span>
                  <span>Review error code</span>
                  <span>Maintenance history</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-capabilities"
          id="under-the-hood"
        >
          <div className="landing-container">
            <div className="landing-section-heading centered">
              <span className="landing-eyebrow">UNDER THE HOOD</span>
              <h2>Built as real infrastructure, not a mockup.</h2>
              <p>
                Medtrack is currently in active development and pilot testing —
                here's exactly what's already running.
              </p>
            </div>
            <div className="landing-capability-grid">
              <div className="landing-capability">
                <ShieldCheck size={20} />
                <b>Role-based security</b>
                <small>
                  Every account is scoped to its role — engineers, department
                  heads, staff, and administrators each see only what their job
                  needs.
                </small>
              </div>
              <div className="landing-capability">
                <Mail size={20} />
                <b>Real email delivery</b>
                <small>
                  Fault reports trigger an immediate email to the right
                  engineer. Nothing waits for someone to happen to check a
                  screen.
                </small>
              </div>
              <div className="landing-capability">
                <BrainCircuit size={20} />
                <b>Explainable AI, not a black box</b>
                <small>
                  Risk scores are calculated from real equipment data — age,
                  usage, breakdown history — with a plain-language reason
                  attached to every number.
                </small>
              </div>
              <div className="landing-capability">
                <FileClock size={20} />
                <b>Permanent audit trail</b>
                <small>
                  Every action is logged and cannot be edited or deleted after
                  the fact — a real record for accountability, not a claim.
                </small>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-soft" id="equipment">
          <div className="landing-container">
            <div className="landing-section-heading compact">
              <div>
                <span className="landing-eyebrow">EQUIPMENT INTELLIGENCE</span>
                <h2>Know what needs attention.</h2>
              </div>
              <button className="landing-text-button" onClick={onGetStarted}>
                Open Medtrack <ArrowRight size={15} />
              </button>
            </div>
            <div className="landing-equipment-grid">
              {equipment.map((item) => (
                <article className="landing-equipment-card" key={item.name}>
                  <div className="landing-equipment-top">
                    <div className="landing-equipment-icon">
                      <Stethoscope size={19} />
                    </div>
                    <span className={`landing-status ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="landing-equipment-category">
                    {item.category}
                  </span>
                  <h3>{item.name}</h3>
                  <div className="landing-health-bar">
                    <span style={{ width: `${item.health}%` }} />
                  </div>
                  <div className="landing-equipment-meta">
                    <span>Health score</span>
                    <b>{item.health}%</b>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="roles">
          <div className="landing-container">
            <div className="landing-section-heading centered">
              <span className="landing-eyebrow">DESIGNED FOR EVERY ROLE</span>
              <h2>Built for your biomedical team.</h2>
              <p>
                Give each person the tools they need without exposing areas they
                don't need.
              </p>
            </div>
            <div className="landing-role-grid">
              <article>
                <div className="role-number">01</div>
                <h3>Biomedical Engineers</h3>
                <p>
                  Manage equipment, handle maintenance, resolve faults, work
                  orders, and AI-supported troubleshooting.
                </p>
              </article>
              <article>
                <div className="role-number">02</div>
                <h3>Head of Biomedical Engineering</h3>
                <p>
                  Oversee operations, monitor performance, review critical
                  alerts, and make data-driven decisions.
                </p>
              </article>
              <article>
                <div className="role-number">03</div>
                <h3>Nurses &amp; Department Staff</h3>
                <p>
                  Report equipment faults, scan QR codes, and track requests
                  without needing access to the engineering dashboard.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section landing-soft" id="qr">
          <div className="landing-container">
            <div className="landing-qr-card">
              <div>
                <span className="landing-eyebrow">QR EQUIPMENT TRACKING</span>
                <h2>Scan. Identify. Act.</h2>
                <p>
                  Scan an equipment QR code to quickly access its details,
                  maintenance history, open faults, and relevant AI
                  recommendations.
                </p>
                <button className="landing-secondary" onClick={onGetStarted}>
                  Explore Medtrack <ArrowRight size={16} />
                </button>
              </div>
              <div className="landing-qr-flow">
                <div className="landing-qr-box">
                  <QrCode size={96} />
                </div>
                <ArrowRight className="qr-arrow" />
                <div className="landing-qr-result">
                  <div className="landing-qr-result-head">
                    <b>Ventilator ICU-04</b>
                    <span>Operational</span>
                  </div>
                  <div className="qr-detail">
                    <span>Health score</span>
                    <b>84%</b>
                  </div>
                  <div className="qr-detail">
                    <span>Last maintenance</span>
                    <b>2 days ago</b>
                  </div>
                  <div className="qr-detail">
                    <span>Open faults</span>
                    <b>1</b>
                  </div>
                  <div className="qr-ai">
                    <BrainCircuit size={15} />
                    <span>AI recommendation available</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-container landing-cta-inner">
            <div>
              <span className="landing-eyebrow">READY WHEN YOU ARE</span>
              <h2>Build a smarter biomedical engineering operation.</h2>
              <p>
                Turn equipment information into clearer maintenance decisions.
              </p>
            </div>
            <div className="landing-cta-actions">
              <button className="landing-primary" onClick={onGetStarted}>
                Get Started <ArrowRight size={17} />
              </button>
              <button
                className="landing-secondary"
                onClick={() => go("features")}
              >
                Explore Features <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <div className="landing-brand footer-brand">
              <span className="landing-brand-mark">
                <Activity size={19} />
              </span>
              <span>MEDTRACK</span>
            </div>
            <p>
              AI-powered biomedical engineering platform for modern hospitals.
            </p>
          </div>
          <div>
            <b>Product</b>
            <button onClick={() => go("features")}>Features</button>
            <button onClick={() => go("ai")}>AI Intelligence</button>
            <button onClick={() => go("workflow")}>How It Works</button>
          </div>
          <div>
            <b>For Hospitals</b>
            <button onClick={() => go("roles")}>Roles</button>
            <button onClick={onGetStarted}>Get Started</button>
            <button onClick={onGetStarted}>Sign in</button>
          </div>
          <div>
            <b>Platform</b>
            <span>Equipment</span>
            <span>Maintenance</span>
            <span>Fault Management</span>
            <span>Predictive Insights</span>
          </div>
        </div>
        <div className="landing-container landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} Medtrack. All rights reserved.
          </span>
          <span>Biomedical engineering intelligence.</span>
        </div>
      </footer>
    </div>
  );
}
