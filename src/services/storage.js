// Thin, namespaced localStorage wrapper. Every service in this folder reads
// and writes through here rather than touching `localStorage` directly, so
// swapping this file's internals for Supabase calls later doesn't require
// touching any service's public API.

const PREFIX = "medtrack:";

function keyFor(name) {
  return `${PREFIX}${name}`;
}

export function readValue(name, fallback) {
  try {
    const raw = window.localStorage.getItem(keyFor(name));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read "${name}" from local storage:`, err);
    return fallback;
  }
}

export function writeValue(name, value) {
  try {
    window.localStorage.setItem(keyFor(name), JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed to write "${name}" to local storage:`, err);
    return false;
  }
}

export function removeValue(name) {
  window.localStorage.removeItem(keyFor(name));
}

/** Wipes every medtrack: key — used by "Clear local test data". */
export function clearAllNamespacedData() {
  const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => window.localStorage.removeItem(k));
}

/** Dumps every medtrack: key as a plain object — used by "Export local data". */
export function exportAllNamespacedData() {
  const out = {};
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => {
      try {
        out[k.slice(PREFIX.length)] = JSON.parse(window.localStorage.getItem(k));
      } catch {
        // skip unparseable entries rather than fail the whole export
      }
    });
  return out;
}
