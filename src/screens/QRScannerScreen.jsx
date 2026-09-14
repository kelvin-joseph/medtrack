import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  QrCode, Search, ArrowLeft, AlertTriangle, Wrench, History, FileText,
  ShieldCheck, BookOpen, Camera, CameraOff, X, Loader2, Download,
} from "lucide-react";
import { useData } from "../context/AppDataContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { CATEGORY_ICON } from "../data/equipment.js";
import { RiskBadge, StatusBadge } from "../components/Badges.jsx";
import { fmtDate } from "../lib/dates.js";
import * as equipmentDocumentsService from "../services/equipmentDocumentsService.js";

// Real camera scanning: requests the device camera, decodes QR codes from
// the live video feed with jsQR, and matches the decoded asset reference
// against the equipment list. Falls back to a manual picker if the camera
// is unavailable or permission is denied — e.g. a desktop with no webcam.
export default function QRScannerScreen() {
  const { equipment } = useData();
  const { qrTargetId, consumeQrTarget } = useApp();
  const [scannedId, setScannedId] = useState(null);
  const [mode, setMode] = useState("choice"); // choice | camera | picker
  const [query, setQuery] = useState("");
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (qrTargetId) {
      setScannedId(qrTargetId);
      consumeQrTarget();
    }
  }, [qrTargetId, consumeQrTarget]);

  const scanned = scannedId ? equipment.find((e) => e.id === scannedId) : null;

  function resolveDecodedValue(text) {
    // Accept either our JSON payload ({type, assetTag}) or a bare asset tag string.
    let assetTag = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.assetTag) assetTag = parsed.assetTag;
    } catch {
      // not JSON — treat the raw text as the asset tag
    }
    const match = equipment.find((e) => e.assetTag === assetTag || e.id === assetTag);
    if (match) {
      setScannedId(match.id);
      setMode("choice");
    }
    return match;
  }

  if (scanned) {
    return <ScannedTag eq={scanned} onBack={() => { setScannedId(null); setMode("choice"); }} />;
  }

  if (mode === "camera") {
    return (
      <CameraScanner
        onDecode={resolveDecodedValue}
        onCancel={() => setMode("choice")}
        onError={(msg) => { setCameraError(msg); setMode("picker"); }}
      />
    );
  }

  if (mode === "picker") {
    const filtered = equipment.filter((e) =>
      (e.name + e.assetTag).toLowerCase().includes(query.toLowerCase())
    );
    return (
      <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 max-w-lg">
        <button onClick={() => setMode("choice")} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        {cameraError && (
          <div className="rounded-lg bg-[#D9364B17] text-[#D9364B] text-xs px-3 py-2">{cameraError}</div>
        )}
        <div>
          <h1 className="text-lg font-semibold text-ink font-display">Select equipment</h1>
          <p className="text-sm text-muted mt-1">No camera available — pick the equipment whose tag you'd scan instead.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Search size={15} color="#5B7591" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment or asset tag…"
            className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((eq) => (
            <button
              key={eq.id}
              onClick={() => setScannedId(eq.id)}
              className="flex items-center justify-between rounded-lg border border-border hover:border-accent/50 hover:bg-accent-soft px-4 py-3 text-left transition-colors bg-surface"
            >
              <div>
                <div className="text-sm text-ink">{eq.name}</div>
                <div className="text-[11px] font-mono text-muted">{eq.assetTag} · {eq.department}</div>
              </div>
              <QrCode size={16} color="#93A9C0" />
            </button>
          ))}
          {filtered.length === 0 && <div className="text-sm text-muted text-center py-6">No equipment matches.</div>}
        </div>
      </div>
    );
  }

  // mode === "choice"
  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 max-w-lg items-center text-center">
      <QrCode size={40} color="#2F7DE1" />
      <div>
        <h1 className="text-xl font-semibold text-ink font-display">Scan QR</h1>
        <p className="text-sm text-muted mt-1">
          Point your camera at an equipment's QR asset tag to open its digital profile.
        </p>
      </div>
      <button
        onClick={() => { setCameraError(null); setMode("camera"); }}
        className="flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-semibold px-5 py-3 hover:opacity-90 transition-opacity w-full justify-center"
      >
        <Camera size={16} /> Start camera scan
      </button>
      <button
        onClick={() => setMode("picker")}
        className="text-xs text-muted hover:text-ink underline"
      >
        Or select equipment from a list instead
      </button>
    </div>
  );
}

function CameraScanner({ onDecode, onCancel, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("Requesting camera…");

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      const match = onDecode(code.data);
      if (match) return; // parent will unmount this component
      setStatus("QR code not recognized — try another equipment tag.");
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDecode]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus("Point the camera at a QR asset tag…");
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        onError("Camera unavailable or permission denied.");
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 max-w-lg mx-auto">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit transition-colors">
        <X size={15} /> Cancel
      </button>
      <div className="relative rounded-2xl overflow-hidden border border-border bg-navy aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 border-[3px] border-accent/70 m-8 rounded-2xl pointer-events-none" />
      </div>
      <p className="text-xs text-muted text-center flex items-center justify-center gap-1.5">
        <Camera size={13} /> {status}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
function ScannedTag({ eq, onBack }) {
  const { addTicket } = useData();
  const [panel, setPanel] = useState(null);
  const [reported, setReported] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [viewError, setViewError] = useState(null);

  const Icon = CATEGORY_ICON[eq.category] || Wrench;

  useEffect(() => {
    let cancelled = false;
    setDocsLoading(true);
    setDocsError(null);
    equipmentDocumentsService
      .list(eq.id)
      .then((rows) => {
        if (!cancelled) setDocuments(rows);
      })
      .catch((err) => {
        // Never let a document-load failure break the rest of the scanned
        // tag screen -- the manual/safety panels just show their own
        // error state instead.
        if (!cancelled) setDocsError(err.message || "Failed to load documents.");
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eq.id]);

  async function handleViewDoc(doc) {
    if (viewingId) return;
    setViewError(null);
    setViewingId(doc.id);
    try {
      const url = await equipmentDocumentsService.getSignedUrl(doc.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setViewError(err.message || "Failed to open document. Please try again.");
    } finally {
      setViewingId(null);
    }
  }

  function quickReport() {
    addTicket({
      equipmentId: eq.id, category: "Malfunction",
      description: "Quick fault report submitted via QR scan.",
      reportedBy: "Department Staff (QR scan)", department: eq.department,
    });
    setReported(true);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5 items-center">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit self-start transition-colors">
        <ArrowLeft size={15} /> Back to scan
      </button>

      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-tag overflow-hidden">
        <div className="bg-navy px-5 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center shrink-0">
            <Icon size={17} color="#FFFFFF" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate font-display">{eq.name}</div>
            <div className="text-[11px] font-mono text-faint">{eq.assetTag} · {eq.model}</div>
          </div>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b border-divider">
          <div><span className="text-faint">Serial Number</span><div className="text-ink">{eq.serialNumber}</div></div>
          <div><span className="text-faint">Location</span><div className="text-ink">{eq.location}</div></div>
          <div><span className="text-faint">Department</span><div className="text-ink">{eq.department}</div></div>
          <div><span className="text-faint">Status</span><div className="mt-0.5"><StatusBadge status={eq.status} /></div></div>
          <div><span className="text-faint">AI Risk Score</span><div className="mt-0.5"><RiskBadge level={eq._ai.risk.level} color={eq._ai.risk.color} /></div></div>
          <div><span className="text-faint">Failure Probability (90d)</span><div className="text-ink">{eq._ai.failureProb.p90}%</div></div>
          <div><span className="text-faint">Last Maintenance</span><div className="text-ink">{fmtDate(eq.lastMaintenanceDate)}</div></div>
          <div><span className="text-faint">Next Maintenance</span><div className="text-ink">{fmtDate(eq.nextMaintenanceDate)}</div></div>
          <div><span className="text-faint">Last Calibration</span><div className="text-ink">{fmtDate(eq.lastCalibrationDate)}</div></div>
          <div><span className="text-faint">Next Calibration</span><div className="text-ink">{fmtDate(eq.nextCalibrationDate)}</div></div>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-2">
          <QuickAction icon={AlertTriangle} label="Report Fault" onClick={quickReport} accent="#D9364B" />
          <QuickAction icon={Wrench} label="Request Maintenance" onClick={() => setPanel("maintenance-request")} accent="#2F7DE1" />
          <QuickAction icon={History} label="Maintenance History" onClick={() => setPanel("maintenance")} accent="#1F9D6B" />
          <QuickAction icon={FileText} label="Repair History" onClick={() => setPanel("repairs")} accent="#E07A2F" />
          <QuickAction icon={BookOpen} label="View Manual" onClick={() => setPanel("manual")} accent="#7C5FE0" />
          <QuickAction icon={ShieldCheck} label="Safety Instructions" onClick={() => setPanel("safety")} accent="#5B7591" />
        </div>

        {reported && (
          <div className="mx-5 mb-4 rounded-lg bg-[#1F9D6B17] text-[#1F9D6B] text-xs px-3 py-2">
            Fault report submitted — the biomedical engineering department has been notified.
          </div>
        )}

        {panel === "maintenance-request" && (
          <Panel title="Request maintenance">
            A maintenance request will be created for {eq.name} and routed to {eq.assignedEngineer || "Unassigned"}. (Notification delivery arrives with the backend.)
          </Panel>
        )}
        {panel === "maintenance" && (
          <Panel title="Maintenance history">
            {eq.maintenanceRecords.length === 0 ? "No records yet." : (
              <ul className="flex flex-col gap-1.5">
                {eq.maintenanceRecords.map((r) => <li key={r.id}>• {fmtDate(r.date)} — {r.note}</li>)}
              </ul>
            )}
          </Panel>
        )}
        {panel === "repairs" && (
          <Panel title="Repair history">
            {eq.repairRecords.length === 0 ? "No records yet." : (
              <ul className="flex flex-col gap-1.5">
                {eq.repairRecords.map((r) => <li key={r.id}>• {fmtDate(r.date)} — {r.faultDescription}</li>)}
              </ul>
            )}
          </Panel>
        )}
        {panel === "manual" && (
          <Panel title="User manual">
            <DocumentList
              documents={documents}
              docType="Manual"
              loading={docsLoading}
              loadError={docsError}
              emptyMessage="No manual uploaded yet."
              viewingId={viewingId}
              viewError={viewError}
              onView={handleViewDoc}
            />
          </Panel>
        )}
        {panel === "safety" && (
          <Panel title="Safety instructions">
            <DocumentList
              documents={documents}
              docType="Safety Instructions"
              loading={docsLoading}
              loadError={docsError}
              emptyMessage="No safety instructions uploaded yet."
              viewingId={viewingId}
              viewError={viewError}
              onView={handleViewDoc}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

/** Filters `documents` to the given type and renders them with a View
 * action reusing the existing signed-URL flow -- same pattern as the
 * Documents tab in EquipmentProfileScreen.jsx, no separate logic. */
function DocumentList({ documents, docType, loading, loadError, emptyMessage, viewingId, viewError, onView }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 size={13} className="animate-spin" /> Loading…
      </div>
    );
  }
  if (loadError) {
    return <div className="text-[#D9364B]">{loadError}</div>;
  }

  const matches = documents.filter((d) => d.type === docType);

  return (
    <div className="flex flex-col gap-2">
      {viewError && <div className="text-[#D9364B]">{viewError}</div>}
      {matches.length === 0 ? (
        emptyMessage
      ) : (
        matches.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{d.name}</span>
            <button
              onClick={() => onView(d)}
              disabled={viewingId === d.id}
              className="flex items-center gap-1 rounded-md border border-border text-[11px] font-semibold px-2 py-1 text-ink hover:bg-accent-soft transition-colors disabled:opacity-60 shrink-0"
            >
              {viewingId === d.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              View
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border hover:bg-accent-soft transition-colors py-3"
    >
      <Icon size={16} color={accent} />
      <span className="text-[11px] text-ink font-medium text-center leading-tight">{label}</span>
    </button>
  );
}

function Panel({ title, children }) {
  return (
    <div className="mx-5 mb-5 rounded-lg border border-border p-3">
      <div className="text-xs font-semibold text-ink mb-1.5">{title}</div>
      <div className="text-xs text-muted leading-relaxed">{children}</div>
    </div>
  );
}
