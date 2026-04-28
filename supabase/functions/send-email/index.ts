import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ── Types ─────────────────────────────────────────────────────────────
type Resource = { title: string; url: string; why: string };
type Course   = { title: string; platform: string; url: string; cost: string; time?: string; why: string };
type UpskillPack = {
  headline?: string;
  youtube?: Resource[];
  courses?: Course[];
  nz_specific?: Course[];
  quick_wins?: string[];
};
type Payload = {
  to: string;
  industry: string;
  jobTitle: string;
  matchedTitle?: string | null;
  riskScore?: number;
  riskBand?: string;
  honestPicture?: string;
  nzMarketSignalMsg?: string;
  nzMarketSignalSrc?: string;
  mbieGroup?: string;
  mbieAnnualChange?: number | null;
  mbieRegion?: string;
  mbieRegionalChange?: number | null;
  statsnzThousands?: number | null;
  statsnzShare?: number | null;
  tasksAtRisk?: string[];
  protectiveSkills?: string[];
  pack?: UpskillPack;
  html?: string;
  subject?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────
const h = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const link = (url: string, title: string) =>
  `<a href="${h(url)}" style="color:#00B5A4;text-decoration:none;">${h(title)}</a>`;

const sectionLabel = (text: string) =>
  `<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
     color:#00B5A4;padding-top:24px;padding-bottom:8px;">${text}</div>`;

function bandColour(score: number): string {
  if (score < 30) return "#16a34a";
  if (score < 50) return "#d97706";
  if (score < 70) return "#ea580c";
  return "#dc2626";
}

function pctLabel(pct: number): string {
  if (pct === 0) return "were flat";
  const abs = Math.abs(pct).toString().replace(/\.0$/, "");
  return pct > 0 ? `grew ${abs}%` : `fell ${abs}%`;
}

// ── Community mapping ─────────────────────────────────────────────────
type Community = { name: string; platform: string; url: string; description: string };

const COMMUNITIES: Record<string, Community[]> = {
  "Finance & Accounting": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI for finance and business professionals — active community, free to join" },
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI workflows for professionals — active daily discussions" },
  ],
  "Marketing & Advertising": [
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI for marketers — workflows, tool reviews, and peer discussion" },
  ],
  "Healthcare": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "General AI upskilling community with a growing healthcare cohort" },
  ],
  "Technology": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI and software development — active threads on tools, careers, and upskilling" },
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI implementation for technical professionals — daily activity" },
  ],
  "Education": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "Educators using AI for content, lesson planning, and professional development" },
  ],
};
function getCommunities(industry: string): Community[] {
  return COMMUNITIES[industry] ?? [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI upskilling community open to all workers — free to join" },
  ];
}

// ── Email HTML builder ────────────────────────────────────────────────
function buildEmail(p: Payload): string {
  const {
    industry, jobTitle, matchedTitle, riskScore, riskBand,
    honestPicture, nzMarketSignalMsg, nzMarketSignalSrc,
    mbieGroup, mbieAnnualChange, mbieRegion, mbieRegionalChange,
    statsnzThousands, statsnzShare,
    tasksAtRisk, protectiveSkills, pack,
  } = p;

  const score     = typeof riskScore === "number" ? riskScore : null;
  const scoreColour = score != null ? bandColour(score) : "#1a1a2e";
  const displayRole = h(matchedTitle ?? jobTitle);
  const displayIndustry = h(industry || "your industry");

  // ── Risk score card ──────────────────────────────────────────────
  const scoreCard = score != null ? `
    <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;
      padding:20px 24px;text-align:center;margin:16px 0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;
        text-transform:uppercase;color:#888;margin-bottom:8px;">Your automation risk score</div>
      <div style="font-size:52px;font-weight:800;line-height:1;color:${scoreColour};">${score}%</div>
      <div style="font-size:15px;font-weight:600;margin-top:6px;color:${scoreColour};">${h(riskBand ?? "")} Risk</div>
    </div>` : "";

  // ── Honest picture ───────────────────────────────────────────────
  const honestSection = honestPicture ? `
    ${sectionLabel("Your honest picture")}
    <p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 4px;">${h(honestPicture)}</p>` : "";

  // ── NZ market signal ─────────────────────────────────────────────
  const marketSection = nzMarketSignalMsg ? `
    ${sectionLabel("NZ market signal")}
    <p style="font-size:14px;line-height:1.6;color:#333;margin:0;">${h(nzMarketSignalMsg)}</p>
    ${nzMarketSignalSrc ? `<p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Source: ${h(nzMarketSignalSrc)}</p>` : ""}` : "";

  // ── NZ workforce data ─────────────────────────────────────────────
  let workforceLines = "";
  if (mbieGroup && typeof mbieAnnualChange === "number") {
    workforceLines += `<p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 4px;">
      Job ads for ${h(mbieGroup.toLowerCase())} ${pctLabel(mbieAnnualChange)} in the past year
      (MBIE Jobs Online, Dec 2025)</p>`;
  }
  if (mbieRegion && typeof mbieRegionalChange === "number") {
    workforceLines += `<p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 4px;">
      In ${h(mbieRegion)}, job ads ${pctLabel(mbieRegionalChange)} annually</p>`;
  }
  if (mbieGroup && statsnzThousands && statsnzShare) {
    workforceLines += `<p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 4px;">
      There are approximately ${statsnzThousands}k ${h(mbieGroup.toLowerCase())} workers
      in NZ — ${statsnzShare}% of the workforce (Stats NZ HLFS Dec 2025)</p>`;
  }
  const workforceSection = workforceLines ? `
    ${sectionLabel("NZ workforce data")}
    ${workforceLines}` : "";

  // ── Tasks at risk ────────────────────────────────────────────────
  const tasksSection = tasksAtRisk?.length ? `
    ${sectionLabel("Your top 3 tasks at risk")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.8;">
      ${tasksAtRisk.map((t) => `<li>${h(t)}</li>`).join("")}
    </ul>` : "";

  // ── Protective skills ────────────────────────────────────────────
  const skills = protectiveSkills ?? [];
  const skillsSection = skills.length ? `
    ${sectionLabel("Your top 3 protective skills")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.8;">
      ${skills.map((s) => `<li>${h(s)}</li>`).join("")}
    </ul>` : "";

  // ── Ready to upskill ─────────────────────────────────────────────
  const upskillLinks = skills.length ? `
    ${sectionLabel("Ready to upskill? — LinkedIn Learning")}
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.8;">
      ${skills.map((s) =>
        `<li>${link(
          `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(s)}`,
          h(s)
        )}</li>`
      ).join("")}
    </ul>` : "";

  // ── Pack resources (if provided) ─────────────────────────────────
  let packSection = "";
  if (pack) {
    const resourceRow = (r: Resource) => `
      <div style="margin-bottom:10px;padding:10px 12px;background:#f0fdfa;border-radius:8px;font-size:13px;">
        <div style="font-weight:600;margin-bottom:3px;">${link(r.url, r.title)}</div>
        <div style="color:#555;">${h(r.why)}</div>
      </div>`;
    const courseRow = (c: Course) => `
      <div style="margin-bottom:10px;padding:10px 12px;background:#f0fdfa;border-radius:8px;font-size:13px;">
        <div style="font-weight:600;margin-bottom:3px;">${link(c.url, c.title)}</div>
        <div style="color:#888;font-size:11px;margin-bottom:3px;">
          ${h(c.platform)}${c.cost ? ` · ${h(c.cost)}` : ""}${c.time ? ` · ${h(c.time)}` : ""}
        </div>
        <div style="color:#555;">${h(c.why)}</div>
      </div>`;

    if (pack.headline) {
      packSection += `<p style="font-size:13px;font-style:italic;color:#555;margin:16px 0 8px;">${h(pack.headline)}</p>`;
    }
    if (pack.youtube?.length) {
      packSection += `${sectionLabel("Understand AI — YouTube")}${pack.youtube.map(resourceRow).join("")}`;
    }
    if (pack.courses?.length) {
      packSection += `${sectionLabel("Use AI now — Courses")}${pack.courses.map(courseRow).join("")}`;
    }
    if (pack.nz_specific?.length) {
      packSection += `${sectionLabel("NZ-specific resources")}${pack.nz_specific.map(courseRow).join("")}`;
    }
    if (pack.quick_wins?.length) {
      packSection += `${sectionLabel("Quick wins this week")}
        <ol style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.8;">
          ${pack.quick_wins.map((w) => `<li>${h(w)}</li>`).join("")}
        </ol>`;
    }
  }

  // ── Community ────────────────────────────────────────────────────
  const communities = getCommunities(industry);
  const communityRows = communities.map((c) => `
    <div style="margin-bottom:10px;font-size:14px;line-height:1.6;">
      ${link(c.url, `${h(c.name)} (${h(c.platform)})`)} — ${h(c.description)}
    </div>`).join("");
  const communitySection = `
    ${sectionLabel("Join the conversation")}
    <p style="font-size:12px;color:#888;margin:0 0 10px;">Free communities where NZ workers are figuring out AI together</p>
    ${communityRows}`;

  // ── Assemble ──────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Humanise — your AI automation risk result</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;
    box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr><td style="background:#1a1a2e;padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#ffffff;">Humanise</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">humanise.nz — your AI automation risk result</div>
    </td></tr>

    <!-- Role -->
    <tr><td style="padding:20px 32px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        For: <strong style="color:#1a1a2e;">${displayRole}</strong>
        ${displayIndustry !== h(industry || "your industry") ? "" : ` · ${displayIndustry}`}
        ${matchedTitle && matchedTitle !== jobTitle ? ` · matched to ${h(matchedTitle)}` : ""}
      </p>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:8px 32px 32px;">
      ${scoreCard}
      ${honestSection}
      ${marketSection}
      ${workforceSection}
      ${tasksSection}
      ${skillsSection}
      ${upskillLinks}
      ${packSection}
      ${communitySection}

      <!-- Sign-off -->
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;
        font-size:14px;color:#1a1a2e;line-height:1.7;">
        Good luck. The workers who adapt fastest will be fine.<br><br>
        <strong>Hillary Woods</strong><br>
        Founder, Humanise<br>
        <a href="https://humanise.nz" style="color:#00B5A4;text-decoration:none;">humanise.nz</a>
      </div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        You received this because you requested your Humanise result.
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Notification email ────────────────────────────────────────────────
function buildNotification(to: string, jobTitle: string, industry: string, score: number | undefined): string {
  return `New upskill pack request\n\nEmail: ${to}\nOccupation: ${jobTitle}\nIndustry: ${industry}${score != null ? `\nRisk score: ${score}%` : ""}`;
}

// ── Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as Payload;
    const { to, industry, jobTitle, pack } = body;

    if (!to || (!pack && !body.html)) {
      return new Response(JSON.stringify({ error: "to and either pack or html are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // NOTE: update FROM once humanise.nz is verified with Resend
    const FROM     = "Hillary from Humanise <onboarding@resend.dev>";
    const NOTIFY   = "hillarymcoscar@gmail.com";

    const sendEmail = async (payload: { from: string; to: string[]; subject: string; html?: string; text?: string }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error", res.status, err);
        throw new Error(`Resend ${res.status}: ${err}`);
      }
      return res.json();
    };

    // 1. Rich results + pack email to user
    await sendEmail({
      from: FROM,
      to: [to],
      subject: body.subject ?? `Your ${industry || "personalised"} upskill pack — from Humanise`,
      html: body.html ?? buildEmail(body),
    });

    // 2. Notification to Hillary
    await sendEmail({
      from: FROM,
      to: [NOTIFY],
      subject: `New upskill pack request — ${jobTitle} · ${industry}`,
      text: buildNotification(to, jobTitle, industry, typeof body.riskScore === "number" ? body.riskScore : undefined),
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
