import { useState } from "react";
import { Activity, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useRole } from "../context/RoleContext.jsx";

export default function LoginScreen({ onBack }) {
  const { signIn, authError, setAuthError } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAuthError(null);
    await signIn(email.trim(), password);
    setSubmitting(false);
    // On success, RoleContext's onAuthStateChange listener picks up the new
    // session and App.jsx's Shell re-renders past this screen automatically.
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-tag p-7">
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-muted hover:text-ink mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
        )}
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Activity size={24} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-semibold text-ink font-display">
            MedTrack
          </h1>
          <p className="text-xs text-muted text-center mt-1">
            Smart Biomedical Equipment Maintenance &amp; Predictive Failure
            Management
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
            <Mail size={15} color="#93A9C0" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.example"
              className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
            <Lock size={15} color="#93A9C0" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
            />
          </div>

          {authError && (
            <div className="flex items-start gap-2 rounded-lg bg-[#D9364B0D] border border-[#D9364B]/30 px-3 py-2.5">
              <AlertCircle
                size={14}
                color="#D9364B"
                className="shrink-0 mt-0.5"
              />
              <p className="text-xs text-[#D9364B]">{authError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-[11px] text-faint text-center mt-4">
          Access is provisioned by your System Administrator. Contact them if
          you need an account.
        </p>
      </div>
    </div>
  );
}
