import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("MedTrack crashed while rendering:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="max-w-md w-full rounded-2xl border border-[#D9364B]/30 bg-surface shadow-tag p-6 text-center">
            <AlertTriangle size={28} color="#D9364B" className="mx-auto mb-3" />
            <h1 className="text-sm font-semibold text-ink">Something went wrong</h1>
            <p className="text-sm text-muted mt-2">
              This screen hit an unexpected error instead of loading. Reloading usually fixes it — if it keeps
              happening, this is worth reporting.
            </p>
            <p className="text-[11px] font-mono text-faint mt-3 break-words">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-accent text-white text-xs font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              Reload MedTrack
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
