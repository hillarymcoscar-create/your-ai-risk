import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ── Types (mirror UpskillPack in UpskillSection.tsx) ──────────────────
type Resource = { title: string; url: string; why: string };
type Course   = { title: string; platform: string; url: string; cost: string; time?: string; why: string };

type UpskillPack = {
  headline:   string;
  youtube:    Resource[];
  courses:    Course[];
  nz_specific: Course[];
  quick_wins: string[];
};

// ── Email HTML builder ────────────────────────────────────────────────

function buildUserEmailHtml(industry: string, pack: UpskillPack): string {
  const section = (heading: string, content: string) => `
    <tr><td style="padding:24px 0 8px;font-family:sans-serif;font-size:11px;font-weight:700;
      letter-spacing:0.1em;text-transform:uppercase;color:#888;">${heading}</td></tr>
    <tr><td style="padding-bottom:20px;font-family:sans-serif;">${content}</td></tr>`;

  const link = (url: string, title: string) =>
    `<a href="${url}" style="color:#7c3aed;text-decoration:none;">${title}</a>`;

  const resourceRow = (r: Resource) => `
    <div style="margin-bottom:12px;padding:12px 14px;background:#faf5ff;border-radius:8px;">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${link(r.url, r.title)}</div>
      <div style="font-size:13px;color:#555;">${r.why}</div>
    </div>`;

  const courseRow = (c: Course) => `
    <div style="margin-bottom:12px;padding:12px 14px;background:#faf5ff;border-radius:8px;">
      <div style="font-size:14px;font-weight:600;margin-bottom:3px;">${link(c.url, c.title)}</div>
      <div style="font-size:12px;color:#888;margin-bottom:4px;">
        ${c.platform}${c.cost ? ` · ${c.cost}` : ""}${c.time ? ` · ${c.time}` : ""}
      </div>
      <div style="font-size:13px;color:#555;">${c.why}</div>
    </div>`;

  const winsList = pack.quick_wins
    .map((w, i) => `<div style="margin-bottom:8px;font-size:14px;color:#333;">
      <span style="font-weight:600;color:#7c3aed;">${i + 1}.</span> ${w}</div>`)
    .join("");

  const youtubeSection = pack.youtube?.length
    ? section("Understand AI", pack.youtube.map(resourceRow).join(""))
    : "";

  const coursesSection = pack.courses?.length
    ? section("Use AI Now — Courses", pack.courses.map(courseRow).join(""))
    : "";

  const nzSection = pack.nz_specific?.length
    ? section("NZ-Specific Resources", pack.nz_specific.map(courseRow).join(""))
    : "";

  const winsSection = pack.quick_wins?.length
    ? section("Quick Wins This Week", winsList)
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;
        box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:28px 32px;">
          <div style="font-family:sans-serif;font-size:20px;font-weight:700;color:#fff;">Humanise</div>
          <div style="font-family:sans-serif;font-size:13px;color:#ddd6fe;margin-top:2px;">humanise.nz</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-family:sans-serif;font-size:15px;color:#333;padding-bottom:16px;">
              Hi,
            </td></tr>
            <tr><td style="font-family:sans-serif;font-size:15px;color:#333;padding-bottom:24px;
              border-bottom:1px solid #e5e7eb;">
              Here's your personalised upskill pack for <strong>${industry}</strong> workers
              in New Zealand.
            </td></tr>

            ${pack.headline ? `<tr><td style="padding:20px 0 4px;font-family:sans-serif;font-size:14px;
              color:#555;font-style:italic;">${pack.headline}</td></tr>` : ""}

            ${youtubeSection}
            ${coursesSection}
            ${nzSection}
            ${winsSection}

            <!-- Sign-off -->
            <tr><td style="padding-top:24px;border-top:1px solid #e5e7eb;">
              <div style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;">
                Good luck. The workers who adapt fastest will be fine.<br><br>
                <strong>Hillary Woods</strong><br>
                Founder, Humanise<br>
                <a href="https://humanise.nz" style="color:#7c3aed;text-decoration:none;">humanise.nz</a>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <div style="font-family:sans-serif;font-size:11px;color:#9ca3af;text-align:center;">
            You received this because you requested an upskill pack from Humanise.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildNotificationText(email: string, jobTitle: string, industry: string): string {
  return `New upskill pack request\n\nEmail: ${email}\nOccupation: ${jobTitle}\nIndustry: ${industry}`;
}

// ── Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, industry, jobTitle, pack } = await req.json() as {
      to: string;
      industry: string;
      jobTitle: string;
      pack: UpskillPack;
    };

    if (!to || !pack) {
      return new Response(JSON.stringify({ error: "to and pack are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // NOTE: update FROM address once humanise.nz is verified with Resend.
    // Until then, use onboarding@resend.dev for testing.
    const FROM = "Hillary from Humanise <onboarding@resend.dev>";
    const NOTIFY_TO = "hillarymcoscar@gmail.com";

    const sendEmail = async (payload: {
      from: string; to: string[]; subject: string;
      html?: string; text?: string;
    }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error", res.status, err);
        throw new Error(`Resend ${res.status}: ${err}`);
      }
      return res.json();
    };

    // 1. User email
    await sendEmail({
      from: FROM,
      to: [to],
      subject: `Your ${industry} upskill pack — from Humanise`,
      html: buildUserEmailHtml(industry, pack),
    });

    // 2. Notification to Hillary
    await sendEmail({
      from: FROM,
      to: [NOTIFY_TO],
      subject: `New upskill pack request — ${jobTitle} · ${industry}`,
      text: buildNotificationText(to, jobTitle, industry),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
