// Thin wrapper around Resend's send-email API. Shared by both notification
// functions so there's exactly one place that knows how to talk to Resend.
//
// Requires the RESEND_API_KEY secret (see supabase/SETUP.md).
// RESEND_FROM_EMAIL is optional — Resend's shared "onboarding@resend.dev"
// address works for testing without a verified domain, but delivery from
// it is rate-limited and lands in spam more often. Once you've verified a
// domain in Resend, set RESEND_FROM_EMAIL to an address on it, e.g.
// "MedTrack Alerts <notifications@your-hospital-domain.org>".

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY secret is not set.");
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "MedTrack <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
  return res.json();
}
