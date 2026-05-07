import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const SUBJECT = "You're on the waitlist";

const TEXT_BODY = `Hi,

You're in. We'll email you when the Humanise 90-day reskilling plan is ready.

Quick context on what we're building:

A focused 90-day plan specific to your role and the NZ job market. Refreshed every quarter so it stays calibrated to where AI actually is — not where someone guessed it would be a year ago. NZ training providers, regional opportunities, and government training subsidies you might not know about.

We're still shaping it. If there's one thing you'd want included for someone in your role, hit reply and tell us. We read every response.

Talk soon,

Hillary
Founder, Humanise
hillary@humanise.nz

---

You're getting this because you joined the waitlist at humanise.nz. Reply 'unsubscribe' to stop hearing from us.`;

const HTML_BODY = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're on the Humanise waitlist</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
<tr><td style="padding:28px 32px 8px;">
  <div style="font-size:22px;font-weight:800;color:#1a1a2e;letter-spacing:-0.01em;">Humanise</div>
</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.7;color:#333;">
  <p style="margin:0 0 16px;">Hi,</p>
  <p style="margin:0 0 16px;">You're in. We'll email you when the Humanise 90-day reskilling plan is ready.</p>
  <p style="margin:0 0 8px;font-weight:600;color:#1a1a2e;">Quick context on what we're building:</p>
  <p style="margin:0 0 16px;">A focused 90-day plan specific to your role and the NZ job market. Refreshed every quarter so it stays calibrated to where AI actually is — not where someone guessed it would be a year ago. NZ training providers, regional opportunities, and government training subsidies you might not know about.</p>
  <p style="margin:0 0 16px;">We're still shaping it. If there's one thing you'd want included for someone in your role, hit reply and tell us. We read every response.</p>
  <p style="margin:0 0 4px;">Talk soon,</p>
  <p style="margin:16px 0 0;">
    <strong>Hillary</strong><br>
    Founder, Humanise<br>
    <a href="mailto:hillary@humanise.nz" style="color:#00B5A4;text-decoration:none;">hillary@humanise.nz</a>
  </p>
</td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
  <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;">
    You're getting this because you joined the waitlist at humanise.nz.<br>
    Reply 'unsubscribe' to stop hearing from us.
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("send-waitlist-email: missing API keys");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json().catch(() => ({}));
    const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr) || emailStr.length > 254) {
      return new Response(JSON.stringify({ error: "A valid email is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hillary Woods <hillary@humanise.nz>",
        reply_to: "hillary@humanise.nz",
        to: [emailStr],
        subject: SUBJECT,
        html: HTML_BODY,
        text: TEXT_BODY,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("send-waitlist-email: Resend gateway error", resendRes.status, resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendData?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-waitlist-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
