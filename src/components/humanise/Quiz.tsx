import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/humanise/ProgressBar";
import { Logo } from "@/components/humanise/Logo";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  AI_RELATIONSHIPS,
  AI_TOOL_OPTIONS,
  COMPUTER_TIMES,
  COUNTRIES,
  NZ_REGIONS,
  WORK_TYPES,
  deriveLegacyAiUsage,
  deriveSegmentTag,
  inferWorkTypeFromTitle,
  type AiToolKey,
  type QuizAnswers,
} from "@/lib/humanise";
import { useOccupations, useAliases, findByAlias } from "@/lib/onet";

type Props = {
  onComplete: (answers: QuizAnswers) => void;
  onExit: () => void;
};

/**
 * Steps are addressed by 1-based index over the *visible* sequence.
 * The full sequence is [1=jobTitle, 2=workType, 3=computerTime, 4=aiTools, 5=aiRelationship, 6=location].
 * If work_type is inferred from the job title, step 2 is removed from the visible sequence.
 */
type StepId = "jobTitle" | "workType" | "computerTime" | "aiTools" | "aiRelationship" | "location";

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
  });

  // Q2 visible if work_type was NOT inferred (or no inference yet attempted).
  const showWorkType = !a.work_type_inferred;

  const sequence: StepId[] = useMemo(() => {
    const base: StepId[] = ["jobTitle", "workType", "computerTime", "aiTools", "aiRelationship", "location"];
    return showWorkType ? base : base.filter((s) => s !== "workType");
  }, [showWorkType]);

  const total = sequence.length;
  const currentId = sequence[Math.min(step, total) - 1];

  /** Apply derived/legacy fields whenever underlying answers change. */
  const finalise = (next: QuizAnswers): QuizAnswers => {
    const workType = WORK_TYPES.find((o) => o.value === next.work_type);
    const compTime = COMPUTER_TIMES.find((o) => o.value === next.computer_time);

    const softExit =
      next.work_type === 8 ||
      next.computer_time === 4 ||
      next.computer_time === 5;

    const withDerived: QuizAnswers = {
      ...next,
      soft_exit_flag: softExit,
      industry: workType?.industryTag ?? "",
      computerUse: compTime?.legacyComputerUse ?? "",
      aiUsage: deriveLegacyAiUsage(next.ai_tools),
    };
    withDerived.segment_tag = deriveSegmentTag(withDerived);
    return withDerived;
  };

  const update = (patch: Partial<QuizAnswers>) => setA((prev) => finalise({ ...prev, ...patch }));

  /** Try to infer work_type from a high-confidence alias match. Returns true if inferred. */
  const tryInferWorkType = (jobTitle: string): boolean => {
    if (!occupations || !aliases) return false;
    const matched = findByAlias(jobTitle, occupations);
    if (!matched) return false;
    const inferred = inferWorkTypeFromTitle(matched.title);
    if (!inferred) return false;
    setA((prev) => finalise({ ...prev, work_type: inferred, work_type_inferred: true }));
    return true;
  };

  /** Clear any prior inference (used when user edits Q1 from a back navigation). */
  const clearInference = () => {
    if (a.work_type_inferred) {
      setA((prev) => finalise({ ...prev, work_type: undefined, work_type_inferred: false }));
    }
  };

  const next = () => {
    if (currentId === "jobTitle") {
      // Re-evaluate inference at the moment of advancing from Q1.
      const inferred = tryInferWorkType(a.jobTitle);
      if (!inferred && a.work_type_inferred) {
        // Job title changed and no longer infers — restore Q2.
        setA((prev) => finalise({ ...prev, work_type: undefined, work_type_inferred: false }));
      }
    }
    if (step < total) setStep(step + 1);
    else onComplete(a);
  };

  const back = () => (step === 1 ? onExit() : setStep(step - 1));

  const canAdvance = (() => {
    switch (currentId) {
      case "jobTitle": return a.jobTitle.trim().length > 1;
      case "workType": return !!a.work_type;
      case "computerTime": return !!a.computer_time;
      case "aiTools": return (a.ai_tools?.length ?? 0) > 0;
      case "aiRelationship": return !!a.ai_relationship;
      case "location": return !!a.country && (a.country !== "New Zealand" || !!a.region);
      default: return false;
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
        <button onClick={onExit} className="text-xs font-medium text-muted-foreground hover:text-primary transition-smooth">
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
                  // Editing Q1 invalidates any prior inference.
                  clearInference();
                  update({ jobTitle: e.target.value });
                }}
                onKeyDown={(e) => e.key === "Enter" && canAdvance && next()}
                placeholder="Type your role..."
                className="h-14 text-lg rounded-xl"
              />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Type your real job title. We match against 1,103 NZ job titles, including te reo Māori variants and Kiwi slang like sparky, chippie, and tumuaki.
              </p>
            </Question>
          )}

          {currentId === "workType" && (
            <Question label="Which best describes the work you actually do day-to-day?">
              <OptionGrid
                options={WORK_TYPES.map((o) => o.label)}
                value={WORK_TYPES.find((o) => o.value === a.work_type)?.label ?? ""}
                onChange={(label) => {
                  const opt = WORK_TYPES.find((o) => o.label === label);
                  if (opt) {
                    update({ work_type: opt.value, work_type_inferred: false });
                    setTimeout(() => setStep((s) => s + 1), 180);
                  }
                }}
              />
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
            <Question
              label="Which AI tools do you actually use?"
              hint="Tick all that apply."
            >
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
                      <Checkbox
                        checked={active}
                        className="mt-0.5 pointer-events-none"
                        tabIndex={-1}
                      />
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
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {a.country === "New Zealand" && (
                  <div className="animate-fade-in">
                    <Select value={a.region ?? ""} onValueChange={(v) => update({ region: v })}>
                      <SelectTrigger className="h-14 text-base rounded-xl">
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        {NZ_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
          <Button
            onClick={next}
            disabled={!canAdvance}
            className="bg-cta hover:opacity-95 text-accent-foreground h-12 px-6 rounded-full font-semibold disabled:opacity-40"
          >
            {step === total ? "Get my score" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

const Question = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
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
