import { supabase } from "./supabaseClient.js";

const TABLE = "repair_records";

// repair_records has every field as a plain column — same mapping style as
// workOrderService.js. `id` is DB-generated (gen_random_uuid()) and
// `hospital_id` is stamped server-side by the trg_set_hospital_id trigger
// (see set_hospital_id_from_user()), so neither is ever set from here.
function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    date: row.date,
    reportedBy: row.reported_by,
    faultDescription: row.fault_description,
    errorCode: row.error_code,
    suspectedCause: row.suspected_cause,
    diagnosis: row.diagnosis,
    correctiveAction: row.corrective_action,
    partsReplaced: row.parts_replaced,
    cost: row.cost,
    engineer: row.engineer,
    repairStart: row.repair_start,
    repairCompletion: row.repair_completion,
    downtimeHours: row.downtime_hours,
    finalStatus: row.final_status,
    createdAt: row.created_at,
    workOrderId: row.work_order_id,
  };
}

// cost and downtime_hours both have DB DEFAULT 0. If a blank value were
// simply omitted from the insert payload, Postgres would silently apply
// that default, making "left blank" indistinguishable from "entered 0".
// This normalizes blank (empty string / undefined / null) to an explicit
// null so blank, 0, and a real entered value all round-trip distinctly.
function toNullableNumber(value) {
  if (value === "" || value === undefined || value === null) return null;
  return value;
}

function toDb(record) {
  const row = {};
  if ("equipmentId" in record) row.equipment_id = record.equipmentId;
  if ("date" in record) row.date = record.date;
  if ("reportedBy" in record) row.reported_by = record.reportedBy;
  if ("faultDescription" in record) row.fault_description = record.faultDescription;
  if ("errorCode" in record) row.error_code = record.errorCode;
  if ("suspectedCause" in record) row.suspected_cause = record.suspectedCause;
  if ("diagnosis" in record) row.diagnosis = record.diagnosis;
  if ("correctiveAction" in record) row.corrective_action = record.correctiveAction;
  if ("partsReplaced" in record) row.parts_replaced = record.partsReplaced;
  if ("cost" in record) row.cost = toNullableNumber(record.cost);
  if ("engineer" in record) row.engineer = record.engineer;
  if ("repairStart" in record) row.repair_start = record.repairStart;
  if ("repairCompletion" in record) row.repair_completion = record.repairCompletion;
  if ("downtimeHours" in record) row.downtime_hours = toNullableNumber(record.downtimeHours);
  if ("finalStatus" in record) row.final_status = record.finalStatus;
  if ("workOrderId" in record) row.work_order_id = record.workOrderId;
  // Deliberately no hospital_id mapping: even if a caller includes
  // hospitalId, it is silently dropped here and never sent to Supabase.
  // The trg_set_hospital_id trigger stamps hospital_id server-side from
  // the authenticated user's own profile.
  return row;
}

// ---------- public API ----------
// No localStorage migration here — repair_records is a new table with no
// legacy client-side data to import (unlike workOrderService/faultService).

export async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(fromDb);
}

export async function create(record) {
  const row = toDb(record);

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data);
}
