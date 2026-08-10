export const DAY = 1000 * 60 * 60 * 24;
// Was pinned to a fixed demo date ("2026-07-25") so the prototype dataset
// read consistently regardless of when someone viewed it. Now that real
// equipment data and real notifications are live, that pin has to go — a
// notification system can't tell someone "overdue by 3 days" using a date
// that's actually 3 weeks in the past. Real current time, computed once
// per module load (a page refresh or a fresh Edge Function invocation),
// which is fresh enough for day-granularity maintenance/calibration/
// warranty windows.
export const NOW = new Date();

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / DAY);
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
