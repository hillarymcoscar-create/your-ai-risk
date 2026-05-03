import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const SUBJECT = "You're on the waitlist — and we want your input";

const TEXT_BODY = `Hi,

You're in. You'll be one of the first to get access to the full Humanise reskilling roadmap when it launches.

Here's what we're building:

A personalised 12-month plan specific to your role and the NZ job market. Not generic career advice — actual NZ training providers, NZ employers hiring for AI-resilient roles, regional opportunities, and government training subsidies you might not know about.

Right now we're shaping what goes into it. So before we build, we want to ask:

What would make this most useful for someone in your role?

Hit reply and tell us:
- The one thing you wish someone would honestly tell you about where AI is taking your job
- What's stopped you from upskilling before now (time, money, knowing where to start, something else)
- What would make a 12-month plan worth $29 to you — or whether you'd pay for it at all

No marketing fluff. We read every reply and the answers shape what we build.

Until then, you can:
- Forward humanise.nz to a colleague who should take the quiz
- Read the research behind the score — RBNZ AN2026-02, MBIE Jobs Online, O*NET 30.2

Thanks for trusting us with this,

Hillary
Founder, Humanise
hillary@humanise.nz

---

You're getting this email because you joined the waitlist at humanise.nz. Don't want updates? Reply 'unsubscribe' and we'll remove you immediately.`;

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
  <p style="margin:0 0 16px;">You're in. You'll be one of the first to get access to the full Humanise reskilling roadmap when it launches.</p>
  <p style="margin:0 0 8px;font-weight:600;color:#1a1a2e;">Here's what we're building:</p>
  <p style="margin:0 0 16px;">A personalised 12-month plan specific to your role and the NZ job market. Not generic career advice — actual NZ training providers, NZ employers hiring for AI-resilient roles, regional opportunities, and government training subsidies you might not know about.</p>
  <p style="margin:0 0 16px;">Right now we're shaping what goes into it. So before we build, we want to ask:</p>
  <p style="margin:0 0 16px;font-weight:600;color:#1a1a2e;">What would make this most useful for someone in your role?</p>
  <p style="margin:0 0 8px;">Hit reply and tell us:</p>
  <ul style="margin:0 0 16px;padding-left:20px;">
    <li style="margin-bottom:6px;">The one thing you wish someone would honestly tell you about where AI is taking your job</li>
    <li style="margin-bottom:6px;">What's stopped you from upskilling before now (time, money, knowing where to start, something else)</li>
    <li style="margin-bottom:6px;">What would make a 12-month plan worth $29 to you — or whether you'd pay for it at all</li>
  </ul>
  <p style="margin:0 0 16px;">No marketing fluff. We read every reply and the answers shape what we build.</p>
  <p style="margin:0 0 8px;">Until then, you can:</p>
  <ul style="margin:0 0 16px;padding-left:20px;">
    <li style="margin-bottom:6px;">Forward <a href="https://humanise.nz" style="color:#00B5A4;text-decoration:none;">humanise.nz</a> to a colleague who should take the quiz</li>
    <li style="margin-bottom:6px;">Read the research behind the score — RBNZ AN2026-02, MBIE Jobs Online, O*NET 30.2</li>
  </ul>
  <p style="margin:0 0 4px;">Thanks for trusting us with this,</p>
  <p style="margin:16px 0 0;">
    <strong>Hillary</strong><br>
    Founder, Humanise<br>
    <a href="mailto:hillary@humanise.nz" style="color:#00B5A4;text-decoration:none;">hillary@humanise.nz</a>
  </p>
</td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
  <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;">
    You're getting this email because you joined the waitlist at humanise.nz.<br>
    Don't want updates? Reply 'unsubscribe' and we'll remove you immediately.
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
