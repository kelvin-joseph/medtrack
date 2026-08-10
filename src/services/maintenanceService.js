// Maintenance records still live nested under each equipment record (see
// equipmentService) rather than in their own top-level store. Every
// function here is now async because equipmentService is Supabase-backed.

import * as equipmentService from "./equipmentService.js";

export async function listForEquipment(equipmentId) {
  const eq = await equipmentService.getById(equipmentId);
  return eq?.maintenanceRecords || [];
}

export async function addRecord(equipmentId, record) {
  return equipmentService.addMaintenanceRecord(equipmentId, record);
}

export async function addRepair(equipmentId, record) {
  return equipmentService.addRepairRecord(equipmentId, record);
}

/** Every maintenance record across the whole fleet, with equipment context attached. */
export async function listAll() {
  const all = await equipmentService.getAll();
  return all.flatMap((eq) =>
    eq.maintenanceRecords.map((r) => ({
      ...r,
      equipmentId: eq.id,
      equipmentName: eq.name,
    })),
  );
}

export async function listAllRepairs() {
  const all = await equipmentService.getAll();
  return all.flatMap((eq) =>
    eq.repairRecords.map((r) => ({
      ...r,
      equipmentId: eq.id,
      equipmentName: eq.name,
    })),
  );
}
