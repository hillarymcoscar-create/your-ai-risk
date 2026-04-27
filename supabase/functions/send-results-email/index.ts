import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

// ── Helpers ───────────────────────────────────────────────────────────
const h = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const teal = "#00B5A4";
const dark = "#1a1a2e";

const sectionLabel = (text: string) =>
  `<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
     color:${teal};padding-top:24px;padding-bottom:8px;border-top:1px solid #e5e7eb;">${text}</div>`;

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
      description: "Practical AI workflows for professionals — active daily" },
  ],
  "Marketing & Advertising": [
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI for marketers — workflows, tool reviews, peer discussion" },
  ],
  "Technology": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI and software development — active threads on tools and careers" },
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI for technical professionals — daily activity" },
  ],
};
function getCommunities(industry: string): Community[] {
  return COMMUNITIES[industry] ?? [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI upskilling community open to all workers — free to join" },
  ];
}

// ── Email builder ─────────────────────────────────────────────────────
function buildHtml(opts: {
  jobTitle: string; matchedTitle?: string | null; score: number; riskBand: string;
  industry?: string; honestPicture?: string;
  nzMarketSignalMsg?: string; nzMarketSignalSrc?: string;
  mbieGroup?: string; mbieAnnualChange?: number | null;
  mbieRegion?: string; mbieRegionalChange?: number | null;
  statsnzThousands?: number | null; statsnzShare?: number | null;
  tasksAtRisk?: string[]; protectiveSkills?: string[];
}): string {
  const { jobTitle, matchedTitle, score, riskBand, industry = "" } = opts;
  const colour      = bandColour(score);
  const displayRole = h(matchedTitle ?? jobTitle);

  const scoreCard = `
    <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;
      padding:20px 24px;text-align:center;margin:20px 0 4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
        color:#888;margin-bottom:8px;">Your automation risk score</div>
      <div style="font-size:54px;font-weight:800;line-height:1;color:${colour};">${score}%</div>
      <div style="font-size:15px;font-weight:600;margin-top:6px;color:${colour};">${h(riskBand)} Risk</div>
    </div>`;

  const honestSection = opts.honestPicture ? `
    ${sectionLabel("Your honest picture")}
    <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">${h(opts.honestPicture)}</p>` : "";

  const marketSection = opts.nzMarketSignalMsg ? `
    ${sectionLabel("NZ market signal")}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#333;">${h(opts.nzMarketSignalMsg)}</p>
    ${opts.nzMarketSignalSrc
      ? `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Source: ${h(opts.nzMarketSignalSrc)}</p>`
      : ""}` : "";

  let workforceHtml = "";
  if (opts.mbieGroup && typeof opts.mbieAnnualChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      Job ads for ${h(opts.mbieGroup.toLowerCase())} ${pctLabel(opts.mbieAnnualChange)}
      in the past year (MBIE Jobs Online, Dec 2025)</p>`;
  }
  if (opts.mbieRegion && typeof opts.mbieRegionalChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      In ${h(opts.mbieRegion)}, job ads ${pctLabel(opts.mbieRegionalChange)} annually</p>`;
  }
  if (opts.mbieGroup && opts.statsnzThousands && opts.statsnzShare) {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      There are approximately ${opts.statsnzThousands}k ${h(opts.mbieGroup.toLowerCase())} workers
      in NZ — ${opts.statsnzShare}% of the workforce (Stats NZ HLFS Dec 2025)</p>`;
  }
  const workforceSection = workforceHtml
    ? `${sectionLabel("NZ workforce data")}${workforceHtml}` : "";

  const tasksSection = opts.tasksAtRisk?.length ? `
    ${sectionLabel("Your top 3 tasks at risk")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${opts.tasksAtRisk.map((t) => `<li>${h(t)}</li>`).join("")}
    </ul>` : "";

  const skills = opts.protectiveSkills ?? [];
  const skillsSection = skills.length ? `
    ${sectionLabel("Your top 3 protective skills")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${skills.map((s) => `<li>${h(s)}</li>`).join("")}
    </ul>` : "";

  const upskillSection = skills.length ? `
    ${sectionLabel("Ready to upskill? — LinkedIn Learning")}
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.9;">
      ${skills.map((s) =>
        `<li><a href="https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(s)}"
          style="color:${teal};text-decoration:none;">${h(s)}</a></li>`
      ).join("")}
    </ul>` : "";

  const communities = getCommunities(industry);
  const communitySection = `
    ${sectionLabel("Join the conversation")}
    <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
      Free communities where NZ workers are figuring out AI together</p>
    ${communities.map((c) => `
      <div style="margin-bottom:10px;font-size:14px;line-height:1.6;">
        <a href="${h(c.url)}" style="color:${teal};text-decoration:none;font-weight:600;">
          ${h(c.name)}</a>
        <span style="color:#6b7280;font-size:12px;"> (${h(c.platform)})</span>
        — ${h(c.description)}
      </div>`).join("")}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Humanise — your AI automation risk result</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;
    overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <tr><td style="background:${dark};padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">Humanise</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">
        humanise.nz — your AI automation risk result</div>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        For: <strong style="color:${dark};">${displayRole}</strong>
        ${matchedTitle && matchedTitle !== jobTitle ? ` · matched to ${h(matchedTitle)}` : ""}
        ${industry ? ` · ${h(industry)}` : ""}
      </p>
    </td></tr>
    <tr><td style="padding:4px 32px 32px;">
      ${scoreCard}
      ${honestSection}
      ${marketSection}
      ${workforceSection}
      ${tasksSection}
      ${skillsSection}
      ${upskillSection}
      ${communitySection}
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;
        font-size:14px;color:${dark};line-height:1.7;">
        Good luck. The workers who adapt fastest will be fine.<br><br>
        <strong>Hillary Woods</strong><br>
        Founder, Humanise<br>
        <a href="https://humanise.nz" style="color:${teal};text-decoration:none;">humanise.nz</a>
      </div>
    </td></tr>
    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        You received this because you requested your Humanise result.</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY)  throw new Error("RESEND_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const {
      email, jobTitle, matchedTitle, score, riskBand = "Moderate", industry,
      honestPicture, nzMarketSignalMsg, nzMarketSignalSrc,
      mbieGroup, mbieAnnualChange, mbieRegion, mbieRegionalChange,
      statsnzThousands, statsnzShare, tasksAtRisk, protectiveSkills,
    } = body ?? {};

    const emailStr = typeof email === "string" ? email.trim() : "";
    const jobStr   = typeof jobTitle === "string" ? jobTitle.trim() : "";
    const scoreNum = typeof score === "number" ? score : Number(score);

    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr) || emailStr.length > 254) {
      return new Response(JSON.stringify({ error: "A valid email is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!jobStr || jobStr.length > 200) {
      return new Response(JSON.stringify({ error: "A job title is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return new Response(JSON.stringify({ error: "A valid score is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalScore = Math.round(scoreNum);
    const html = buildHtml({
      jobTitle: jobStr,
      matchedTitle: typeof matchedTitle === "string" ? matchedTitle : null,
      score: finalScore,
      riskBand: typeof riskBand === "string" ? riskBand : "Moderate",
      industry: typeof industry === "string" ? industry : "",
      honestPicture: typeof honestPicture === "string" ? honestPicture : "",
      nzMarketSignalMsg: typeof nzMarketSignalMsg === "string" ? nzMarketSignalMsg : "",
      nzMarketSignalSrc: typeof nzMarketSignalSrc === "string" ? nzMarketSignalSrc : "",
      mbieGroup: typeof mbieGroup === "string" ? mbieGroup : "",
      mbieAnnualChange: typeof mbieAnnualChange === "number" ? mbieAnnualChange : null,
      mbieRegion: typeof mbieRegion === "string" ? mbieRegion : "",
      mbieRegionalChange: typeof mbieRegionalChange === "number" ? mbieRegionalChange : null,
      statsnzThousands: typeof statsnzThousands === "number" ? statsnzThousands : null,
      statsnzShare: typeof statsnzShare === "number" ? statsnzShare : null,
      tasksAtRisk: Array.isArray(tasksAtRisk) ? tasksAtRisk : [],
      protectiveSkills: Array.isArray(protectiveSkills) ? protectiveSkills : [],
    });

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Humanise <onboarding@resend.dev>",
        to: [emailStr],
        subject: `Your Humanise result: ${finalScore}% ${riskBand} Risk`,
        html,
        text: `Humanise — ${finalScore}% ${riskBand} Risk\nFor: ${jobStr}`,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("Resend gateway error", resendRes.status, resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendData?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-results-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
