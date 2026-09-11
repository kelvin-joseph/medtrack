// supabase/functions/send-notification-digest/index.ts
//
// Daily digest: computes the same notification feed the Notifications
// screen shows, routes each item to the right recipients per the hospital's
// role-based rules (see _shared/notifications.ts), groups everything into
// ONE email per recipient (not one email per alert), skips anything already
// sent today (notification_log dedup), and sends via Resend.
//
// This is meant to run on a schedule (once/day), not be called from the
// app. See supabase/SETUP.md for the pg_cron setup that invokes it.
//
// Auth: since there's no logged-in user when a cron job calls this, it's
// protected by a shared secret header instead of a user session — set
// CRON_SECRET as a function secret and have the cron job send it as
// `x-cron-secret`.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";
import {
  fromEquipmentRow, fromTicketRow, enrichEquipmentList, computeNotifications,
  recipientsForNotification, groupProfilesByRole, emailHtmlForItems,
} from "../_shared/notifications.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appUrl = Deno.env.get("APP_URL") || "https://your-medtrack-app.example.com";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // service_role bypasses RLS entirely, so hospital isolation here is
  // manual: we fetch the hospital list ourselves and loop, scoping every
  // query (and every insert) to one hospital_id at a time. Nothing in this
  // function is ever allowed to touch more than one hospital's rows in the
  // same pass.
  const { data: hospitals, error: hospErr } = await supabase.from("hospitals").select("id, name");
  if (hospErr) {
    console.error("[send-notification-digest] Failed to load hospitals:", hospErr);
    return json({ error: "Failed to load hospitals." }, 500);
  }

  const today = new Date().toISOString().slice(0, 10);
  let totalRecipients = 0, sent = 0, skippedEmpty = 0, failed = 0;

  for (const hospital of hospitals || []) {
    const hospitalId = hospital.id;

    const [{ data: profileRows, error: profErr }, { data: equipRows, error: eqErr },
      { data: ticketRows, error: tkErr }, { data: settingsRow, error: setErr }] = await Promise.all([
      supabase.from("profiles").select("*").eq("active", true).eq("hospital_id", hospitalId),
      supabase.from("equipment").select("*").eq("hospital_id", hospitalId),
      supabase.from("fault_tickets").select("*").in("status", ["New", "Assigned", "In Progress"]).eq("hospital_id", hospitalId),
      supabase.from("settings").select("data").eq("hospital_id", hospitalId).maybeSingle(),
    ]);
    if (profErr || eqErr || tkErr || setErr) {
      console.error(`[send-notification-digest] Fetch error for hospital ${hospitalId}:`, profErr || eqErr || tkErr || setErr);
      failed++;
      continue;
    }

    const settings = settingsRow?.data || {};
    const equipment = enrichEquipmentList(
      (equipRows || []).map(fromEquipmentRow),
      settings?.risk?.thresholds,
    );
    const tickets = (ticketRows || []).map(fromTicketRow);
    const profiles = profileRows || [];

    const equipmentById = new Map(equipment.map((e: any) => [e.id, e]));
    const profileById = new Map(profiles.map((p: any) => [p.id, p]));
    const profilesByRole = groupProfilesByRole(profiles);

    const notifications = computeNotifications(equipment, tickets, settings);

    // recipientId -> { profile, items: [] }
    const perRecipient = new Map<string, { profile: any; items: any[] }>();
    function addFor(profile: any, item: any) {
      if (!profile) return;
      if (!perRecipient.has(profile.id)) perRecipient.set(profile.id, { profile, items: [] });
      perRecipient.get(profile.id)!.items.push(item);
    }

    for (const item of notifications) {
      for (const p of recipientsForNotification(item, equipmentById, profilesByRole)) {
        addFor(p, item);
      }
      // Department Staff: only ever their own reported fault, added directly
      // rather than via role-wide routing.
      if (item.type === "fault-report" && item.reportedById) {
        const reporter = profileById.get(item.reportedById);
        if (reporter?.role === "Department Staff") addFor(reporter, item);
      }
    }

    totalRecipients += perRecipient.size;

    for (const { profile, items } of perRecipient.values()) {
      // Dedup: drop items already logged as sent to this person today.
      const keys = items.map((i: any) => i.id);
      const { data: already } = await supabase
        .from("notification_log")
        .select("notification_key")
        .eq("recipient_id", profile.id)
        .eq("digest_date", today)
        .eq("hospital_id", hospitalId)
        .in("notification_key", keys);
      const alreadySent = new Set((already || []).map((r: any) => r.notification_key));
      const freshItems = items.filter((i: any) => !alreadySent.has(i.id));

      if (freshItems.length === 0) {
        skippedEmpty++;
        continue;
      }

      try {
        await sendEmail({
          to: profile.email,
          subject: `MedTrack: ${freshItems.length} update${freshItems.length === 1 ? "" : "s"} for you`,
          html: emailHtmlForItems(profile.name, freshItems, appUrl),
        });
        const logRows = freshItems.map((i: any) => ({
          notification_key: i.id,
          recipient_id: profile.id,
          channel: "email",
          digest_date: today,
          hospital_id: hospitalId,
        }));
        const { error: logErr } = await supabase.from("notification_log").insert(logRows);
        if (logErr) console.error(`[send-notification-digest] Failed to log sent notifications for hospital ${hospitalId}:`, logErr);
        sent++;
      } catch (err) {
        console.error(`[send-notification-digest] Failed to email ${profile.email}:`, err);
        failed++;
      }
    }
  }

  return json({ hospitalsProcessed: (hospitals || []).length, recipientsConsidered: totalRecipients, emailsSent: sent, skippedAlreadySent: skippedEmpty, failed });
});
