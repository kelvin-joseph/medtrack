// supabase/functions/notify-fault-report/index.ts
//
// Called immediately after a fault ticket is created (see addTicket in
// AppDataContext.jsx) — fault reports are time-sensitive enough that they
// shouldn't wait for the once-a-day digest. Notifies Biomedical Engineers
// always, Head of Biomedical Engineering if the equipment is high-criticality
// or the ticket looks severe, and confirms receipt to the Department Staff
// member who reported it (if they're a logged-in user — see
// fault_tickets.reported_by_id in supabase/migrations/003_notifications.sql).
//
// Shares the same notification_log table/key scheme as the daily digest
// (keyed as "<ticketId>-fault", same as computeNotifications produces) so
// this fault isn't also re-sent in that day's digest.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";
import { fromEquipmentRow, fromTicketRow, emailHtmlForItems } from "../_shared/notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appUrl = Deno.env.get("APP_URL") || "https://your-medtrack-app.example.com";

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return json({ error: "Not authenticated." }, 401);

  let body: { ticketId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!body.ticketId) return json({ error: "ticketId is required." }, 400);

  // service_role from here on: needs to read across every relevant
  // profile, not just what the caller's own RLS would allow.
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: ticketRow, error: tkErr } = await admin
    .from("fault_tickets").select("*").eq("id", body.ticketId).maybeSingle();
  if (tkErr || !ticketRow) return json({ error: "Ticket not found." }, 404);
  const ticket = fromTicketRow(ticketRow);

  const { data: equipRow } = await admin
    .from("equipment").select("*").eq("id", ticket.equipmentId).maybeSingle();
  const equipment = fromEquipmentRow(equipRow);

  const { data: profiles } = await admin.from("profiles").select("*").eq("active", true);
  const isHighCriticality = equipment?.clinicalCriticality === "Critical" || equipment?.clinicalCriticality === "High";

  const recipients = (profiles || []).filter((p: any) =>
    p.role === "Biomedical Engineer" ||
    (p.role === "Head of Biomedical Engineering" && isHighCriticality) ||
    (p.role === "Department Staff" && p.id === ticket.reportedById),
  );

  const item = {
    id: `${ticket.id}-fault`,
    title: `New fault report: ${ticket.category}`,
    message: `${equipment?.name || ticket.equipmentId} — ${ticket.description}`,
  };

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0, failed = 0;

  for (const profile of recipients) {
    try {
      await sendEmail({
        to: profile.email,
        subject: item.title,
        html: emailHtmlForItems(profile.name, [item], appUrl),
      });
      const { error: logErr } = await admin.from("notification_log").insert({
        notification_key: item.id,
        recipient_id: profile.id,
        channel: "email",
        digest_date: today,
      });
      // A duplicate-key conflict here (unique constraint) is expected and
      // harmless if this ever fires twice for the same ticket — swallow it
      // rather than treat it as a real failure.
      if (logErr && logErr.code !== "23505") console.error("[notify-fault-report] Log insert failed:", logErr);
      sent++;
    } catch (err) {
      console.error(`[notify-fault-report] Failed to email ${profile.email}:`, err);
      failed++;
    }
  }

  return json({ recipientsNotified: sent, failed });
});
