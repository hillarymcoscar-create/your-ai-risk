import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/humanise/ProgressBar";
import { Logo } from "@/components/humanise/Logo";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  AI_RELATIONSHIPS,
  AI_TOOL_OPTIONS,
  COMPUTER_TIMES,
  COUNTRIES,
  NZ_REGIONS,
  WORK_TYPE_OVERRIDES,
  deriveLegacyAiUsage,
  deriveSegmentTag,
  type AiToolKey,
  type MatchConfidence,
  type QuizAnswers,
  type WorkTypeOverride,
} from "@/lib/humanise";
import { useOccupations, useAliases, findByAlias, findBestMatch } from "@/lib/onet";

type Props = {
  onComplete: (answers: QuizAnswers) => void;
  onExit: () => void;
};

type StepId = "jobTitle" | "computerTime" | "aiTools" | "aiRelationship" | "location";

const SEQUENCE: StepId[] = ["jobTitle", "computerTime", "aiTools", "aiRelationship", "location"];

export const Quiz = ({ onComplete, onExit }: Props) => {
  const occupations = useOccupations();
  const aliases = useAliases();

  const [step, setStep] = useState(1);
  const [a, setA] = useState<QuizAnswers>({
    jobTitle: "",
    industry: "",
    country: "",
    region: "",
    ai_tools: [],
    work_type_override: null,
    job_title_matched: null,
  });

  // Match confirmation state — local to Q1 screen
  const [matchResolved, setMatchResolved] = useState(false);
  const [disambigOpen, setDisambigOpen] = useState(false);

  const total = SEQUENCE.length;
  const currentId = SEQUENCE[Math.min(step, total) - 1];

  /** Apply derived/legacy fields whenever underlying answers change. */
  const finalise = (next: QuizAnswers): QuizAnswers => {
    const compTime = COMPUTER_TIMES.find((o) => o.value === next.computer_time);
    const overrideOpt = next.work_type_override
      ? WORK_TYPE_OVERRIDES.find((o) => o.value === next.work_type_override)
      : undefined;

    const softExit =
      overrideOpt?.softExit === true ||
      next.computer_time === 4 ||
      next.computer_time === 5;

    const industry = overrideOpt?.industryTag ?? next.industry ?? "";

    const withDerived: QuizAnswers = {
      ...next,
      soft_exit_flag: softExit,
      industry,
      computerUse: compTime?.legacyComputerUse ?? "",
      aiUsage: deriveLegacyAiUsage(next.ai_tools),
    };
    withDerived.segment_tag = deriveSegmentTag(withDerived);
    return withDerived;
  };

  const update = (patch: Partial<QuizAnswers>) =>
    setA((prev) => finalise({ ...prev, ...patch }));

  /** Resolve job title match. Returns the matched O*NET title + confidence. */
  type ResolveResult = { title: string | null; confidence: MatchConfidence };
  const resolveMatch = (jobTitle: string): ResolveResult => {
    if (!occupations || !jobTitle.trim()) return { title: null, confidence: "no_match" };
    if (aliases) {
      const exact = findByAlias(jobTitle, occupations);
      if (exact) return { title: exact.title, confidence: "high" };
    }
    const fuzzy = findBestMatch(jobTitle, occupations);
    if (fuzzy) return { title: fuzzy.title, confidence: "fuzzy" };
    return { title: null, confidence: "no_match" };
  };

  const [matchTitle, setMatchTitle] = useState<string | null>(null);
  const [matchConfidence, setMatchConfidence] = useState<MatchConfidence>("no_match");

  const runMatch = () => {
    const r = resolveMatch(a.jobTitle);
    setMatchTitle(r.title);
    setMatchConfidence(r.confidence);
    update({
      job_title_matched: r.title,
      match_confidence: r.confidence,
      // Reset any previous override whenever match is re-run.
      work_type_override: null,
    });
    if (r.confidence === "no_match") {
      setDisambigOpen(true);
      setMatchResolved(false);
    } else {
      setMatchResolved(false);
    }
  };

  const acceptMatch = () => {
    setMatchResolved(true);
    setStep((s) => s + 1);
  };

  const pickOverride = (value: WorkTypeOverride) => {
    update({ work_type_override: value });
    setDisambigOpen(false);
    setMatchResolved(true);
    setStep((s) => s + 1);
  };

  const next = () => {
    if (currentId === "jobTitle") {
      if (!matchResolved) {
        runMatch();
        return;
      }
    }
    if (step < total) setStep(step + 1);
    else onComplete(a);
  };

  const back = () => {
    if (step === 1) {
      if (matchResolved || matchTitle !== null) {
        // Allow editing job title again
        setMatchResolved(false);
        setMatchTitle(null);
        setMatchConfidence("no_match");
        update({ job_title_matched: null, match_confidence: undefined, work_type_override: null });
        return;
      }
      onExit();
      return;
    }
    setStep(step - 1);
  };

  const canAdvance = (() => {
    switch (currentId) {
      case "jobTitle":
        return a.jobTitle.trim().length > 1;
      case "computerTime":
        return !!a.computer_time;
      case "aiTools":
        return (a.ai_tools?.length ?? 0) > 0;
      case "aiRelationship":
        return !!a.ai_relationship;
      case "location":
        return !!a.country && (a.country !== "New Zealand" || !!a.region);
      default:
        return false;
    }
  })();

  const toggleTool = (key: AiToolKey) => {
    const curr = a.ai_tools ?? [];
    update({ ai_tools: curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container max-w-3xl py-6 flex items-center justify-between">
        <Logo onClick={onExit} />
        <button
          onClick={onExit}
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-smooth"
        >
          Exit
        </button>
      </header>

      <main className="container max-w-2xl pt-4 pb-20">
        <ProgressBar current={step} total={total} />

        <div key={currentId} className="mt-12 animate-fade-in">
          {currentId === "jobTitle" && (
            <Question label="What's your job title?" hint="E.g. Marketing Manager, Registered Nurse, Carpenter">
              <Input
                autoFocus
                value={a.jobTitle}
                onChange={(e) => {
                  // Editing invalidates any prior match.
                  if (matchResolved || matchTitle !== null) {
                    setMatchResolved(false);
                    setMatchTitle(null);
                    setMatchConfidence("no_match");
                    update({
                      jobTitle: e.target.value,
                      job_title_matched: null,
                      match_confidence: undefined,
                      work_type_override: null,
                    });
                    return;
                  }
                  update({ jobTitle: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdvance) {
                    e.preventDefault();
                    next();
                  }
                }}
                placeholder="Type your role..."
                className="h-14 text-lg rounded-xl"
                disabled={matchResolved}
              />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Type your real job title. We match against 1,103 NZ job titles, including te reo Māori variants and Kiwi slang like sparky, chippie, and tumuaki.
              </p>

              {/* Match confirmation */}
              {matchTitle && (matchConfidence === "high" || matchConfidence === "fuzzy") && (
                <div className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div className="text-sm sm:text-base text-primary leading-relaxed">
                      {matchConfidence === "high" ? (
                        <>
                          We matched <span className="font-semibold">"{a.jobTitle.trim()}"</span> to{" "}
                          <span className="font-semibold">{matchTitle}</span>.
                        </>
                      ) : (
                        <>
                          We're not 100% sure on the match for{" "}
                          <span className="font-semibold">"{a.jobTitle.trim()}"</span>. The closest we found is{" "}
                          <span className="font-semibold">{matchTitle}</span>.
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={acceptMatch}
                      className="bg-cta hover:opacity-95 text-accent-foreground rounded-full font-semibold"
                    >
                      Looks right
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDisambigOpen(true)}
                      className="text-muted-foreground hover:text-primary rounded-full"
                    >
                      Not quite
                    </Button>
                  </div>
                </div>
              )}
            </Question>
          )}

          {currentId === "computerTime" && (
            <Question label="How much of your average workday is spent on a computer or screen?">
              <OptionGrid
                options={COMPUTER_TIMES.map((o) => o.label)}
                value={COMPUTER_TIMES.find((o) => o.value === a.computer_time)?.label ?? ""}
                onChange={(label) => {
                  const opt = COMPUTER_TIMES.find((o) => o.label === label);
                  if (opt) {
                    update({ computer_time: opt.value });
                    setTimeout(() => setStep((s) => s + 1), 180);
                  }
                }}
              />
            </Question>
          )}

          {currentId === "aiTools" && (
            <Question label="Which AI tools do you actually use?" hint="Tick all that apply.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AI_TOOL_OPTIONS.map((opt) => {
                  const active = (a.ai_tools ?? []).includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleTool(opt.key)}
                      className={[
                        "text-left rounded-xl border-2 p-5 transition-smooth flex items-start gap-3",
                        active
                          ? "border-accent bg-accent/5 shadow-soft"
                          : "border-border bg-card hover:border-accent/50 hover:bg-secondary",
                      ].join(" ")}
                    >
                      <Checkbox checked={active} className="mt-0.5 pointer-events-none" tabIndex={-1} />
                      <span className="font-medium text-primary">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}

          {currentId === "aiRelationship" && (
            <Question label="How would you describe your current relationship with AI at work?">
              <OptionGrid
                options={AI_RELATIONSHIPS.map((o) => o.label)}
                value={AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.label ?? ""}
                onChange={(label) => {
                  const opt = AI_RELATIONSHIPS.find((o) => o.label === label);
                  if (opt) {
                    update({ ai_relationship: opt.value });
                    setTimeout(() => setStep((s) => s + 1), 180);
                  }
                }}
              />
            </Question>
          )}

          {currentId === "location" && (
            <Question label="Where are you based?">
              <div className="space-y-4">
                <Select value={a.country} onValueChange={(v) => update({ country: v, region: "" })}>
                  <SelectTrigger className="h-14 text-base rounded-xl">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {a.country === "New Zealand" && (
                  <div className="animate-fade-in">
                    <Select value={a.region ?? ""} onValueChange={(v) => update({ region: v })}>
                      <SelectTrigger className="h-14 text-base rounded-xl">
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        {NZ_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Question>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <Button variant="ghost" onClick={back} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {/* Hide the bottom Next on the jobTitle screen once a match card is shown,
              because the user advances via the inline "Looks right" / "Not quite" CTAs. */}
          {!(currentId === "jobTitle" && matchTitle && (matchConfidence === "high" || matchConfidence === "fuzzy")) && (
            <Button
              onClick={next}
              disabled={!canAdvance}
              className="bg-cta hover:opacity-95 text-accent-foreground h-12 px-6 rounded-full font-semibold disabled:opacity-40"
            >
              {currentId === "jobTitle" ? "Next" : step === total ? "Get my score" : "Next"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

      {/* Disambiguation modal */}
      <Dialog open={disambigOpen} onOpenChange={setDisambigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Help us match your role</DialogTitle>
            <DialogDescription>
              {matchConfidence === "no_match" && a.jobTitle.trim()
                ? `We couldn't find a clean match for "${a.jobTitle.trim()}". Pick the closest description below.`
                : "Pick the option that best fits what you actually do most days."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {WORK_TYPE_OVERRIDES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pickOverride(opt.value)}
                className="text-left rounded-xl border-2 border-border bg-card p-4 transition-smooth hover:border-accent/50 hover:bg-secondary"
              >
                <span className="font-medium text-primary text-sm sm:text-base leading-snug">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Question = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <h2 className="text-2xl sm:text-3xl font-semibold text-primary leading-tight">{label}</h2>
    {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    <div className="mt-8">{children}</div>
  </div>
);

const OptionGrid = ({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {options.map((opt) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            "text-left rounded-xl border-2 p-5 transition-smooth",
            active
              ? "border-accent bg-accent/5 shadow-soft"
              : "border-border bg-card hover:border-accent/50 hover:bg-secondary",
          ].join(" ")}
        >
          <span className="font-medium text-primary">{opt}</span>
        </button>
      );
    })}
  </div>
);
