import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Logo } from "@/components/humanise/Logo";
import { RiskGauge } from "@/components/humanise/RiskGauge";
import { HonestPicture } from "@/components/humanise/HonestPicture";
import { NzMarketSignal } from "@/components/humanise/NzMarketSignal";
import { NzWorkforceData } from "@/components/humanise/NzWorkforceData";
import { UpskillSection } from "@/components/humanise/UpskillSection";
import { AlertTriangle, Shield, BarChart3, Mail, LineChart, Share2, RotateCcw, Lock } from "lucide-react";
import {
  applyAgentExposure,
  applyUplift,
  bandFromScore,
  calculateRisk,
  computeModifiers,
  industryComparison,
  protectiveSkills,
  riskSummary,
  tasksAtRisk,
  type AgentTier,
  type QuizAnswers,
  type RiskBandLabel,
} from "@/lib/humanise";
import { useOccupations, useAliases, findBestMatch, findByAlias, percentile, type Occupation } from "@/lib/onet";
import { getAnzscoGroupData } from "@/lib/nzWorkforceUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildEmailHtml, CURATED_INDUSTRIES, CURATED_URL, type EmailPack } from "@/lib/emailTemplate";

type Props = {
  answers: QuizAnswers;
  onRestart: () => void;
};

type Band = RiskBandLabel;

// Modifier weights live in src/lib/humanise.ts (see computeModifiers).

// Trailing words that indicate a sentence was cut off mid-thought
const TRAILING_STOPWORDS = new Set([
  "and", "or", "the", "a", "an", "of", "to", "for", "in", "on", "at",
  "by", "with", "from", "into", "as", "is", "are", "was", "were", "be",
  "but", "if", "than", "that", "which", "who", "whom", "while", "when",
  "such", "via", "per", "about",
]);

/** Clean a task string: trim, strip trailing punctuation/conjunctions, cap at 8 words. */
function cleanTask(raw: string): string {
  if (!raw) return "";
  let s = String(raw).replace(/\s+/g, " ").trim();
  s = s.replace(/[.;,:\-–—]+$/g, "").trim();
  let words = s.split(" ").filter(Boolean);
  if (words.length > 8) words = words.slice(0, 8);
  while (words.length > 1 && TRAILING_STOPWORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  if (!words.length) return "";
  let out = words.join(" ");
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

const TASK_OVERRIDES: Record<string, { tasks_at_risk: string[]; protective_tasks: string[] }> = {
  "Maids and Housekeeping Cleaners": {
    tasks_at_risk: [
      "Routine room cleaning and tidying",
      "Linen sorting and laundry processing",
      "Inventory restocking and record keeping",
    ],
    protective_tasks: [
      "Physical cleaning requiring human presence",
      "Guest interaction and personalised service",
      "Problem-solving in varied environments",
    ],
  },
};


export const Results = ({ answers, onRestart }: Props) => {
  const occupations = useOccupations();
  const [aiTasks, setAiTasks] = useState<{ tasks_at_risk: string[]; protective_tasks: string[]; honest_picture?: string; agent_note?: string; agent_tasks?: string[]; agent_reality?: string; nz_signal?: string; your_move?: string; locked_preview?: string } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planEmail, setPlanEmail] = useState("");
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  useAliases(); // ensure aliases are loaded/cached
  const SCORE_OVERRIDES: Record<string, { risk_score: number; risk_band: string }> = {
    "19-1013.00": { risk_score: 38, risk_band: "Moderate" },
    "15-1252.00": { risk_score: 72, risk_band: "High" },
    "13-2011.00": { risk_score: 62, risk_band: "High" },
    "43-3031.00": { risk_score: 91, risk_band: "Very High" },
    "37-2012.00": { risk_score: 28, risk_band: "Low" },
  };

  let match: Occupation | null = occupations
    ? findByAlias(answers.jobTitle, occupations) ?? findBestMatch(answers.jobTitle, occupations)
    : null;

  if (match && SCORE_OVERRIDES[match.onet_code]) {
    match = { ...match, ...SCORE_OVERRIDES[match.onet_code] };
  }

  if (occupations && answers.jobTitle) {
    console.log("[Humanise] matched occupation", {
      input: answers.jobTitle,
      matchedOccupation: match,
    });
  }

  const mods = computeModifiers(answers);
  const modifier = mods.capped_total; // already clamped to ±15

  let score: number;
  let band: Band;
  let tasks: string[];
  let skills: string[];
  let comparison: string;
  let agentTier: AgentTier | null = null;

  if (match && occupations) {
    // Layer 1: O*NET base. Layer 2: knowledge-work uplift (with floor).
    const uplift = applyUplift(match.risk_score, match.title);
    answers.uplift_category = uplift.category;
    answers.uplift_applied = uplift.uplift;
    // Layer 3: agent-exposure (tier floor + modifier), applied before quiz mods.
    const agent = applyAgentExposure(uplift.adjustedBase, match.title);
    answers.agent_tier = agent.tier;
    answers.agent_exposure_modifier = agent.modifier;
    agentTier = agent.tier;
    // Layer 4: quiz modifiers.
    const raw = agent.adjustedBase + modifier;
    score = Math.max(5, Math.min(95, Math.round(raw)));
    band = bandFromScore(score);
    const override = TASK_OVERRIDES[match.title];
    if (override) {
      tasks = override.tasks_at_risk;
      skills = override.protective_tasks;
    } else {
      tasks = (match.tasks_at_risk ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
      skills = (match.protective_tasks ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
    }
    const pct = percentile(score, occupations);
    comparison = `Your role ranks in the ${pct}th percentile of 1,016 occupations analysed`;
  } else {
    // Fallback: industry-based scoring
    score = calculateRisk(answers);
    band = bandFromScore(score);
    tasks = tasksAtRisk(answers).map(cleanTask).filter(Boolean);
    skills = protectiveSkills(answers).map(cleanTask).filter(Boolean);
    comparison = industryComparison(score, answers.industry);
  }

  const summary = riskSummary(score);

  const handleShare = async () => {
    const text = `My AI automation risk score is ${score}% — find yours at Humanise.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Humanise — My risk score", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        toast.success("Result copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const nzData = getAnzscoGroupData(
    match?.onet_code,
    answers.country === "New Zealand" ? answers.region : null
  );
  const activeSkills = aiTasks?.protective_tasks?.length ? aiTasks.protective_tasks : skills;
  const activeTasks  = aiTasks?.tasks_at_risk?.length  ? aiTasks.tasks_at_risk  : tasks;

  const sendResultsEmail = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    try {
      const jobTitle   = answers.jobTitle?.trim() || "your role";
      const industry   = answers.industry;

      // Fetch curated pack (or Claude fallback) for section 8
      let pack: EmailPack | null = null;
      if (CURATED_INDUSTRIES.has(industry)) {
        const resp = await fetch(`${CURATED_URL}?t=${Date.now()}`).catch(() => null);
        if (resp?.ok) {
          const data = await resp.json().catch(() => ({}));
          pack = (data as Record<string, EmailPack>)[industry] ?? null;
        }
      }
      if (!pack) {
        const { data } = await supabase.functions.invoke("upskill-pack", {
          body: { jobTitle, industry, score },
        }).catch(() => ({ data: null }));
        pack = data as EmailPack | null;
      }

      const subject = `Your Humanise result — ${jobTitle} · ${score}% ${band}`;
      const html = buildEmailHtml({
        jobTitle,
        matchedTitle:        match?.title ?? null,
        industry,
        riskScore:           score,
        riskBand:            band,
        honestPicture:       aiTasks?.honest_picture ?? "",
        nzMarketSignal:      match?.job_market_signals?.display_message ?? "",
        nzMarketSignalSource: match?.job_market_signals?.source ?? "",
        mbieGroup:           nzData?.group ?? "",
        mbieAnnualChange:    nzData?.annual_change_pct ?? null,
        mbieRegion:          answers.region ?? "",
        mbieRegionalChange:  nzData?.regional_change ?? null,
        statsnzThousands:    nzData?.employed_thousands ?? null,
        statsnzShare:        nzData?.nz_workforce_share_pct ?? null,
        tasksAtRisk:         activeTasks,
        protectiveSkills:    activeSkills,
        pack,
      });

      const { data, error } = await supabase.functions.invoke("send-results-email", {
        body: { email: trimmed, subject, html, jobTitle, industry, score, riskBand: band },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return true;
    } catch (e) {
      console.error("send-results-email failed", e);
      return false;
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planEmail.trim()) return;
    setPlanSubmitting(true);
    const ok = await sendResultsEmail(planEmail);
    setPlanSubmitting(false);
    if (ok) {
      setPlanOpen(false);
      setPlanEmail("");
      setEmailSubmitted(true);
      toast.success("Check your inbox — your result and Career Insight are on the way.");
    } else {
      toast.error("Couldn't send the email right now. Please try again shortly.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container max-w-6xl py-6 flex items-center justify-between">
        <Logo onClick={onRestart} />
        <Button variant="ghost" size="sm" onClick={onRestart} className="text-muted-foreground">
          <RotateCcw className="mr-2 h-4 w-4" />
          Start over
        </Button>
      </header>

      <main className="container max-w-5xl pb-24">
        {answers.soft_exit_flag && <SoftExitBanner />}

        <section className="mt-6 sm:mt-10 rounded-3xl bg-hero border border-border p-8 sm:p-12 text-center shadow-card animate-scale-in">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Your automation risk score
          </p>
          <div className="mt-6 flex justify-center">
            <RiskGauge score={score} band={band} />
          </div>
          {agentTier && <AgentExposureBadge tier={agentTier} />}
          <p className="mt-8 text-xl sm:text-2xl font-medium text-primary max-w-2xl mx-auto leading-snug">
            {summary}
          </p>
          {answers.jobTitle && (
            <p className="mt-3 text-sm text-muted-foreground">
              {answers.jobTitle.trim()}
              {match ? ` · matched to ${match.title}` : ""}
              {answers.country ? ` · ${answers.region ? `${answers.region}, ` : ""}${answers.country}` : ""}
            </p>
          )}
        </section>

        <ScoreCaveat />

        <HonestPicture
          jobTitle={match?.title ?? answers.jobTitle}
          industry={answers.industry}
          score={score}
          usesAi={answers.aiUsage === "Yes, regularly" || answers.aiUsage === "Sometimes"}
          rawJobTitle={answers.jobTitle}
          band={band}
          agentTier={agentTier}
          aiTools={answers.ai_tools}
          aiRelationshipSegment={answers.segment_tag}
          region={answers.country === "New Zealand" ? answers.region : answers.country}
          onTasks={setAiTasks}
        />

        <AgentWatch
          agentTier={agentTier}
          agentReality={aiTasks?.agent_reality}
          nzSignal={aiTasks?.nz_signal}
          yourMove={aiTasks?.your_move}
          lockedPreview={aiTasks?.locked_preview}
          jobTitle={match?.title ?? answers.jobTitle}
          emailSubmitted={emailSubmitted}
          onOpenEmailModal={() => setPlanOpen(true)}
        />

        <NzMarketSignal
          message={match?.job_market_signals?.display_message ?? null}
          source={match?.job_market_signals?.source ?? null}
        />
        <NzWorkforceData
          onetCode={match?.onet_code}
          region={answers.country === "New Zealand" ? answers.region : null}
        />

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <InsightCard
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
            title="Top 3 tasks at risk"
            items={aiTasks?.tasks_at_risk?.length ? aiTasks.tasks_at_risk : tasks}
          />
          <InsightCard
            icon={<Shield className="h-5 w-5" />}
            tone="success"
            title="Top 3 protective skills"
            items={aiTasks?.protective_tasks?.length ? aiTasks.protective_tasks : skills}
          />
          <InsightCard
            icon={<BarChart3 className="h-5 w-5" />}
            tone="accent"
            title="How you compare"
            items={[comparison]}
          />
        </section>

        <UpskillSection
          skills={activeSkills}
          industry={answers.industry}
          jobTitle={match?.title ?? answers.jobTitle}
          matchedTitle={match?.title ?? null}
          score={score}
          riskBand={band}
          honestPicture={aiTasks?.honest_picture ?? ""}
          nzMarketSignalMsg={match?.job_market_signals?.display_message ?? ""}
          nzMarketSignalSrc={match?.job_market_signals?.source ?? ""}
          nzData={nzData}
          tasksAtRisk={activeTasks}
          region={answers.region ?? ""}
          onEmailCaptured={(email) => { void sendResultsEmail(email); setEmailSubmitted(true); }}
        />

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-primary text-center">What's next?</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <CtaCard
              icon={<Mail className="h-5 w-5" />}
              title="Get my full action plan"
              desc="Personalised steps emailed to you."
              cta="Email me the plan"
              onClick={() => setPlanOpen(true)}
              primary
            />
            <CtaCard
              icon={<LineChart className="h-5 w-5" />}
              title="Track my score over time"
              desc="Create an account to see your trend."
              cta="Create free account"
              onClick={() => toast.info("Accounts coming soon")}
            />
            <CtaCard
              icon={<Share2 className="h-5 w-5" />}
              title="Share my result"
              desc="Compare scores with your team."
              cta="Share"
              onClick={handleShare}
            />
          </div>
        </section>

        <p className="mt-16 text-center text-xs text-muted-foreground/80">
          Powered by O*NET 30.2 and AI Forum NZ research — the same data used by NZ government and industry.
        </p>

        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Email me my result</DialogTitle>
              <DialogDescription>
                We'll send your {score}% {band} Risk score and a personalised Career Insight for {match?.title ?? (answers.jobTitle?.trim() || "your role")}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePlanSubmit} className="mt-2 space-y-4">
              <Input
                type="email"
                required
                placeholder="your@email.com"
                value={planEmail}
                onChange={(e) => setPlanEmail(e.target.value)}
                disabled={planSubmitting}
                className="h-12 rounded-xl"
              />
              <Button
                type="submit"
                disabled={planSubmitting || !planEmail.trim()}
                className="w-full rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 disabled:opacity-50"
              >
                {planSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Send me my result"
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">No spam. Unsubscribe anytime.</p>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

// Agent Watch badge mapping. Driven directly by the agent_tier value
// computed during scoring (in src/lib/humanise.ts). Colours mirror the
// risk gauge bands so users see the same visual language across the page.
const AGENT_BADGE_BY_TIER: Record<AgentTier, { label: string; bg: string; fg: string }> = {
  tier_1: { label: "HIGH AGENT EXPOSURE",        bg: "hsl(var(--danger))",         fg: "hsl(var(--danger-foreground, 0 0% 100%))" },
  tier_2: { label: "SIGNIFICANT AGENT EXPOSURE", bg: "hsl(var(--warning-strong))", fg: "hsl(var(--warning-foreground, 0 0% 100%))" },
  tier_3: { label: "MODERATE AGENT EXPOSURE",    bg: "hsl(var(--warning))",        fg: "hsl(var(--warning-foreground, 0 0% 100%))" },
  tier_4: { label: "LOW AGENT EXPOSURE",         bg: "hsl(var(--success))",        fg: "hsl(var(--success-foreground, 0 0% 100%))" },
};

const AgentWatch = ({
  agentTier, agentReality, nzSignal, yourMove, lockedPreview,
  jobTitle, emailSubmitted, onOpenEmailModal,
}: {
  agentTier: AgentTier | null;
  agentReality?: string;
  nzSignal?: string;
  yourMove?: string;
  lockedPreview?: string;
  jobTitle: string;
  emailSubmitted: boolean;
  onOpenEmailModal: () => void;
}) => {
  const badge = agentTier ? AGENT_BADGE_BY_TIER[agentTier] : null;

  return (
    <section
      className="mt-8 rounded-2xl bg-card border border-border shadow-soft p-6 sm:p-7"
      style={{ borderLeft: "4px solid #00B5A4" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#00B5A4" }}>
        🤖 Agent Watch
      </p>
      <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
        AI agents handle entire task sequences without human input. Here's what's targeting roles like yours right now.
      </p>
      {badge && (
        <span
          className="mt-4 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
      )}

      {agentReality && (
        <p className="mt-5 text-[15px] leading-relaxed text-primary">{agentReality}</p>
      )}

      {emailSubmitted ? (
        <div className="mt-5 space-y-5">
          {nzSignal && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#00B5A4" }}>
                NZ Signal
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-primary">{nzSignal}</p>
            </div>
          )}
          {yourMove && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#00B5A4" }}>
                Your Move
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-primary">{yourMove}</p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/60">
            Source: Humanise Agent Watch — updated April 2026
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {nzSignal && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#00B5A4" }}>
                NZ Signal
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-primary">{nzSignal}</p>
            </div>
          )}
          {yourMove && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#00B5A4" }}>
                Your Move
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-primary">{yourMove}</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 flex items-start gap-3 select-none">
            <Lock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground/70 italic">
              {lockedPreview || `What AI agents are doing in ${jobTitle} roles right now`}
            </p>
          </div>
          <Button
            onClick={onOpenEmailModal}
            className="rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 text-sm px-5 h-10"
          >
            See what AI agents are doing in your role →
          </Button>
        </div>
      )}
    </section>
  );
};

const toneStyles = {
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  accent: "bg-accent/10 text-accent",
} as const;

const InsightCard = ({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: keyof typeof toneStyles;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-smooth hover:shadow-card">
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
      {icon}
    </div>
    <h3 className="mt-4 font-semibold text-primary">{title}</h3>
    <ul className="mt-3 space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
          <span className="mt-2 h-1 w-1 rounded-full bg-accent shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

const CtaCard = ({
  icon, title, desc, cta, onClick, primary,
}: {
  icon: React.ReactNode; title: string; desc: string; cta: string; onClick: () => void; primary?: boolean;
}) => (
  <div className={`rounded-2xl border p-6 flex flex-col ${primary ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
      {icon}
    </div>
    <h3 className="mt-4 font-semibold text-primary">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground flex-1">{desc}</p>
    <Button
      onClick={onClick}
      className={`mt-5 rounded-full font-semibold ${primary ? "bg-cta text-accent-foreground hover:opacity-95" : "bg-primary text-primary-foreground hover:opacity-95"}`}
    >
      {cta}
    </Button>
  </div>
);

const AGENT_TIER_META: Record<AgentTier, { icon: string; label: string; tone: "danger" | "warn" | "info" | "success" }> = {
  tier_1: { icon: "🤖", label: "High agent exposure — autonomous AI systems can already handle core tasks in your role.",     tone: "danger"  },
  tier_2: { icon: "⚡", label: "Significant agent exposure — AI agents are absorbing the execution layer of your role.",      tone: "warn"    },
  tier_3: { icon: "📊", label: "Moderate agent exposure — agents accelerate your work but can't yet replace your judgment.", tone: "info"    },
  tier_4: { icon: "🛡", label: "Low agent exposure — your role depends on physical presence or human judgment agents can't replicate.", tone: "success" },
};

const AGENT_TONE_CLASSES: Record<"danger" | "warn" | "info" | "success", string> = {
  danger:  "border-danger/40 bg-danger/10 text-danger",
  warn:    "border-accent/40 bg-accent/10 text-accent",
  info:    "border-primary/30 bg-primary/5 text-primary",
  success: "border-success/40 bg-success/10 text-success",
};

const AgentExposureBadge = ({ tier }: { tier: AgentTier }) => {
  const meta = AGENT_TIER_META[tier];
  const showFootnote = tier === "tier_1" || tier === "tier_2";
  return (
    <div className="mt-5 flex flex-col items-center gap-2 px-4">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs sm:text-[13px] font-medium leading-snug max-w-[60ch] text-center ${AGENT_TONE_CLASSES[meta.tone]}`}
      >
        <span aria-hidden>{meta.icon}</span>
        <span>{meta.label}</span>
      </span>
      {showFootnote && (
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground max-w-[60ch] leading-relaxed">
          This score reflects not just AI tools, but autonomous AI agents that can complete your tasks end-to-end without a human in the loop, the fastest-growing source of knowledge work displacement in 2026.
        </p>
      )}
    </div>
  );
};

const SoftExitBanner = () => (
  <section className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-7 shadow-soft animate-fade-in">
    <h2 className="text-lg sm:text-xl font-semibold text-primary">A note before your score</h2>
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground max-w-[65ch]">
      <p>
        Humanise is calibrated for desk-based and knowledge work, the jobs where AI displacement is happening fastest. Based on your answers, your role is mostly hands-on or off-screen, which is genuinely lower-risk territory right now.
      </p>
      <p>
        Your score below is real, but it's based on the closest occupation match we have. Take it as a signal, not a verdict.
      </p>
    </div>
    <div className="mt-5 flex flex-col sm:flex-row gap-3">
      <a
        href="/hands-on"
        className="inline-flex items-center justify-center rounded-full bg-cta text-accent-foreground hover:opacity-95 font-semibold h-11 px-5 text-sm"
      >
        Why hands-on roles are safer
      </a>
      <a
        href="/hands-on"
        className="inline-flex items-center justify-center rounded-full border border-border bg-card text-primary hover:bg-secondary font-semibold h-11 px-5 text-sm"
      >
        Notify me when Humanise builds a hands-on version
      </a>
    </div>
  </section>
);

const ScoreCaveat = () => (
  <section className="mt-8 rounded-2xl bg-card border border-border shadow-soft p-6 sm:p-8">
    <h2 className="text-xl sm:text-2xl font-semibold text-primary">What this score can't tell you</h2>
    <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground max-w-[65ch]">
      <p className="font-medium text-primary">This score is a signal, not a sentence.</p>
      <p>
        It doesn't know your specific employer. It doesn't know whether your team is already adopting AI. It doesn't know your network, your reputation, or your track record. It doesn't know how willing you are to adapt, which is, honestly, the biggest variable of all.
      </p>
      <p>Use this as a starting point for honest thinking. Not as a final answer.</p>
    </div>
  </section>
);
