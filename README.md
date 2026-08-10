# MedTrack — Phase 1 (v3)

Smart Biomedical Equipment Maintenance & Predictive Failure Management System.
Full Phase 1 frontend: all 13 nav sections from the brief, mobile-responsive
navigation, mock data, client-side rule-based AI risk/prediction engine.

## Stack

React 19 · Vite 8 · Tailwind v4 (via `@tailwindcss/vite`, no config file —
tokens live in `src/index.css` under `@theme`) · no router (screen-state
navigation via `AppContext`, matching the brief's "migrate to match the
export" direction) · recharts · lucide-react.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. You'll land on a login screen — pick any role
from the dropdown and hit "Sign in" (credentials aren't validated, this is
still Phase 1). Use the role dropdown in the top bar afterward to preview
what each of the five roles sees.

**Try the mobile nav fix**: open dev tools, switch to a phone viewport
(e.g. iPhone 12), and reload. You'll get a bottom tab bar (Dashboard /
Equipment / Fault Reports / AI Predictions) plus a "More" sheet for
everything else, instead of the old squeezed sidebar.

## What changed since the last build

- **Migrated stack**: Tailwind v3 config → Tailwind v4 `@theme` tokens;
  React 18 → 19; react-router-dom → screen-state navigation
  (`src/context/AppContext.jsx`). Kept lucide-react/recharts pinned to
  versions verified to work with this React/build combo rather than
  blindly matching every version in your Figma export — flagging that
  as a deliberate deviation.
- **Fixed mobile navigation** (the actual original complaint): the sidebar
  now hides below the `md` breakpoint (`src/components/Sidebar.jsx`) and
  is replaced by a bottom tab bar + "More" overflow sheet
  (`src/components/MobileNav.jsx`). Grids, tables, and padding across
  every screen were also made responsive.
- **Expanded scope to match the Figma export's full nav**: Maintenance,
  Calibration, Warranty, Reports & Analytics, Notifications, Users & Roles,
  Settings, Login, and Spare Parts (re-added — you'd asked to cut it
  earlier, then asked for it back when expanding to match the export).
- **Kept the blue/white visual theme** rather than the Figma export's dark
  navy — per your explicit choice.

## Project structure

```
src/
  data/            equipmentCatalog, equipment (AI-enriched), roles,
                   faultTickets, spareParts, users
  lib/             riskEngine (risk score/failure probability/predicted
                   window/priority/MTTR-MTBF/recommendations), alerts, dates
  context/
    AppContext.jsx    screen navigation (replaces react-router), login state
    RoleContext.jsx    current role + permission checks
    DataContext.jsx    equipment/tickets/spare-parts/users state + mutations
  components/      Layout, Sidebar (desktop), MobileNav (bottom bar + More
                   sheet), Topbar, navConfig, Badges, RiskGauge, QRCode, StatCard
  screens/         Login, Dashboard, Equipment, EquipmentProfile (8 tabs),
                   Maintenance, FaultReport, AI, QRScanner, SpareParts,
                   Calibration, Warranty, Reports, Notifications, Users, Settings
```

## Phase A — Data layer foundation (this round)

Implements the corrections doc's foundational architecture ahead of onboarding,
CRUD forms, and the big subsystems (AI chat, CMMS scheduler, multi-hospital).

- **`src/services/`** — one file per entity (`equipmentService`,
  `maintenanceService`, `faultService`, `sparePartsService`, `userService`,
  `settingsService`, `auditService`), each reading/writing through
  `services/storage.js` (a namespaced localStorage wrapper). Swapping in
  Supabase later means changing these files' internals only — no screen
  should ever need to change.
- **`src/context/AppDataContext.jsx`** — replaces the old hardcoded
  `DataContext`. Boots from localStorage, exposes `dataMode` ("empty" |
  "demo"), and provides every CRUD action screens use, each persisting
  through the relevant service and logging to the audit trail.
- **`src/data/demoData.js`** — the demo fleet, tickets, spare parts, users,
  and default settings, clearly labeled and only loaded when you explicitly
  choose to load it.
- **A brand-new install now starts completely empty**, not pre-loaded with
  demo data — matching the doc's first acceptance criterion. Every screen
  that would otherwise show a blank/broken view now has an empty state with
  a "Load demo data" way back in.
- **Data management** is live under Settings: Load Demo Data, Reset Demo
  Data, Start Empty Hospital, Export Local Data (JSON), and Clear All Local
  Data — the destructive ones behind a confirmation dialog
  (`components/ConfirmDialog.jsx`).
- **Reusable app-state primitives**: `EmptyState`, `LoadingState`,
  `ErrorState`, `ConfirmDialog`, `Toast` — used across Dashboard, Equipment,
  AI Predictions, Maintenance, Calibration, and Warranty for now; the rest
  get the full treatment as those screens are rebuilt in Phase B.
- **Audit log persists** across reloads (it didn't before).

### Deliberately deferred to Phase B (per the doc's own ordering)

- The 5-step onboarding wizard (Settings currently has a stripped-down,
  functional-but-unstyled data management panel standing in for it)
- Polished, tailored empty-state copy/illustrations per screen (current
  ones are functional but plain)
- Full Equipment CRUD form (add/edit/archive with validation)
- CSV/PDF import with preview and duplicate detection
- The rest of Settings (hospital profile, categories, maintenance/risk/
  notification preferences with real editing)
- The AI chat assistant, CMMS scheduler/work-orders, and multi-hospital
  RBAC — each its own phase, tackled in the order the doc lists them



- **Dashboard charts trimmed**: removed Equipment by Category, Equipment
  Health Distribution, Monthly Maintenance Activities, and Breakdown
  Frequency by Category — kept Equipment by Department, Failure Trends,
  Downtime, and Maintenance Costs, which carry more explanatory weight
  per equipment.
- **QR Scanner now actually scans**: QR codes are real, scannable codes
  (via the `qrcode` library) rather than a stylized placeholder, and
  `/qr-scanner` requests camera access and decodes live video frames with
  `jsQR` (`src/screens/QRScannerScreen.jsx`). Falls back to the manual
  picker if the camera is unavailable or permission is denied.
- **Fixed mobile notification/role dropdown clipping**: both panels in
  `Topbar.jsx` now render as a full-width bottom sheet below the `sm`
  breakpoint instead of an absolutely-positioned dropdown that could get
  clipped off the left edge of a narrow screen.
- **AI Predictions screen rebuilt** to match your Figma reference: a
  featured "hero" risk card (gauge, 4 key metrics, recommended actions),
  contributing risk factors with weighted progress bars, a risk trend line
  chart, a risk-factor radar chart, and a full equipment risk summary table.
- **Notifications screen rebuilt** to match your Figma reference: category
  filter chips, severity-coded left-border cards, read/unread state. Grouped
  by urgency rather than calendar date, since these are computed live from
  current equipment/ticket/spare-part state rather than timestamped
  historical events — flagging that as a deliberate, honesty-preserving
  adaptation rather than fabricating dates.
- **Users & Roles screen rebuilt** to match your Figma reference: role
  count cards, search + role filtering, a table with avatars/status/last
  login, and — improving on the reference — a permissions matrix generated
  live from the real `PERMISSIONS` map in `data/roles.js` instead of being
  hardcoded.
- **Audit Report added** to Reports & Analytics, backed by a real
  session-scoped audit log (`DataContext.auditLog`) that records every
  mutation (maintenance logged, repairs recorded, tickets updated, spare
  parts changed, users added/disabled, etc.) with actor/action/target/time.
  Exportable as CSV, plus a live preview panel on the Reports screen.


## Phase C — Conversational AI Prediction Assistant (this round)

The AI Predictions page now has a chat assistant ("Ask AI Assistant" floating
button, bottom-right) layered on top of the existing risk scores, charts,
and summary table — nothing from before was removed.

- **`lib/assistantEngine.js`** — pure, synchronous rule-based NLU: detects
  intent (risk/why-risk, failure probability, predicted window, maintenance,
  calibration, warranty, fault history, recommendations, replacement,
  condition, "which equipment needs attention") and which equipment the
  question is about (named directly, or falls back to whichever equipment
  is currently featured on the page). Every answer is generated from the
  same `_ai` data (risk engine, reliability stats, recommendations) already
  computed elsewhere in the app — nothing new is invented.
- **`services/aiAssistantService.js`** — the seam for a future Supabase
  Edge Function. `ask()` currently wraps the rule engine in a short
  artificial delay (so the loading indicator is genuinely exercised) and
  resolves/rejects a Promise. Swapping in a real hosted LLM later means
  changing this one file's internals — the chat UI never needs to change.
  Conversation history persists via `services/storage.js` like everything
  else.
- **`components/AIChatPanel.jsx`** — the chat UI itself: message bubbles,
  a typing indicator while "thinking," an error state with retry (not just
  simulated — a real thrown error from the rule engine surfaces here),
  suggested prompts that update based on whichever equipment is featured,
  and a clear-conversation action.
- Suggested prompts and "why is this rated X risk" explanations are the
  two things the doc called out explicitly — both draw on the exact same
  `risk.explanation` bullets already shown in the Contributing Risk Factors
  card, just phrased conversationally.

## Phase B — Onboarding, CRUD, import/export, full Settings (this round)

- **Bug fix (found via an actual render test, not a guess)**: the AI Predictions
  screen could crash to a blank page after a reload. Root cause: derived `_ai`
  data (including `Date` objects in the predicted failure window) was being
  persisted to localStorage; `JSON.stringify` silently turns `Date` objects
  into strings, and nothing converted them back, so `Intl.DateTimeFormat`
  threw on the stale string. Fixed by never persisting `_ai` — it's now
  always recomputed fresh from raw fields on every read
  (`services/equipmentService.js`). Also added `components/ErrorBoundary.jsx`
  app-wide so any future render error shows a recoverable message instead of
  a blank screen.
- **Onboarding wizard** (`screens/OnboardingWizard.jsx`) — 6 steps (Welcome,
  Hospital, Departments, Categories, Team, Finish) with a progress indicator,
  "Skip setup for now" at every step, and a "Finish & load demo data" shortcut.
  Gated in `App.jsx` on `settings.onboardingComplete`.
- **Full Equipment CRUD**: `screens/EquipmentFormScreen.jsx` (5-step Add/Edit
  form with validation via `lib/validation.js`), Edit/Archive/Delete actions
  on the Equipment Profile header (each behind `ConfirmDialog` where
  destructive), and matching empty-state actions on the Equipment screen.
- **CSV import** (`screens/ImportEquipmentScreen.jsx`): downloadable template,
  upload, parse, per-row validation, duplicate detection (asset tag/serial
  number), preview table, and confirm-to-import. The "PDF template" is
  honestly labeled as a fill-by-hand reference form, not something the app
  parses back in — real PDF/OCR parsing needs a backend service.
- **Settings is now fully functional**, not a stand-in: Hospital Profile,
  Departments & Locations, Categories, Maintenance defaults (including the
  checklist used when logging maintenance anywhere in the app), Risk & AI
  thresholds, Notifications, and Data Management, all as real tabs.
- **Risk thresholds and notification toggles are functionally wired**, not
  decorative: changing Risk & AI thresholds in Settings immediately re-scores
  every equipment record everywhere in the app (`lib/riskEngine.js` and
  `equipmentService.js` now thread `settings.risk.thresholds` through);
  turning off a notification category in Settings actually filters it out of
  the Notifications page and bell badge (`lib/alerts.js`).
- **Verified by actually rendering the app**, not just a successful build:
  used jsdom + React's `act()` to log in, click through onboarding, load demo
  data, and navigate every screen (switching to System Administrator to
  reach Reports/Users/Settings) — zero thrown exceptions.

## Phase D — CMMS Maintenance Scheduler & Work Order Management (this round)

Maintenance went from a single "log a preventive visit" action to a real
work-order-driven CMMS.

- **7 maintenance types** (Preventive, Corrective, Calibration, Inspection,
  Safety Testing, Software Update, Emergency Repair) — `lib/workOrderEngine.js`.
- **Work orders** are now their own entity (`services/workOrderService.js`,
  localStorage-backed): equipment, type, title, priority (AI-suggested from
  the equipment's existing risk/priority data, editable), assigned engineer,
  scheduled/due dates, recurrence, checklist, notes, status.
- **"Schedule maintenance"** is reachable from three places, as required:
  Equipment Inventory (row action), Equipment Profile (Maintenance tab), and
  the Maintenance page itself — all through one reusable
  `components/ScheduleMaintenanceDialog.jsx`.
- **Recurring schedules**: weekly/monthly/quarterly/biannual/annual/custom.
  Completing a recurring work order automatically schedules the next
  occurrence with the correct next date — verified directly (not just via
  the UI): completing a quarterly work order correctly created the next one
  dated exactly 3 months out.
- **Completing** a work order logs the right kind of record on the equipment
  (a maintenance record for routine types, a repair record for
  Corrective/Emergency Repair) — reusing the exact same data the AI risk
  engine already reads, so completed work immediately affects future risk
  scores.
- **Maintenance Calendar** (`MaintenanceScreen.jsx` → Calendar tab): Month
  grid, Week and Day agenda views, color-coded by status, with a
  status legend.
- **Engineer Task Dashboard**: work orders grouped per engineer with
  overdue/upcoming/completed counts.
- **Maintenance History**: searchable, exportable log of completed work
  orders.
- **AI integration**: an "AI-flagged" panel on the Upcoming tab surfaces
  high/critical-risk equipment that has no open work order yet, one tap
  from being scheduled — using `equipmentNeedingScheduling()` against the
  same risk engine used everywhere else in the app.
- **Verified by directly exercising the completion + recurrence logic**
  (not just clicking through the UI): confirmed a quarterly work order,
  once completed, both wrote the maintenance record to the equipment *and*
  created the next occurrence at the mathematically correct date.




- No real backend/database yet — everything persists to this browser's
  localStorage (survives reloads) via the `services/` layer, but there's no
  server, no multi-device sync, and no real user accounts.
- No real authentication — login is a cosmetic gate; role dropdown is a
  UI preview only.
- Camera QR scanning works, but decoded codes are only matched against this
  session's in-memory equipment list — there's no live backend lookup yet.
- File uploads add mock entries only.
- PDF/Excel export buttons are stubs (CSV export is real, via in-browser
  Blob download) — real PDF/Excel rendering needs a backend service.
- "AI-predicted parts to stock up" on the Spare Parts screen is a simple,
  explainable cross-reference (low stock + compatible with high-risk
  equipment categories), not a trained model.
- The AI screen's "Risk Score Trend" chart is a deterministic, seeded
  synthetic trajectory (no historical score snapshots are stored) —
  labeled illustrative in the UI, not a claim about measured history.

- The AI chat assistant is rule-based pattern matching, not a real LLM —
  it won't handle phrasing outside its recognized intents gracefully
  beyond a generic fallback summary. That's the explicit frontend-stage
  scope; a real model connects later via `aiAssistantService.ask()`.

## Known Phase 1 limitations

- No real backend/database yet — everything persists to this browser's
  localStorage (survives reloads) via the `services/` layer, but there's no
  server, no multi-device sync, and no real user accounts.
- No real authentication — login is a cosmetic gate; role dropdown is a
  UI preview only.
- Camera QR scanning works, but decoded codes are only matched against this
  session's in-memory equipment list — there's no live backend lookup yet.
- File uploads add mock entries only.
- PDF/Excel export buttons are stubs (CSV export is real, via in-browser
  Blob download) — real PDF/Excel rendering needs a backend service. PDF
  *import* is honestly labeled as a fill-by-hand reference form, not
  something the app can parse back in.
- "AI-predicted parts to stock up" on the Spare Parts screen is a simple,
  explainable cross-reference (low stock + compatible with high-risk
  equipment categories), not a trained model.
- The AI screen's "Risk Score Trend" chart is a deterministic, seeded
  synthetic trajectory (no historical score snapshots are stored) —
  labeled illustrative in the UI, not a claim about measured history.
- The AI chat assistant is rule-based pattern matching, not a real LLM —
  it won't handle phrasing outside its recognized intents gracefully
  beyond a generic fallback summary. That's the explicit frontend-stage
  scope; a real model connects later via `aiAssistantService.ask()`.
- The Maintenance Calendar's Month view shows up to 2 work orders per day
  inline plus a "+N more" count rather than a full popover list — a
  reasonable density tradeoff for now, not a data limitation.
