import { useState } from "react";
import { Activity, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useRole } from "../context/RoleContext.jsx";

export default function SetPasswordScreen() {
  const { completePasswordSetup, profile } = useRole();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await completePasswordSetup(password);
    setSubmitting(false);
    if (err) setError(err.message || "Couldn't set password. Try the invite link again.");
    // On success, needsPasswordSetup flips to false and App.jsx moves on
    // to the normal signed-in flow automatically.
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-tag p-7">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Activity size={24} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-semibold text-ink font-display">Welcome to MedTrack</h1>
          <p className="text-xs text-muted text-center mt-1">
            {profile?.name ? `Hi ${profile.name} — set` : "Set"} a password for your account to get started.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
            <Lock size={15} color="#93A9C0" />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
            <Lock size={15} color="#93A9C0" />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="bg-transparent text-sm text-ink placeholder-faint outline-none flex-1"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-[#D9364B0D] border border-[#D9364B]/30 px-3 py-2.5">
              <AlertCircle size={14} color="#D9364B" className="shrink-0 mt-0.5" />
              <p className="text-xs text-[#D9364B]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitting ? "Saving…" : "Set password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
