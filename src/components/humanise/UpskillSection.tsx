import { useState } from "react";
import { ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AnzscoGroupData } from "@/lib/nzWorkforceUtils";

// ── Types ─────────────────────────────────────────────────────────────

type UpskillResource = { title: string; url: string; why: string };
type UpskillCourse   = { title: string; platform: string; url: string; cost: string; time?: string; why: string };

type UpskillPack = {
  headline: string;
  youtube: UpskillResource[];
  courses: UpskillCourse[];
  nz_specific: UpskillCourse[];
  quick_wins: string[];
};

type CuratedData = Record<string, UpskillPack>;

// ── Curated industry set ──────────────────────────────────────────────

const CURATED_INDUSTRIES = new Set([
  "Finance & Accounting",
  "Healthcare",
  "Marketing & Advertising",
  "Technology",
  "Education",
]);

const CURATED_URL =
  "https://cdn.jsdelivr.net/gh/hillarymcoscar-create/humanise-data@main/upskill-pack-curated.json";

// ── Email HTML builder ────────────────────────────────────────────────

const _esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const _teal = "#00B5A4";
const _dark = "#1a1a2e";

const _emailSection = (text: string) =>
  `<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
     color:${_teal};padding-top:24px;padding-bottom:8px;border-top:1px solid #e5e7eb;">${text}</div>`;

function _bandColour(score: number): string {
  if (score < 30) return "#16a34a";
  if (score < 50) return "#d97706";
  if (score < 70) return "#ea580c";
  return "#dc2626";
}

function _pctLabel(pct: number): string {
  if (pct === 0) return "were flat";
  const abs = Math.abs(pct).toString().replace(/\.0$/, "");
  return pct > 0 ? `grew ${abs}%` : `fell ${abs}%`;
}

type _Community = { name: string; platform: string; url: string; description: string };
const _COMMUNITIES: Record<string, _Community[]> = {
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
  "Healthcare": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "General AI upskilling community with a growing healthcare cohort" },
  ],
  "Technology": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI and software development — active threads on tools, careers" },
    { name: "The AI Advantage", platform: "Skool", url: "https://www.skool.com/the-ai-advantage",
      description: "Practical AI for technical professionals — daily activity" },
  ],
  "Education": [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "Educators using AI for content, lesson planning, and professional development" },
  ],
};
function _getCommunities(industry: string): _Community[] {
  return _COMMUNITIES[industry] ?? [
    { name: "School of AI", platform: "Skool", url: "https://www.skool.com/school-of-ai",
      description: "AI upskilling community open to all workers — free to join" },
  ];
}

function buildEmailHtml(opts: {
  jobTitle: string; matchedTitle?: string | null; industry: string;
  score: number; riskBand: string;
  honestPicture?: string; nzMarketSignalMsg?: string; nzMarketSignalSrc?: string;
  mbieGroup?: string; mbieAnnualChange?: number | null;
  mbieRegion?: string; mbieRegionalChange?: number | null;
  statsnzThousands?: number | null; statsnzShare?: number | null;
  tasksAtRisk?: string[]; protectiveSkills?: string[];
  pack?: UpskillPack | null;
}): string {
  const { jobTitle, matchedTitle, industry, score, riskBand, pack } = opts;
  const colour = _bandColour(score);
  const displayRole = _esc(matchedTitle ?? jobTitle);

  const scoreCard = `
    <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;
      padding:20px 24px;text-align:center;margin:20px 0 4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
        color:#888;margin-bottom:8px;">Your automation risk score</div>
      <div style="font-size:54px;font-weight:800;line-height:1;color:${colour};">${score}%</div>
      <div style="font-size:15px;font-weight:600;margin-top:6px;color:${colour};">${_esc(riskBand)} Risk</div>
    </div>`;

  const honestSection = opts.honestPicture ? `
    ${_emailSection("Your honest picture")}
    <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">${_esc(opts.honestPicture)}</p>` : "";

  const marketSection = opts.nzMarketSignalMsg ? `
    ${_emailSection("NZ market signal")}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#333;">${_esc(opts.nzMarketSignalMsg)}</p>
    ${opts.nzMarketSignalSrc
      ? `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Source: ${_esc(opts.nzMarketSignalSrc)}</p>`
      : ""}` : "";

  let workforceHtml = "";
  if (opts.mbieGroup && typeof opts.mbieAnnualChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      Job ads for ${_esc(opts.mbieGroup.toLowerCase())} ${_pctLabel(opts.mbieAnnualChange)}
      in the past year (MBIE Jobs Online, Dec 2025)</p>`;
  }
  if (opts.mbieRegion && typeof opts.mbieRegionalChange === "number") {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      In ${_esc(opts.mbieRegion)}, job ads ${_pctLabel(opts.mbieRegionalChange)} annually</p>`;
  }
  if (opts.mbieGroup && opts.statsnzThousands && opts.statsnzShare) {
    workforceHtml += `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#333;">
      There are approximately ${opts.statsnzThousands}k ${_esc(opts.mbieGroup.toLowerCase())} workers
      in NZ — ${opts.statsnzShare}% of the workforce (Stats NZ HLFS Dec 2025)</p>`;
  }
  const workforceSection = workforceHtml
    ? `${_emailSection("NZ workforce data")}${workforceHtml}` : "";

  const tasksSection = opts.tasksAtRisk?.length ? `
    ${_emailSection("Your top 3 tasks at risk")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${opts.tasksAtRisk.map((t) => `<li>${_esc(t)}</li>`).join("")}
    </ul>` : "";

  const skills = opts.protectiveSkills ?? [];
  const skillsSection = skills.length ? `
    ${_emailSection("Your top 3 protective skills")}
    <ul style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.9;">
      ${skills.map((s) => `<li>${_esc(s)}</li>`).join("")}
    </ul>` : "";

  const upskillSection = skills.length ? `
    ${_emailSection("Ready to upskill? — LinkedIn Learning")}
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.9;">
      ${skills.map((s) =>
        `<li><a href="https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(s)}"
          style="color:${_teal};text-decoration:none;">${_esc(s)}</a></li>`
      ).join("")}
    </ul>` : "";

  let packSection = "";
  if (pack) {
    const elink = (url: string, title: string) =>
      `<a href="${_esc(url)}" style="color:${_teal};text-decoration:none;">${_esc(title)}</a>`;
    const resourceRow = (r: UpskillResource) => `
      <div style="margin-bottom:10px;padding:10px 12px;background:#f0fdfa;border-radius:8px;font-size:13px;">
        <div style="font-weight:600;margin-bottom:3px;">${elink(r.url, r.title)}</div>
        <div style="color:#555;">${_esc(r.why)}</div>
      </div>`;
    const courseRow = (c: UpskillCourse) => `
      <div style="margin-bottom:10px;padding:10px 12px;background:#f0fdfa;border-radius:8px;font-size:13px;">
        <div style="font-weight:600;margin-bottom:3px;">${elink(c.url, c.title)}</div>
        <div style="color:#888;font-size:11px;margin-bottom:3px;">
          ${_esc(c.platform)}${c.cost ? ` · ${_esc(c.cost)}` : ""}${c.time ? ` · ${_esc(c.time)}` : ""}
        </div>
        <div style="color:#555;">${_esc(c.why)}</div>
      </div>`;
    if (pack.headline) {
      packSection += `<p style="font-size:13px;font-style:italic;color:#555;margin:16px 0 8px;">${_esc(pack.headline)}</p>`;
    }
    if (pack.youtube?.length) {
      packSection += `${_emailSection("Understand AI — YouTube")}${pack.youtube.map(resourceRow).join("")}`;
    }
    if (pack.courses?.length) {
      packSection += `${_emailSection("Use AI now — Courses")}${pack.courses.map(courseRow).join("")}`;
    }
    if (pack.nz_specific?.length) {
      packSection += `${_emailSection("NZ-specific resources")}${pack.nz_specific.map(courseRow).join("")}`;
    }
    if (pack.quick_wins?.length) {
      packSection += `${_emailSection("Quick wins this week")}
        <ol style="margin:0;padding:0 0 0 18px;color:#333;font-size:14px;line-height:1.8;">
          ${pack.quick_wins.map((w) => `<li>${_esc(w)}</li>`).join("")}
        </ol>`;
    }
  }

  const communities = _getCommunities(industry);
  const communitySection = `
    ${_emailSection("Join the conversation")}
    <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
      Free communities where NZ workers are figuring out AI together</p>
    ${communities.map((c) => `
      <div style="margin-bottom:10px;font-size:14px;line-height:1.6;">
        <a href="${_esc(c.url)}" style="color:${_teal};text-decoration:none;font-weight:600;">
          ${_esc(c.name)}</a>
        <span style="color:#6b7280;font-size:12px;"> (${_esc(c.platform)})</span>
        — ${_esc(c.description)}
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
    <tr><td style="background:${_dark};padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">Humanise</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">
        humanise.nz — your AI automation risk result</div>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        For: <strong style="color:${_dark};">${displayRole}</strong>
        ${matchedTitle && matchedTitle !== jobTitle ? ` · matched to ${_esc(matchedTitle)}` : ""}
        ${industry ? ` · ${_esc(industry)}` : ""}
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
      ${packSection}
      ${communitySection}
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;
        font-size:14px;color:${_dark};line-height:1.7;">
        Good luck. The workers who adapt fastest will be fine.<br><br>
        <strong>Hillary Woods</strong><br>
        Founder, Humanise<br>
        <a href="https://humanise.nz" style="color:${_teal};text-decoration:none;">humanise.nz</a>
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

// ── Sub-components ────────────────────────────────────────────────────

const ResourceLink = ({ title, url }: { title: string; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
  >
    <ExternalLink className="h-3 w-3 shrink-0" />
    {title}
  </a>
);

const PackDisplay = ({ pack, industry }: { pack: UpskillPack; industry: string }) => (
  <div className="mt-5 space-y-5 border-t border-border pt-5">
    <p className="text-sm leading-relaxed text-muted-foreground">{pack.headline}</p>

    {pack.youtube?.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
          YouTube channels to follow
        </p>
        <ul className="space-y-2">
          {pack.youtube.map((r, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <ResourceLink title={r.title} url={r.url} />
              <span className="text-xs text-muted-foreground pl-4">{r.why}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {pack.courses?.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
          Courses
        </p>
        <ul className="space-y-2">
          {pack.courses.map((c, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <ResourceLink title={c.title} url={c.url} />
                <span className="text-[11px] text-muted-foreground">{c.platform} · {c.cost}{c.time ? ` · ${c.time}` : ""}</span>
              </div>
              <span className="text-xs text-muted-foreground pl-4">{c.why}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {pack.nz_specific?.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
          NZ-specific resources
        </p>
        <ul className="space-y-2">
          {pack.nz_specific.map((r, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <ResourceLink title={r.title} url={r.url} />
                <span className="text-[11px] text-muted-foreground">{r.platform} · {r.cost}</span>
              </div>
              <span className="text-xs text-muted-foreground pl-4">{r.why}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {pack.quick_wins?.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
          Quick wins this week
        </p>
        <ul className="space-y-1.5">
          {pack.quick_wins.map((w, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────

type Props = {
  skills: string[];
  industry: string;
  jobTitle: string;
  matchedTitle?: string | null;
  score: number;
  riskBand?: string;
  honestPicture?: string;
  nzMarketSignalMsg?: string;
  nzMarketSignalSrc?: string;
  nzData?: AnzscoGroupData | null;
  tasksAtRisk?: string[];
  region?: string;
  onEmailCaptured?: (email: string) => void;
};

export const UpskillSection = ({
  skills, industry, jobTitle, matchedTitle, score, riskBand,
  honestPicture, nzMarketSignalMsg, nzMarketSignalSrc, nzData,
  tasksAtRisk, region, onEmailCaptured,
}: Props) => {
  const [modalOpen, setModalOpen]     = useState(false);
  const [email, setEmail]             = useState("");
  const [submitting, setSubmitting]   = useState(false);

  if (!skills.length) return null;

  const displayIndustry = industry || "your industry";
  const isCurated = CURATED_INDUSTRIES.has(industry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);

    // Fire-and-forget: send the score + Career Insight email too
    onEmailCaptured?.(email.trim());

    try {
      let pack: UpskillPack | null = null;

      if (isCurated) {
        // Fetch curated pack from CDN
        const resp = await fetch(`${CURATED_URL}?t=${Date.now()}`);
        if (resp.ok) {
          const data: CuratedData & { _note?: string } = await resp.json();
          pack = data[industry] ?? null;
        }
      }

      if (!pack) {
        // Fall back to Claude-generated pack via Edge Function
        const { data, error } = await supabase.functions.invoke("upskill-pack", {
          body: { jobTitle, industry, score },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        pack = data as UpskillPack;
      }

      setModalOpen(false);

      // Fire-and-forget: send email without blocking the UI
      const emailSubject = `Your Humanise result — ${jobTitle} · ${score}% ${riskBand ?? ""}`.trim();
      const emailHtml = buildEmailHtml({
        jobTitle, matchedTitle: matchedTitle ?? null, industry,
        score, riskBand: riskBand ?? "Moderate",
        honestPicture: honestPicture ?? "",
        nzMarketSignalMsg: nzMarketSignalMsg ?? "",
        nzMarketSignalSrc: nzMarketSignalSrc ?? "",
        mbieGroup: nzData?.group ?? "",
        mbieAnnualChange: nzData?.annual_change_pct ?? null,
        mbieRegion: region ?? "",
        mbieRegionalChange: nzData?.regional_change ?? null,
        statsnzThousands: nzData?.employed_thousands ?? null,
        statsnzShare: nzData?.nz_workforce_share_pct ?? null,
        tasksAtRisk: tasksAtRisk ?? [],
        protectiveSkills: skills,
        pack,
      });
      supabase.functions
        .invoke("send-email", {
          body: { to: email.trim(), subject: emailSubject, html: emailHtml, jobTitle, industry, riskScore: score },
        })
        .catch((err) => console.warn("send-email failed silently:", err));

      const successMsg = isCurated
        ? `Check your inbox — your ${displayIndustry} upskill pack is on its way.`
        : `Check your inbox — your personalised upskill pack is on its way.`;
      toast.success(successMsg);
    } catch {
      toast.error("Couldn't load your upskill pack right now. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold text-primary text-center">Ready to Upskill?</h2>

      {/* Free tier */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold text-primary">Your 3 protective skills to build</h3>

        <ul className="mt-4 divide-y divide-border">
          {skills.map((skill, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-primary">{skill}</p>
              <div className="mt-1.5">
                <a
                  href={`https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(skill)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn Learning
                </a>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">Free and paid options available</p>

        {/* Email CTA */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-border pt-5">
          <p className="text-sm font-medium text-primary flex-1">
            Get your personalised {displayIndustry} upskill pack — free
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 shrink-0"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Email me the pack
          </Button>
        </div>


      </div>

      {/* Paid tier */}
      <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-semibold text-primary">Want a deeper dive?</h3>
          <span className="shrink-0 inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            $29 NZD — one time
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Get a full AI-resilience audit for your role — specific to NZ.
        </p>
        <Button
          onClick={() =>
            toast.success("Action plan — coming soon", {
              description: "We'll wire up email capture next.",
            })
          }
          className="mt-5 w-full rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95"
        >
          Get my full action plan
        </Button>
      </div>

      {/* Email gate modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your free {displayIndustry} upskill pack</DialogTitle>
            <DialogDescription>
              {isCurated
                ? `We'll send you the best courses, YouTube resources and NZ-specific tools for ${displayIndustry} workers — curated, not generated.`
                : `We'll generate a personalised upskill plan for ${jobTitle} workers in ${displayIndustry} in New Zealand — specific resources, not generic advice.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <Input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="h-12 rounded-xl"
            />
            <Button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
                  Generating your pack…
                </span>
              ) : (
                "Send me the pack"
              )}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
