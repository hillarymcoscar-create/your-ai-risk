import { useState, useEffect } from "react";
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
import { buildEmailHtml, CURATED_INDUSTRIES, CURATED_URL, type EmailPack } from "@/lib/emailTemplate";
import { normalisePlatformUrl } from "@/lib/safeLinks";
import { track } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────

type UpskillResource = { title: string; url: string; why: string };
type UpskillCourse   = { title: string; platform: string; url: string; cost: string; time?: string; why: string };

type UpskillPack = {
  headline: string;
  youtube: UpskillResource[];
  courses: UpskillCourse[];
  skillshare?: UpskillResource;
  nz_specific: UpskillCourse[];
  quick_wins: string[];
};

type CuratedData = Record<string, UpskillPack>;

// Normalise a pack so any YouTube / LinkedIn Learning / Coursera / Skillshare
// link is either a safe search URL or removed entirely. Protects against
// stale curated specific-course URLs and any AI drift.
const sanitisePack = (pack: UpskillPack | null): UpskillPack | null => {
  if (!pack) return pack;
  const youtube = (pack.youtube ?? [])
    .map((r) => {
      const safe = normalisePlatformUrl(r.url, r.title, "youtube");
      return safe ? { ...r, url: safe } : null;
    })
    .filter((r): r is UpskillResource => r !== null);
  const courses = (pack.courses ?? [])
    .map((c) => {
      const safe = normalisePlatformUrl(c.url, c.title, c.platform);
      return safe ? { ...c, url: safe } : null;
    })
    .filter((c): c is UpskillCourse => c !== null);
  let skillshare: UpskillResource | undefined = undefined;
  if (pack.skillshare) {
    const safe = normalisePlatformUrl(pack.skillshare.url, pack.skillshare.title, "skillshare");
    if (safe) skillshare = { ...pack.skillshare, url: safe };
  }
  return { ...pack, youtube, courses, skillshare };
};


// ── Sub-components ────────────────────────────────────────────────────

const platformFromUrl = (url: string): string | null => {
  if (/linkedin\.com/i.test(url)) return "LinkedIn Learning";
  if (/coursera\.org/i.test(url)) return "Coursera";
  if (/skillshare\.com/i.test(url)) return "Skillshare";
  return null;
};

const ResourceLink = ({ title, url }: { title: string; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => {
      const p = platformFromUrl(url);
      if (p) track("external_link_clicked", { platform: p });
    }}
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

    {pack.skillshare && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
          Skillshare
        </p>
        <div className="flex flex-col gap-0.5">
          <ResourceLink title={pack.skillshare.title} url={pack.skillshare.url} />
          <span className="text-[10px] text-muted-foreground pl-4">(free trial available)</span>
          {pack.skillshare.why && (
            <span className="text-xs text-muted-foreground pl-4">{pack.skillshare.why}</span>
          )}
        </div>
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
  skillKeywords?: string[];
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
  getQuizResponseId?: () => string | null;
};

export const UpskillSection = ({
  skills, skillKeywords, industry, jobTitle, matchedTitle, score, riskBand,
  honestPicture, nzMarketSignalMsg, nzMarketSignalSrc, nzData,
  tasksAtRisk, region, onEmailCaptured, getQuizResponseId,
}: Props) => {
  const [modalOpen, setModalOpen]     = useState(false);
  const [email, setEmail]             = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Waitlist state
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_waitlist_count" as never);
      if (!cancelled && typeof data === "number") setWaitlistCount(data);
    })();
    return () => { cancelled = true; };
  }, [waitlistJoined]);

  if (!skills.length) return null;

  const displayIndustry = industry || "your industry";
  const isCurated = CURATED_INDUSTRIES.has(industry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);

    track("email_captured", { source: "upskill_pack" });

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

      pack = sanitisePack(pack);

      setModalOpen(false);

      // Fire-and-forget: send email without blocking the UI
      const emailSubject = `Your Humanise result — ${jobTitle} · ${score}% ${riskBand ?? ""}`.trim();
      const emailHtml = buildEmailHtml({
        jobTitle, matchedTitle: matchedTitle ?? null, industry,
        riskScore: score, riskBand: riskBand ?? "Moderate",
        honestPicture: honestPicture ?? "",
        nzMarketSignal: nzMarketSignalMsg ?? "",
        nzMarketSignalSource: nzMarketSignalSrc ?? "",
        mbieGroup: nzData?.group ?? "",
        mbieAnnualChange: nzData?.annual_change_pct ?? null,
        mbieRegion: region ?? "",
        mbieRegionalChange: nzData?.regional_change ?? null,
        statsnzThousands: nzData?.employed_thousands ?? null,
        statsnzShare: nzData?.nz_workforce_share_pct ?? null,
        tasksAtRisk: tasksAtRisk ?? [],
        protectiveSkills: skills,
        pack: pack as EmailPack | null,
      });
      supabase.functions
        .invoke("send-results-email", {
          body: { email: email.trim(), subject: emailSubject, html: emailHtml, jobTitle, industry, score, riskBand: riskBand ?? "Moderate" },
        })
        .catch((err) => console.warn("send-results-email failed silently:", err));

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

        <ul className="mt-4 space-y-2">
          {skills.map((skill, i) => (
            <li key={i} className="flex gap-2 text-sm font-medium text-primary">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <span>{skill}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm font-medium text-primary">Explore courses for these skills:</p>
        {(() => {
          const searchTerm = (skillKeywords?.[0]?.trim() || skills[0]?.trim() || "").trim();
          const combined = encodeURIComponent(searchTerm);
          return (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <a
                href={`https://www.linkedin.com/learning/search?keywords=${combined}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("external_link_clicked", { platform: "LinkedIn Learning" })}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-accent bg-background px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                LinkedIn Learning
              </a>
              <a
                href={`https://www.coursera.org/search?query=${combined}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("external_link_clicked", { platform: "Coursera" })}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-accent bg-background px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Coursera
              </a>
              <a
                href={`https://www.skillshare.com/en/search?query=${combined}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("external_link_clicked", { platform: "Skillshare" })}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-accent bg-background px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Skillshare
              </a>
            </div>
          );
        })()}

        <p className="mt-3 text-xs text-muted-foreground">Free and paid options available · Skillshare free trial available</p>

        {/* Email CTA */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-border pt-5">
          <p className="text-sm font-medium text-primary flex-1">
            Get your personalised industry upskill pack — free
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

      {/* Waitlist tier */}
      <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <h3 className="font-semibold text-primary">Want the full reskilling roadmap?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We're building a personalised 12-month NZ-specific reskilling plan for your role. Join the waitlist to be first to access it — and to help shape what's in it.
        </p>
        {waitlistCount !== null && waitlistCount >= 50 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {waitlistCount.toLocaleString()} people on the waitlist
          </p>
        )}
        <Button
          onClick={() => {
            setWaitlistEmail(email.trim());
            setWaitlistJoined(false);
            setWaitlistOpen(true);
          }}
          className="mt-5 w-full rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95"
        >
          Join the waitlist
        </Button>
      </div>

      {/* Waitlist modal */}
      <Dialog open={waitlistOpen} onOpenChange={(open) => {
        setWaitlistOpen(open);
        if (!open) setWaitlistJoined(false);
      }}>
        <DialogContent className="sm:max-w-md">
          {waitlistJoined ? (
            <>
              <DialogHeader>
                <DialogTitle>You're in.</DialogTitle>
                <DialogDescription>
                  We'll email you when the roadmap launches — and ask what you most want it to include.
                </DialogDescription>
              </DialogHeader>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Join the reskilling roadmap waitlist</DialogTitle>
                <DialogDescription>
                  Be first to access your personalised 12-month NZ reskilling plan.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = waitlistEmail.trim();
                  if (!trimmed) return;
                  setWaitlistSubmitting(true);
                  try {
                    const { error } = await supabase.from("waitlist_signups" as never).insert({
                      email: trimmed,
                      quiz_response_id: getQuizResponseId?.() ?? null,
                      occupation: matchedTitle ?? jobTitle ?? null,
                      risk_score: score,
                      source: "results_page",
                    } as never);
                    if (error) throw error;
                    setWaitlistJoined(true);
                    supabase.functions
                      .invoke("send-waitlist-email", { body: { email: trimmed } })
                      .catch((err) => console.warn("send-waitlist-email failed silently:", err));
                  } catch (err) {
                    console.error("waitlist insert failed", err);
                    toast.error("Couldn't join the waitlist right now. Please try again shortly.");
                  } finally {
                    setWaitlistSubmitting(false);
                  }
                }}
                className="mt-2 space-y-4"
              >
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  disabled={waitlistSubmitting}
                  className="h-12 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={waitlistSubmitting || !waitlistEmail.trim()}
                  className="w-full rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {waitlistSubmitting ? "Joining…" : "Join the waitlist"}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  No spam. We'll only email you about the roadmap.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

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
