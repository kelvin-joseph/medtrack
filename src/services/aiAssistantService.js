// Service boundary for the AI Prediction Assistant.
//
// `ask()` now calls the `ai-assistant` Supabase Edge Function (a hosted
// Gemini free-tier model) for in-scope questions. The chat UI
// (AICommandChat.jsx) is unchanged — it only ever calls `ask()` and
// handles the returned promise the same way it always has.
//
// Two things are still handled locally rather than sent to the LLM:
//  - Off-topic scope guarding (detectOffTopic/offTopicReply) — free, instant,
//    and avoids burning free-tier quota on a question we're going to refuse
//    anyway.
//  - matchedEquipmentId (findMentionedEquipment) — deterministic regex match
//    against the message text, used by the UI to link a reply back to a
//    specific device. Asking the LLM to reliably emit a structured id back
//    is more fragile than just computing it the same way the old rule
//    engine did.
//
// If the edge function is unreachable, misconfigured, or rate-limited (the
// free Gemini tier has real per-minute/per-day caps), `ask()` falls back to
// the local rule-based engine rather than leaving the AI Center dead in the
// water — so a Gemini outage degrades the assistant's answers, it doesn't
// remove them.

import { readValue, writeValue } from "./storage.js";
import { supabase } from "./supabaseClient.js";
import {
  generateAssistantReply,
  detectOffTopic,
  offTopicReply,
  findMentionedEquipment,
} from "../lib/assistantEngine.js";

const HISTORY_KEY = "aiAssistantHistory";

// Fleet summaries and single-equipment context sent to the edge function are
// deliberately condensed to the handful of fields a biomedical question
// actually needs — not the full equipment record (documents, full repair
// history objects, etc.), to keep the request small and avoid handing an
// external API more hospital data than the question calls for.
function summarizeEquipment(eq) {
  if (!eq) return null;
  return {
    id: eq.id,
    name: eq.name,
    assetTag: eq.assetTag,
    category: eq.category,
    status: eq.status,
    condition: eq.condition,
    clinicalCriticality: eq.clinicalCriticality,
    riskScore: eq._ai?.risk?.score,
    riskLevel: eq._ai?.risk?.level,
    riskExplanation: eq._ai?.risk?.explanation,
    failureProbability: eq._ai?.failureProb,
    predictedWindow: eq._ai?.window,
    priority: eq._ai?.priority,
    recommendations: eq._ai?.recommendations,
    replacement: eq._ai?.replacement,
    nextMaintenanceDate: eq.nextMaintenanceDate,
    lastMaintenanceDate: eq.lastMaintenanceDate,
    nextCalibrationDate: eq.nextCalibrationDate,
    lastCalibrationDate: eq.lastCalibrationDate,
    warrantyExpiry: eq.warrantyExpiry,
    vendor: eq.vendor,
    assignedEngineer: eq.assignedEngineer,
    recentRepairs: (eq.repairRecords || []).slice(0, 3).map((r) => ({
      date: r.date,
      faultDescription: r.faultDescription,
      finalStatus: r.finalStatus,
    })),
  };
}

// Capped so a very large real-world fleet doesn't blow past Gemini's
// request size / free-tier token budget on every single message.
const MAX_FLEET_SUMMARY = 150;

function summarizeFleet(equipment) {
  return [...equipment]
    .sort((a, b) => (b._ai?.risk?.score || 0) - (a._ai?.risk?.score || 0))
    .slice(0, MAX_FLEET_SUMMARY)
    .map((eq) => ({
      id: eq.id,
      name: eq.name,
      assetTag: eq.assetTag,
      status: eq.status,
      riskScore: eq._ai?.risk?.score,
      riskLevel: eq._ai?.risk?.level,
      nextMaintenanceDate: eq.nextMaintenanceDate,
    }));
}

export function getHistory() {
  return readValue(HISTORY_KEY, []);
}

export function saveHistory(messages) {
  writeValue(HISTORY_KEY, messages);
  return messages;
}

export function clearHistory() {
  writeValue(HISTORY_KEY, []);
}

async function askLLM({ message, equipment, contextEquipment }) {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      message,
      context: summarizeEquipment(contextEquipment),
      fleetSummary: summarizeFleet(equipment),
    },
  });
  if (error) throw error;
  if (!data?.text) throw new Error("Empty response from AI assistant.");
  return data.text;
}

/**
 * Ask the assistant a question. Resolves to { text, matchedEquipmentId }.
 */
export async function ask({ message, equipment, contextEquipment }) {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      text: "Go ahead and ask me something about your equipment's risk, maintenance, fault history, an error code, or a biomedical engineering question.",
      matchedEquipmentId: null,
    };
  }

  const offTopic = detectOffTopic(trimmed);
  if (offTopic) {
    return { text: offTopicReply(offTopic), matchedEquipmentId: null };
  }

  const mentioned = findMentionedEquipment(trimmed, equipment);
  const matchedEquipmentId = (mentioned || contextEquipment)?.id || null;

  try {
    const text = await askLLM({
      message: trimmed,
      equipment,
      contextEquipment: mentioned || contextEquipment,
    });
    return { text, matchedEquipmentId };
  } catch (err) {
    console.error(
      "[aiAssistantService] LLM call failed, falling back to local rule engine:",
      err,
    );
    return generateAssistantReply({
      message: trimmed,
      equipment,
      contextEquipment,
    });
  }
}
