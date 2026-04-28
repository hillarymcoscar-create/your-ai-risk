import { buildEmailHtml, CURATED_INDUSTRIES, CURATED_URL, type EmailPack } from "@/lib/emailTemplate";

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
