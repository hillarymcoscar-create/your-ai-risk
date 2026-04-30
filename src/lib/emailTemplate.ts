// ── Types ─────────────────────────────────────────────────────────────

export type EmailResource = { title: string; url: string; why?: string };
export type EmailCourse   = {
  title: string; platform: string; url: string;
  cost: string; time?: string; why?: string;
};
export type EmailPack = {
  headline?: string;
  youtube?:    EmailResource[];
  courses?:    EmailCourse[];
  skillshare?: EmailResource;
  nz_specific?: EmailCourse[];
  quick_wins?: string[];
};

// ── Constants ─────────────────────────────────────────────────────────

export const CURATED_INDUSTRIES = new Set([
  "Finance & Accounting",
  "Healthcare",
  "Marketing & Advertising",
  "Technology",
  "Education",
]);

export const CURATED_URL =
  "https://cdn.jsdelivr.net/gh/hillarymcoscar-create/humanise-data@main/upskill-pack-curated.json";

// ── Private helpers ───────────────────────────────────────────────────

const TEAL = "#00B5A4";
const DARK = "#1a1a2e";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const elink = (url: string, label: string) =>
  `<a href="${esc(url)}" style="color:${TEAL};text-decoration:none;">${esc(label)}</a>`;

const sec = (label: string) =>
  `<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
     color:${TEAL};padding-top:24px;padding-bottom:8px;border-top:1px solid #e5e7eb;">${label}</div>`;

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

// ── Community mapping (one best-fit Skool community per industry) ──────

type Community = { name: string; url: string; description: string };

const COMMUNITIES: Record<string, Community> = {
  "Finance & Accounting": {
    name: "School of AI",
    url: "https://www.skool.com/school-of-ai",
    description: "AI for finance and business professionals — active community, free to join",
  },
  "Marketing & Advertising": {
    name: "The AI Advantage",
    url: "https://www.skool.com/the-ai-advantage",
    description: "Practical AI for marketers — workflows, tool reviews, peer discussion",
  },
  "Healthcare": {
    name: "School of AI",
    url: "https://www.skool.com/school-of-ai",
    description: "General AI upskilling community with a growing healthcare cohort",
  },
  "Technology": {
    name: "School of AI",
    url: "https://www.skool.com/school-of-ai",
    description: "AI and software development — active threads on tools and careers",
  },
  "Education": {
    name: "School of AI",
    url: "https://www.skool.com/school-of-ai",
    description: "Educators using AI for content, lesson planning, and professional development",
  },
};

function getCommunity(industry: string): Community {
  return COMMUNITIES[industry] ?? {
    name: "School of AI",
    url: "https://www.skool.com/school-of-ai",
    description: "AI upskilling community open to all workers — free to join",
  };
}

// ── Main builder ──────────────────────────────────────────────────────

export interface BuildEmailOpts {
  jobTitle: string;
  matchedTitle?: string | null;
  industry: string;
  riskScore: number;
  riskBand: string;
  honestPicture?: string;
  nzMarketSignal?: string;
  nzMarketSignalSource?: string;
  mbieGroup?: string;
  mbieAnnualChange?: number | null;
  mbieRegion?: string;
  mbieRegionalChange?: number | null;
  statsnzThousands?: number | null;
  statsnzShare?: number | null;
  tasksAtRisk?: string[];
  protectiveSkills?: string[];
  pack?: EmailPack | null;
}

export function buildEmailHtml(opts: BuildEmailOpts): string {
  const {
    jobTitle, matchedTitle, industry, riskScore, riskBand,
    honestPicture, nzMarketSignal, nzMarketSignalSource,
    mbieGroup, mbieAnnualChange, mbieRegion, mbieRegionalChange,
    statsnzThousands, statsnzShare,
    tasksAtRisk = [], protectiveSkills = [],
    pack,
  } = opts;

  const colour      = bandColour(riskScore);
  const displayRole = esc(matchedTitle ?? jobTitle);

  // ── 2. Risk score card ───────────────────────────────────────────────
  const scoreCard = `
    <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;
      padding:20px 24px;text-align:center;margin:20px 0 4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
        color:#888;margin-bottom:8px;">Your automation risk score</div>
      <div style="font-size:54px;font-weight:800;line-height:1;color:${colour};">${riskScore}%</div>
      <div style="font-size:15px;font-weight:600;margin-top:6px;color:${colour};">${esc(riskBand)} Risk</div>
    </div>`;

  // ── 3. Your honest picture ───────────────────────────────────────────
  const honestSection = honestPicture ? `
    ${sec("Your honest picture")}
    <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">${esc(honestPicture)}</p>` : "";

  // ── 4. NZ market signal ──────────────────────────────────────────────
  const marketSection = nzMarketSignal ? `
    ${sec("NZ market signal")}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#333;">${esc(nzMarketSignal)}</p>
    ${nzMarketSignalSource
      ? `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Source: ${esc(nzMarketSignalSource)}</p>`
      : ""}` : "";

  // ── 5. NZ workforce data ─────────────────────────────────────────────
  let workforceHtml = "";
  if (mbieGroup && typeof mbieAnnualChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      Job ads for ${esc(mbieGroup.toLowerCase())} ${pctLabel(mbieAnnualChange)}
      in the past year (MBIE Jobs Online, Dec 2025)</p>`;
  }
  if (mbieRegion && typeof mbieRegionalChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      In ${esc(mbieRegion)}, job ads ${pctLabel(mbieRegionalChange)} annually</p>`;
  }
  if (mbieGroup && statsnzThousands && statsnzShare) {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      There are approximately ${statsnzThousands}k ${esc(mbieGroup.toLowerCase())} workers
      in NZ — ${statsnzShare}% of the workforce (Stats NZ HLFS Dec 2025)</p>`;
  }
  const workforceSection = workforceHtml
    ? `${sec("NZ workforce data")}${workforceHtml}` : "";

  // ── 6. Tasks at risk ─────────────────────────────────────────────────
  const tasksSection = tasksAtRisk.length ? `
    ${sec("Your top 3 tasks at risk")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${tasksAtRisk.map((t) => `<li>${esc(t)}</li>`).join("")}
    </ul>` : "";

  // ── 7. Protective skills ─────────────────────────────────────────────
  const skillsSection = protectiveSkills.length ? `
    ${sec("Your top 3 protective skills")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${protectiveSkills.map((s) => `<li>${esc(s)}</li>`).join("")}
    </ul>` : "";

  // ── 8. Ready to upskill ──────────────────────────────────────────────
  const community = getCommunity(industry);
  let upskillRows = "";

  if (pack?.youtube?.[0]) {
    const yt = pack.youtube[0];
    upskillRows += `
      <div style="margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
          color:#9ca3af;margin-bottom:4px;">YouTube</div>
        <div style="font-size:14px;line-height:1.6;">
          ${elink(yt.url, yt.title)}
          ${yt.why ? `<span style="color:#6b7280;"> — ${esc(yt.why)}</span>` : ""}
        </div>
      </div>`;
  }

  upskillRows += `
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
        color:#9ca3af;margin-bottom:4px;">Community (Skool — free)</div>
      <div style="font-size:14px;line-height:1.6;">
        ${elink(community.url, community.name)}
        <span style="color:#6b7280;"> — ${esc(community.description)}</span>
      </div>
    </div>`;

  const topCourses = pack?.courses?.slice(0, 2) ?? [];
  if (topCourses.length) {
    upskillRows += `<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
      color:#9ca3af;margin-bottom:8px;">Courses</div>`;
    topCourses.forEach((c) => {
      upskillRows += `
        <div style="margin-bottom:10px;font-size:14px;line-height:1.6;">
          ${elink(c.url, c.title)}
          <span style="color:#6b7280;font-size:12px;"> ${esc(c.platform)}${c.cost ? ` · ${esc(c.cost)}` : ""}${c.time ? ` · ${esc(c.time)}` : ""}</span>
        </div>`;
    });
  } else if (protectiveSkills.length) {
    upskillRows += `<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
      color:#9ca3af;margin-bottom:8px;">LinkedIn Learning</div>`;
    protectiveSkills.forEach((s) => {
      upskillRows += `
        <div style="margin-bottom:8px;font-size:14px;">
          ${elink(`https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(s)}`, s)}
        </div>`;
    });
  }

  const upskillSection = `${sec("Ready to upskill")}${upskillRows}`;

  // ── Assemble ──────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Humanise — your AI automation risk result</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;
    overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

    <!-- 1. Header -->
    <tr><td style="background:${DARK};padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">Humanise</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">
        humanise.nz — your AI automation risk result</div>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        For: <strong style="color:${DARK};">${displayRole}</strong>
        ${matchedTitle && matchedTitle !== jobTitle ? ` · matched to ${esc(matchedTitle)}` : ""}
        ${industry ? ` · ${esc(industry)}` : ""}
      </p>
    </td></tr>

    <!-- 2–8. Body -->
    <tr><td style="padding:4px 32px 32px;">
      ${scoreCard}
      ${honestSection}
      ${marketSection}
      ${workforceSection}
      ${tasksSection}
      ${skillsSection}
      ${upskillSection}

      <!-- 9. Footer -->
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;
        font-size:14px;color:${DARK};line-height:1.7;">
        <strong>Hillary Woods</strong>, Founder —
        <a href="https://humanise.nz" style="color:${TEAL};text-decoration:none;">humanise.nz</a>
      </div>
    </td></tr>

    <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        You're receiving this because you requested your result at humanise.nz.</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}
