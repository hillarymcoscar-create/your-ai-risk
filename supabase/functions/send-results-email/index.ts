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

// ── Agent Watch email ─────────────────────────────────────────────────

type AwResource = { title: string; url: string; why: string; platform: string };

// Hard-coded fallback resource packs keyed by industry / occupation keyword.
// Used when no curated pack is available for the user's industry.
function fallbackResources(occupation: string, industry: string): AwResource[] {
  const occ = (occupation || "").toLowerCase();
  const ind = (industry || "").toLowerCase();

  const seo: AwResource[] = [
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "The fastest way to understand how AI is changing search and content workflows from the inside." },
    { title: "Semrush Academy AI SEO courses", url: "https://www.semrush.com/academy/", platform: "Semrush Academy",
      why: "Free courses on using Semrush AI tools, directly relevant to the agent workflows replacing junior SEO tasks." },
    { title: "Ahrefs Academy", url: "https://academy.ahrefs.com/", platform: "Ahrefs",
      why: "Free SEO training kept current as agent-driven workflows change what gets ranked." },
  ];
  const marketing: AwResource[] = [
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "Foundational AI fluency every marketer is now expected to have." },
    { title: "HubSpot AI Marketing Certification", url: "https://academy.hubspot.com/", platform: "HubSpot Academy",
      why: "Free certification covering AI tools for content, campaigns, and reporting." },
    { title: "The AI Advantage on Skool", url: "https://www.skool.com/the-ai-advantage", platform: "Skool",
      why: "Practical AI workflows for marketers, daily peer discussion and tool reviews." },
  ];
  const finance: AwResource[] = [
    { title: "Excel Skills for Business on Coursera", url: "https://www.coursera.org/specializations/excel", platform: "Coursera",
      why: "AI is changing Excel first. Stay ahead of Copilot adoption in your team." },
    { title: "CPA Australia AI in Finance resources", url: "https://www.cpaaustralia.com.au/", platform: "CPA Australia",
      why: "NZ-relevant guidance on AI adoption in accounting practice." },
    { title: "CA ANZ Learning & Events", url: "https://www.charteredaccountantsanz.com/learning-and-events", platform: "Chartered Accountants ANZ",
      why: "NZ-specific CPD on AI in finance from the local professional body." },
  ];
  const admin: AwResource[] = [
    { title: "Microsoft Copilot adoption training", url: "https://adoption.microsoft.com/copilot/", platform: "Microsoft",
      why: "Free official training for Copilot in Word, Excel, Outlook, and Teams. The tools changing your daily work." },
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "Builds the cross-tool AI fluency that protects coordinator and operations roles." },
    { title: "LinkedIn Learning: AI for Administrative Professionals", url: "https://www.linkedin.com/learning/search?keywords=AI%20administrative", platform: "LinkedIn Learning",
      why: "Practical playbooks for the exact admin tasks agents are absorbing right now." },
  ];
  const legal: AwResource[] = [
    { title: "Law Society NZ AI resources", url: "https://www.lawsociety.org.nz/", platform: "Law Society NZ",
      why: "NZ-specific guidance on AI in legal practice and compliance." },
    { title: "Harvey AI overview on YouTube", url: "https://www.youtube.com/results?search_query=Harvey+AI+legal+assistant+overview", platform: "YouTube",
      why: "Understand what the AI tool reshaping legal work actually does." },
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "Foundational AI fluency now expected of paralegals and junior solicitors." },
  ];
  const tech: AwResource[] = [
    { title: "Anthropic Claude Skills documentation", url: "https://docs.anthropic.com/", platform: "Anthropic",
      why: "How to build and ship agent workflows that absorb the work juniors used to do." },
    { title: "Cursor AI editor", url: "https://www.cursor.com/", platform: "Cursor",
      why: "The AI-native code editor that has become baseline tooling in NZ tech teams." },
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "Solid grounding in AI fundamentals every engineer is expected to have." },
  ];
  const generic: AwResource[] = [
    { title: "Google's AI Essentials on Coursera", url: "https://www.coursera.org/learn/google-ai-essentials", platform: "Coursera",
      why: "Practical AI fluency that applies to almost any knowledge-work role." },
    { title: "Microsoft Copilot adoption training", url: "https://adoption.microsoft.com/copilot/", platform: "Microsoft",
      why: "Free official training for the AI tools showing up in NZ workplaces first." },
    { title: "The AI Advantage on Skool", url: "https://www.skool.com/the-ai-advantage", platform: "Skool",
      why: "Active community sharing real workflows used by professionals adapting now." },
  ];

  if (/seo|search engine/.test(occ)) return seo;
  if (/market|content|brand|advertis|copywrit/.test(occ) || /marketing|advertis/.test(ind)) return marketing;
  if (/account|finance|book|tax|audit|payroll/.test(occ) || /finance|account/.test(ind)) return finance;
  if (/admin|coordinator|assistant|operation|reception|secretar|clerk/.test(occ)) return admin;
  if (/legal|paralegal|lawyer|solicitor/.test(occ) || /legal/.test(ind)) return legal;
  if (/develop|engineer|software|programm|data|analyst|tech/.test(occ) || /tech/.test(ind)) return tech;
  return generic;
}

type AwPack = {
  youtube?: Array<{ title?: string; url?: string; why?: string }>;
  courses?: Array<{ title?: string; url?: string; why?: string; platform?: string }>;
  nz_specific?: Array<{ title?: string; url?: string; why?: string; platform?: string }>;
};

// Pick the top 3 resources from the curated pack (NZ-specific first, then
// courses, then YouTube). Falls back to occupation-based defaults if the
// pack is null/empty.
function pickResources(pack: AwPack | null | undefined, occupation: string, industry: string): AwResource[] {
  const out: AwResource[] = [];
  const push = (r: { title?: string; url?: string; why?: string; platform?: string }, defaultPlatform: string) => {
    if (!r?.title || !r?.url) return;
    if (out.length >= 3) return;
    out.push({
      title: String(r.title).trim(),
      url: String(r.url).trim(),
      why: String(r.why ?? "").trim(),
      platform: String(r.platform ?? defaultPlatform).trim(),
    });
  };
  for (const r of pack?.nz_specific ?? []) push(r, "NZ resource");
  for (const r of pack?.courses ?? [])     push(r, "Course");
  for (const r of pack?.youtube ?? [])     push(r, "YouTube");
  if (out.length >= 3) return out.slice(0, 3);
  // Fill remaining slots from fallbacks.
  const fb = fallbackResources(occupation, industry);
  for (const r of fb) {
    if (out.length >= 3) break;
    if (!out.some(x => x.url === r.url)) out.push(r);
  }
  return out.slice(0, 3);
}

function buildAgentWatchHtml(opts: {
  occupation: string;
  score: number;
  riskBand: string;
  nzRegion?: string;
  agentReality?: string;
  nzSignal?: string;
  yourMove?: string;
  lockedContent?: string;
  resources?: AwResource[];
}): string {
  const { occupation, score, riskBand } = opts;
  const region = opts.nzRegion && opts.nzRegion.trim() ? opts.nzRegion : "New Zealand";
  const para = (s?: string) => s && s.trim()
    ? `<p style="margin:0;font-size:14px;line-height:1.7;color:#333;">${h(s)}</p>`
    : `<p style="margin:0;font-size:14px;line-height:1.7;color:#9ca3af;">Not available.</p>`;

  const resources = opts.resources ?? [];
  const resourcesHtml = resources.length
    ? resources.map((r) => `
        <div style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          <a href="${h(r.url)}" style="color:${teal};text-decoration:none;font-weight:600;">${h(r.title)}</a>
          <p style="margin:4px 0 2px;font-size:14px;line-height:1.6;color:#333;">${h(r.why)}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">Platform: ${h(r.platform)}</p>
        </div>`).join("")
    : `<p style="margin:0;font-size:14px;line-height:1.7;color:#9ca3af;">Resources not available.</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Agent Watch report</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">Here is what autonomous AI is doing in your ${h(occupation)} role right now.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <tr><td style="padding:28px 32px 8px;">
      <div style="font-size:22px;font-weight:800;color:${dark};letter-spacing:-0.01em;">Humanise</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">
        <a href="https://humanise.nz" style="color:#9ca3af;text-decoration:none;">humanise.nz</a>
      </div>
    </td></tr>
    <tr><td style="padding:8px 32px 0;">
      <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#333;">
        You scored your role on Humanise and asked what AI agents are actually doing in
        ${h(occupation)} positions in New Zealand right now.
      </p>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#333;">
        Here is your full Agent Watch report.
      </p>
    </td></tr>
    <tr><td style="padding:4px 32px 24px;">
      ${sectionLabel("What agents are doing in your role")}
      ${para(opts.agentReality)}

      ${sectionLabel("NZ signal")}
      ${para(opts.nzSignal)}

      ${sectionLabel("Your move")}
      ${para(opts.yourMove)}

      ${sectionLabel("The full picture")}
      ${para(opts.lockedContent)}

      ${sectionLabel("Where to start")}
      ${resourcesHtml}

      <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">
        Your Humanise score: <strong style="color:${dark};">${h(score)}% (${h(riskBand)})</strong>
        for ${h(occupation)} in ${h(region)}.
      </p>

      <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:20px;font-size:14px;line-height:1.7;color:${dark};">
        <p style="margin:0 0 12px;font-weight:600;">One honest thing before you go.</p>
        <p style="margin:0;">
          The people navigating this well are not the most experienced people in their function.
          They are the ones who got specific about what AI can and cannot do in their role,
          and built one workflow deliberately.
        </p>
        <p style="margin:12px 0 0;">
          Your Agent Watch report is the starting point. The next step is yours.
        </p>
        <p style="margin:18px 0 0;">
          Hillary<br>
          <span style="color:#6b7280;font-size:13px;">Founder, Humanise</span><br>
          <a href="https://humanise.nz" style="color:${teal};text-decoration:none;">humanise.nz</a>
        </p>
      </div>

      <div style="margin-top:24px;padding:14px 16px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#374151;line-height:1.6;">
        <strong>PS:</strong> Know someone in a similar role who should see their score?
        Send them <a href="https://humanise.nz" style="color:${teal};text-decoration:none;">humanise.nz</a>.
      </div>
    </td></tr>

    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;">
        You received this because you entered your email on Humanise to unlock your Agent Watch report.<br>
        humanise.nz · Made in New Zealand
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}

function buildAgentWatchText(opts: {
  occupation: string;
  score: number;
  riskBand: string;
  nzRegion?: string;
  agentReality?: string;
  nzSignal?: string;
  yourMove?: string;
  lockedContent?: string;
  resources?: AwResource[];
}): string {
  const region = opts.nzRegion && opts.nzRegion.trim() ? opts.nzRegion : "New Zealand";
  const v = (s?: string) => (s && s.trim()) ? s.trim() : "Not available.";
  const resLines = (opts.resources ?? []).flatMap((r) => [
    `- ${r.title} (${r.url})`,
    `  ${r.why}`,
    `  Platform: ${r.platform}`,
    "",
  ]);
  return [
    `Your Agent Watch report: ${opts.occupation}`,
    "---",
    "WHAT AGENTS ARE DOING IN YOUR ROLE",
    v(opts.agentReality),
    "",
    "NZ SIGNAL",
    v(opts.nzSignal),
    "",
    "YOUR MOVE",
    v(opts.yourMove),
    "",
    "THE FULL PICTURE",
    v(opts.lockedContent),
    "",
    "WHERE TO START",
    ...(resLines.length ? resLines : ["Resources not available.", ""]),
    "---",
    `Your Humanise score: ${opts.score}% (${opts.riskBand}) for ${opts.occupation} in ${region}.`,
    "",
    "The people navigating this well are not the most experienced people in their function. They are the ones who got specific about what AI can and cannot do in their role, and built one workflow deliberately.",
    "",
    "Hillary",
    "Founder, Humanise",
    "humanise.nz",
    "",
    "PS: Know someone in a similar role who should see their score? Send them humanise.nz",
  ].join("\n");
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
      emailType,
      email, to, jobTitle, matchedTitle, score, riskBand = "Moderate", industry,
      honestPicture, nzMarketSignalMsg, nzMarketSignalSrc,
      mbieGroup, mbieAnnualChange, mbieRegion, mbieRegionalChange,
      statsnzThousands, statsnzShare, tasksAtRisk, protectiveSkills,
      html: prebuiltHtml, subject: prebuiltSubject,
      // Agent Watch fields
      occupation, agentReality, nzSignal, yourMove, lockedContent, nzRegion,
    } = body ?? {};

    const emailStr = typeof (email ?? to) === "string" ? String(email ?? to).trim() : "";
    const scoreNum = typeof score === "number" ? score : Number(score);

    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr) || emailStr.length > 254) {
      return new Response(JSON.stringify({ error: "A valid email is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return new Response(JSON.stringify({ error: "A valid score is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const finalScore = Math.round(scoreNum);
    const bandStr = typeof riskBand === "string" ? riskBand : "Moderate";

    let html: string;
    let subject: string;
    let textBody: string;

    if (emailType === "agent_watch_unlock") {
      const occ = typeof occupation === "string" && occupation.trim()
        ? occupation.trim()
        : (typeof matchedTitle === "string" && matchedTitle.trim()
            ? matchedTitle.trim()
            : (typeof jobTitle === "string" ? jobTitle.trim() : "your role"));
      const region = typeof nzRegion === "string" ? nzRegion : "";
      const awOpts = {
        occupation: occ,
        score: finalScore,
        riskBand: bandStr,
        nzRegion: region,
        agentReality: typeof agentReality === "string" ? agentReality : "",
        nzSignal: typeof nzSignal === "string" ? nzSignal : "",
        yourMove: typeof yourMove === "string" ? yourMove : "",
        lockedContent: typeof lockedContent === "string" ? lockedContent : "",
      };
      html = buildAgentWatchHtml(awOpts);
      textBody = buildAgentWatchText(awOpts);
      subject = typeof prebuiltSubject === "string" && prebuiltSubject
        ? prebuiltSubject
        : `Your Agent Watch report: ${occ}`;
    } else {
      const jobStr = typeof jobTitle === "string" ? jobTitle.trim() : "";
      if (!jobStr || jobStr.length > 200) {
        return new Response(JSON.stringify({ error: "A job title is required." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      html = typeof prebuiltHtml === "string" && prebuiltHtml
        ? prebuiltHtml
        : buildHtml({
            jobTitle: jobStr,
            matchedTitle: typeof matchedTitle === "string" ? matchedTitle : null,
            score: finalScore,
            riskBand: bandStr,
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
      subject = typeof prebuiltSubject === "string" && prebuiltSubject
        ? prebuiltSubject
        : `Your Humanise result: ${finalScore}% ${bandStr} Risk`;
      textBody = `Humanise — ${finalScore}% ${bandStr} Risk\nFor: ${jobStr}`;
    }

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hillary at Humanise <hillary@humanise.nz>",
        reply_to: "hillary@humanise.nz",
        to: [emailStr],
        subject,
        html,
        text: textBody,
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
