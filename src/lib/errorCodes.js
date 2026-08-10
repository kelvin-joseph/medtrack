// Curated reference database of common biomedical equipment error/fault
// codes, organized by equipment category. This is a static clinical
// engineering reference — not pulled from any single manufacturer's
// service manual — intended to give a biomedical engineer a fast first
// read on an alarm/error code while they pull the actual service manual.
//
// Shape:
// { category, code, title, meaning, likelyCauses: [...], steps: [...], safety: "..." }

export const ERROR_CODE_DATABASE = [
  // Ventilators
  {
    category: "Ventilator", code: "E-104", title: "Low Tidal Volume Alarm",
    meaning: "Delivered tidal volume has fallen below the set threshold for consecutive breaths.",
    likelyCauses: ["Flow sensor drift or contamination", "Circuit leak (loose fitting, cracked tubing)", "Cuff leak on the patient interface", "Partially occluded filter"],
    steps: [
      "Perform a circuit leak test per the manufacturer's checkout procedure.",
      "Inspect and, if needed, recalibrate the flow/proximal sensor.",
      "Check all circuit connections, humidifier chamber seals, and the expiratory filter.",
      "Confirm cuff pressure is within the recommended range if applicable.",
      "If the alarm persists after a passed leak test, escalate to depot-level service.",
    ],
    safety: "Do not silence this alarm without verifying delivered volume at the patient — under-ventilation is a patient-safety event.",
  },
  {
    category: "Ventilator", code: "E-221", title: "High Airway Pressure Alarm",
    meaning: "Peak inspiratory pressure exceeded the configured high-pressure limit.",
    likelyCauses: ["Circuit or ET tube kink/obstruction", "Patient coughing, biting the tube, or bronchospasm", "Water in the circuit", "Incorrect pressure limit setting for patient"],
    steps: [
      "Visually trace the circuit for kinks, and check the ET tube for secretions or biting.",
      "Drain condensate from the circuit and water trap.",
      "Verify pressure alarm limits match the current clinical order.",
      "If mechanical cause is ruled out, involve clinical staff — this may be a patient-side event, not equipment fault.",
    ],
    safety: "High-pressure alarms can indicate barotrauma risk to the patient — treat as urgent regardless of suspected cause.",
  },
  {
    category: "Ventilator", code: "E-330", title: "O2 Cell Failure / Low O2 Reading",
    meaning: "The oxygen sensor cell is reading outside expected range or has failed calibration.",
    likelyCauses: ["Depleted galvanic O2 cell (consumable, has a service life)", "Sensor calibration drift", "Loose sensor connector"],
    steps: [
      "Attempt a 21%/100% two-point O2 sensor calibration per the service manual.",
      "If calibration fails or won't hold, replace the O2 sensor cell (standard consumable).",
      "Log the cell replacement date for future MTBF tracking.",
    ],
    safety: "Do not return the ventilator to clinical use on an uncalibrated O2 reading.",
  },

  // Infusion Pumps
  {
    category: "Infusion Pump", code: "OCC-1", title: "Downstream Occlusion",
    meaning: "The pump has detected resistance to flow between the pump and the patient.",
    likelyCauses: ["Kinked IV line", "Closed clamp", "Infiltrated IV site", "Clot at the catheter tip"],
    steps: [
      "Trace the full line from pump to patient for kinks or closed clamps.",
      "Check the IV insertion site for infiltration or swelling.",
      "Clear the occlusion alarm only after the physical obstruction is confirmed resolved.",
      "If occlusion recurs with no physical cause found, bench-test the occlusion sensor.",
    ],
    safety: "Never override an occlusion alarm without confirming line patency — risk of delayed medication delivery.",
  },
  {
    category: "Infusion Pump", code: "AIR-2", title: "Air-in-Line Detected",
    meaning: "The air bubble sensor has detected air exceeding the configured threshold in the tubing.",
    likelyCauses: ["Improper line priming", "Micro-leaks at connectors introducing air", "Empty or near-empty bag/bottle", "Air sensor contamination or misalignment"],
    steps: [
      "Re-prime the administration set fully, tapping out visible bubbles.",
      "Inspect all connectors and the spike for a secure, air-tight seal.",
      "Clean the air sensor window per the manufacturer's cleaning procedure.",
      "If false alarms continue on a properly primed line, the sensor may need bench calibration.",
    ],
    safety: "Do not disable air-in-line detection as a workaround — air embolism risk.",
  },
  {
    category: "Infusion Pump", code: "BAT-LOW", title: "Battery Critical / Imminent Shutdown",
    meaning: "Internal battery has reached a critically low state of charge.",
    likelyCauses: ["Extended use off AC power", "Battery nearing end of service life", "Charging contact corrosion"],
    steps: [
      "Connect to AC power immediately to avoid interruption of therapy.",
      "Verify charging indicator activates; if not, inspect charging contacts and power cable.",
      "If the pump won't hold charge after a full charge cycle, replace the battery per its rated service life.",
    ],
    safety: "A pump that shuts down mid-infusion is a therapy-interruption risk — treat battery faults as high priority on continuous-infusion patients.",
  },

  // Patient Monitors
  {
    category: "Patient Monitor", code: "SPO2-NP", title: "SpO2 Sensor Not Detecting Pulse",
    meaning: "The pulse oximetry module cannot find a valid plethysmographic waveform.",
    likelyCauses: ["Poor probe-to-patient contact", "Patient motion artifact", "Peripheral vasoconstriction / poor perfusion", "Damaged or aged sensor"],
    steps: [
      "Reposition or replace the SpO2 probe and confirm good skin contact.",
      "Try an alternate measurement site (finger, ear, forehead depending on probe type).",
      "Test the sensor on a known-good subject or SpO2 simulator to rule out a hardware fault.",
      "Inspect the sensor cable for cracks or connector damage.",
    ],
    safety: "Do not rely on a stale/frozen SpO2 reading — confirm a live waveform is present before trusting the number.",
  },
  {
    category: "Patient Monitor", code: "NIBP-ERR", title: "NIBP Measurement Failed",
    meaning: "The non-invasive blood pressure module could not complete a measurement cycle.",
    likelyCauses: ["Excessive patient motion during inflation", "Cuff too loose, too tight, or wrong size", "Kinked or disconnected air hose", "Internal pump/valve fault"],
    steps: [
      "Confirm correct cuff size and snug, correctly positioned application.",
      "Check the air hose for kinks, leaks, or loose connection to the monitor.",
      "Retry the measurement with the limb still.",
      "Run the monitor's built-in NIBP self-test / leak test if the fault repeats.",
    ],
    safety: "Repeated NIBP failures on a hemodynamically unstable patient should prompt an alternate BP monitoring method while the unit is serviced.",
  },
  {
    category: "Patient Monitor", code: "ECG-LEADS-OFF", title: "ECG Lead(s) Off",
    meaning: "One or more ECG electrodes have lost adequate skin contact.",
    likelyCauses: ["Dried-out or dislodged electrode", "Broken lead wire", "Diaphoretic or prepped skin affecting adhesion"],
    steps: [
      "Replace the affected electrode(s) and ensure clean, dry skin at the site.",
      "Inspect lead wires for continuity/breaks, especially at strain-relief points.",
      "Test the lead set on a patient simulator if the fault persists after electrode replacement.",
    ],
    safety: "Do not silence lead-off alarms without visually confirming a valid ECG trace has returned.",
  },

  // Defibrillators
  {
    category: "Defibrillator", code: "SELF-TEST-FAIL", title: "Automated Self-Test Failure",
    meaning: "The unit's scheduled/automatic self-test did not pass.",
    likelyCauses: ["Battery below required charge threshold", "Internal capacitor fault", "Pads/cable connector fault", "Firmware fault"],
    steps: [
      "Note the specific failure code shown on the unit's diagnostic screen if available.",
      "Replace or fully charge the battery and re-run the self-test.",
      "Inspect the therapy cable and pad connector for damage.",
      "Remove the unit from clinical service and tag out until the self-test passes — do not attempt workaround.",
    ],
    safety: "A defibrillator that fails self-test must be pulled from service immediately; this is a life-critical device with zero tolerance for deferred faults.",
  },
  {
    category: "Defibrillator", code: "LOW-ENERGY-DELIVERY", title: "Energy Delivery Below Selected Setting",
    meaning: "Delivered energy during a discharge (test or clinical) was below the selected joule setting.",
    likelyCauses: ["Capacitor degradation", "Poor pad-to-patient contact impedance", "Internal circuit fault"],
    steps: [
      "Re-run a calibrated energy-delivery test using a defibrillator analyzer.",
      "If delivered energy remains out of tolerance, escalate to depot repair — do not attempt field capacitor service.",
      "Quarantine the unit from clinical use until verified within manufacturer tolerance.",
    ],
    safety: "Under-delivery of therapeutic energy directly affects resuscitation outcomes — this is an immediate clinical-risk fault.",
  },

  // Dialysis Machines
  {
    category: "Dialysis Machine", code: "TMP-ALARM", title: "Transmembrane Pressure Out of Range",
    meaning: "Pressure differential across the dialyzer membrane is outside the safe operating window.",
    likelyCauses: ["Dialyzer clotting", "Kinked blood or dialysate lines", "Incorrect UF (ultrafiltration) rate setting", "Pressure transducer fault"],
    steps: [
      "Inspect blood and dialysate lines for kinks or clots.",
      "Verify UF rate and prescribed parameters match the treatment order.",
      "Check pressure transducer/pod calibration per the service manual.",
      "Do not bypass the TMP alarm — it directly protects against membrane rupture.",
    ],
    safety: "TMP alarms protect against blood loss via membrane rupture — treat as urgent, patient is connected.",
  },
  {
    category: "Dialysis Machine", code: "CONDUCTIVITY-ERR", title: "Dialysate Conductivity Out of Range",
    meaning: "The mixed dialysate conductivity is outside the safe concentration window.",
    likelyCauses: ["Concentrate supply depleted or wrong concentrate connected", "Proportioning pump fault", "Conductivity cell fouling"],
    steps: [
      "Confirm the correct acid/bicarbonate concentrate is connected and adequately supplied.",
      "Run the machine's conductivity calibration/verification routine.",
      "Clean or replace the conductivity cell if readings won't stabilize.",
    ],
    safety: "Never allow treatment to proceed with unresolved conductivity faults — risk of electrolyte imbalance to the patient.",
  },

  // Anaesthesia Machines
  {
    category: "Anaesthesia Machine", code: "LOW-AGENT", title: "Low Anaesthetic Agent Level",
    meaning: "The vaporizer agent level has dropped below the safe fill line.",
    likelyCauses: ["Vaporizer due for refill", "Fill port not fully seated after last refill"],
    steps: [
      "Refill the vaporizer with the correct agent per the color-coded, keyed filling system.",
      "Confirm the fill port is fully seated and locked to prevent leaks.",
      "Verify agent concentration reads correctly on the monitor after refill.",
    ],
    safety: "Never mix anaesthetic agents or use a filling adaptor not keyed for the agent in use.",
  },
  {
    category: "Anaesthesia Machine", code: "CO2-ABSORBER-EXHAUSTED", title: "CO2 Absorbent Exhausted",
    meaning: "Soda lime / CO2 absorbent has reached end of useful capacity (color change or rising inspired CO2).",
    likelyCauses: ["Normal consumable depletion", "High fresh gas flow masking earlier depletion", "Absorbent canister not fully seated"],
    steps: [
      "Replace the CO2 absorbent canister per the manufacturer's procedure.",
      "Confirm inspired CO2 returns to near-zero on the gas monitor after replacement.",
      "Check canister seating and gasket condition to rule out bypass leaks.",
    ],
    safety: "Rising inspired CO2 is a rebreathing hazard — do not continue a case on exhausted absorbent.",
  },

  // Incubators
  {
    category: "Incubator", code: "TEMP-DEVIATION", title: "Air/Skin Temperature Deviation Alarm",
    meaning: "Measured temperature has deviated from the setpoint beyond the configured tolerance.",
    likelyCauses: ["Skin probe detached or poorly applied", "Heater element fault", "Air circulation fan fault", "Draft from a nearby door/vent"],
    steps: [
      "Confirm skin probe placement and adhesion if in servo mode.",
      "Inspect the heater element and circulation fan for normal operation.",
      "Check for external drafts affecting the incubator hood/portholes.",
      "Verify calibration of the temperature sensor against a reference thermometer.",
    ],
    safety: "Temperature deviation is a direct thermoregulation risk to a neonate — treat as urgent and notify clinical staff immediately.",
  },

  // Autoclaves / Sterilizers
  {
    category: "Autoclave", code: "CYCLE-ABORT", title: "Sterilization Cycle Aborted",
    meaning: "The sterilizer stopped a cycle before completion due to a parameter out of tolerance.",
    likelyCauses: ["Chamber pressure/temperature failed to reach setpoint", "Door seal leak", "Water supply or steam generator fault"],
    steps: [
      "Check the door gasket for damage and confirm the door is fully sealed.",
      "Inspect water supply level and steam generator function.",
      "Re-run the cycle; if it aborts again at the same phase, review the printed cycle log for the specific fault code.",
      "Quarantine any load from the aborted cycle — it is not considered sterile.",
    ],
    safety: "Never release a load from an aborted cycle as sterile — this is an infection-control critical failure.",
  },

  // X-Ray / CT / MRI
  {
    category: "X-Ray Machine", code: "TUBE-OVERLOAD", title: "X-Ray Tube Overload / Cooling Fault",
    meaning: "The tube has reached its thermal loading limit or the cooling system is faulted.",
    likelyCauses: ["High exposure rate in short succession", "Tube cooling fan/pump fault", "Tube nearing end of service life"],
    steps: [
      "Allow the tube cooling period indicated on the console before further exposures.",
      "Inspect the tube cooling fan/pump for normal operation.",
      "If overload recurs at normal usage levels, the tube may be degrading — plan for replacement.",
    ],
    safety: "Do not force additional exposures past a cooling lockout — risk of tube failure.",
  },
  {
    category: "CT Scanner", code: "GANTRY-COMM-FAULT", title: "Gantry Communication Fault",
    meaning: "The console has lost communication with the gantry's control system.",
    likelyCauses: ["Slip ring contact wear", "Cable/connector fault", "Gantry control board fault"],
    steps: [
      "Power-cycle the system per the manufacturer's restart sequence.",
      "Inspect slip ring contacts for wear if the fault is intermittent during rotation.",
      "Escalate to OEM field service for control-board level diagnostics — this is not a field-serviceable fault in most systems.",
    ],
    safety: "Do not scan patients while gantry communication is unreliable — risk of incomplete or corrupted acquisition mid-scan.",
  },

  // Ultrasound
  {
    category: "Ultrasound Machine", code: "PROBE-FAULT", title: "Probe Not Recognized / Probe Fault",
    meaning: "The system cannot identify or communicate with the connected transducer.",
    likelyCauses: ["Damaged probe connector pins", "Cracked probe cable", "Probe port fault on the system"],
    steps: [
      "Reseat the probe connector firmly and check for bent/damaged pins.",
      "Try the probe on another port or another compatible system to isolate probe vs. system fault.",
      "Inspect the probe cable along its length for cracks, especially near the strain relief.",
    ],
    safety: "A probe with a cracked cable/housing should be pulled from use — risk of electrical leakage against the patient.",
  },

  // Cross-category electrical safety code
  {
    category: "General", code: "LEAKAGE-CURRENT-FAIL", title: "Electrical Safety Test Failure (Leakage Current)",
    meaning: "Measured earth/enclosure/patient leakage current exceeded the IEC 60601-1 allowable limit during PM electrical safety testing.",
    likelyCauses: ["Damaged power cord or plug", "Compromised insulation inside the unit", "Moisture ingress", "Faulty internal component drawing to ground"],
    steps: [
      "Re-test with a calibrated electrical safety analyzer to rule out a test artifact.",
      "Visually inspect the power cord, plug, and strain relief for damage.",
      "If leakage remains out of tolerance, remove the device from clinical service and refer to depot repair.",
      "Document the failed reading and corrective action in the equipment's service record before any repeat use.",
    ],
    safety: "A device failing leakage current testing must not be returned to patient use until it passes — this is a direct electric-shock hazard.",
  },
];

/** Finds candidate matches for a free-text query (code, keyword, or category). */
export function searchErrorCodes(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return ERROR_CODE_DATABASE.filter((e) =>
    e.code.toLowerCase().includes(q) ||
    e.title.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    e.meaning.toLowerCase().includes(q)
  );
}

export function errorCodesByCategory(category) {
  if (!category || category === "All") return ERROR_CODE_DATABASE;
  return ERROR_CODE_DATABASE.filter((e) => e.category === category);
}

export const ERROR_CODE_CATEGORIES = ["All", ...new Set(ERROR_CODE_DATABASE.map((e) => e.category))];
