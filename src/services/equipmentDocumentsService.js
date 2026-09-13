import { supabase } from "./supabaseClient.js";

const TABLE = "equipment_documents";
const BUCKET = "equipment-documents";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — matches the bucket's own file_size_limit.
const MAX_FILE_SIZE_LABEL = "20MB";

// Kept intentionally small — covers the document types this app already
// expects (manuals, warranty/calibration certs, scans/photos of paperwork).
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const ALLOWED_FILE_TYPES_LABEL = "PDF, Word, Excel, JPG, or PNG";

// Same file types as ALLOWED_MIME_TYPES, expressed as extensions -- used as
// a fallback when the browser's reported MIME type isn't one we recognize.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx",
]);

function getExtension(fileName) {
  const match = /\.[^./\\]+$/.exec(String(fileName || ""));
  return match ? match[0].toLowerCase() : "";
}

export const DOCUMENT_TYPES = [
  "Manual",
  "Service Manual",
  "Warranty",
  "Calibration Certificate",
  "Other",
];

/** Returns a user-facing error string, or null if the file is acceptable. */
export function validateFile(file) {
  if (!file) return "No file selected.";
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" is too large. Maximum file size is ${MAX_FILE_SIZE_LABEL}.`;
  }
  // Trust an exact, known-good MIME type outright. Otherwise -- including
  // when the browser reports something generic/unreliable (e.g.
  // "application/octet-stream"), a non-standard variant (e.g. "image/jpg"
  // instead of "image/jpeg"), or no type at all -- fall back to the file
  // extension. MIME reporting varies enough across browsers/OSes that
  // requiring an exact match rejects real, valid files; the extension is
  // still checked against the same fixed allowlist, so an unsupported
  // file can't get through just because its MIME type happens to be
  // generic.
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return null;
  if (ALLOWED_EXTENSIONS.has(getExtension(file.name))) return null;
  return `Unsupported file type. Please upload a ${ALLOWED_FILE_TYPES_LABEL} file.`;
}

function sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** List real uploaded documents for one piece of equipment, newest first. */
export async function list(equipmentId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Uploads the file's actual bytes to Storage, then records its metadata in
 * equipment_documents. If the metadata insert fails after a successful
 * upload, the just-uploaded Storage object is removed so it isn't left
 * orphaned (unreachable via the DB, but still consuming storage).
 */
export async function upload(equipmentId, file, { documentType = "Other" } = {}) {
  const validationError = validateFile(file);
  if (validationError) throw new Error(validationError);

  // hospital_id always comes from the server-side RPC, never from the
  // client/caller -- same trust boundary as equipmentService.create().
  const { data: hospitalId, error: hospitalIdErr } = await supabase.rpc("get_user_hospital_id");
  if (hospitalIdErr) throw hospitalIdErr;
  if (!hospitalId) {
    throw new Error("Could not determine your hospital. Please sign in again and retry.");
  }

  // Collision-resistant path: timestamp + random suffix, original filename
  // preserved (sanitized) for readability -- the real filename users typed
  // still lives in equipment_documents.name for display.
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filePath = `${hospitalId}/${equipmentId}/${unique}-${sanitizeFileName(file.name)}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data: inserted, error: insertErr } = await supabase
    .from(TABLE)
    .insert({
      equipment_id: equipmentId,
      hospital_id: hospitalId,
      name: file.name,
      type: documentType,
      file_path: filePath,
    })
    .select()
    .single();

  if (insertErr) {
    const { error: cleanupErr } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (cleanupErr) {
      // Nothing more we can do client-side -- surface the original error to
      // the user; this is logged so an orphaned object can be found later.
      console.error(
        "[equipmentDocumentsService] Failed to clean up orphaned storage object after failed insert:",
        filePath,
        cleanupErr,
      );
    }
    throw insertErr;
  }

  return inserted;
}

/** Short-lived signed URL for viewing/downloading a private document. */
export async function getSignedUrl(filePath, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
