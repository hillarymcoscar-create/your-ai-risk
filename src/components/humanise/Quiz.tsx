import { useState } from "react";
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
  type AiToolKey,
  type QuizAnswers,
} from "@/lib/humanise";

type Props = {
  onComplete: (answers: QuizAnswers) => void;
  onExit: () => void;
};

const TOTAL = 6;

export const Quiz = ({ onComplete, onExit }: Props) => {
  const [step, setStep] = useState(1);
  const [a, setA] = useState<QuizAnswers>({
    jobTitle: "",
    industry: "",
    country: "",
    region: "",
    ai_tools: [],
  });

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
      // Legacy fields kept in sync so HonestPicture / email keep working
      industry: workType?.industryTag ?? "",
      computerUse: compTime?.legacyComputerUse ?? "",
      aiUsage: deriveLegacyAiUsage(next.ai_tools),
    };
    withDerived.segment_tag = deriveSegmentTag(withDerived);
    return withDerived;
  };

  const update = (patch: Partial<QuizAnswers>) => setA((prev) => finalise({ ...prev, ...patch }));

  const next = () => {
    if (step < TOTAL) setStep(step + 1);
    else onComplete(a);
  };
  const back = () => (step === 1 ? onExit() : setStep(step - 1));

  const canAdvance = (() => {
    if (step === 1) return a.jobTitle.trim().length > 1;
    if (step === 2) return !!a.work_type;
    if (step === 3) return !!a.computer_time;
    if (step === 4) return (a.ai_tools?.length ?? 0) > 0;
    if (step === 5) return !!a.ai_relationship;
    if (step === 6) return !!a.country && (a.country !== "New Zealand" || !!a.region);
    return false;
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
        <ProgressBar current={step} total={TOTAL} />

        <div key={step} className="mt-12 animate-fade-in">
          {step === 1 && (
            <Question label="What's your job title?" hint="E.g. Marketing Manager, Registered Nurse, Carpenter">
              <Input
                autoFocus
                value={a.jobTitle}
                onChange={(e) => update({ jobTitle: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && canAdvance && next()}
                placeholder="Type your role..."
                className="h-14 text-lg rounded-xl"
              />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Type your real job title. We match against 1,103 NZ job titles, including te reo Māori variants and Kiwi slang like sparky, chippie, and tumuaki.
              </p>
            </Question>
          )}

          {step === 2 && (
            <Question label="Which best describes the work you actually do day-to-day?">
              <OptionGrid
                options={WORK_TYPES.map((o) => o.label)}
                value={WORK_TYPES.find((o) => o.value === a.work_type)?.label ?? ""}
                onChange={(label) => {
                  const opt = WORK_TYPES.find((o) => o.label === label);
                  if (opt) {
                    update({ work_type: opt.value });
                    setTimeout(() => setStep(3), 180);
                  }
                }}
              />
            </Question>
          )}

          {step === 3 && (
            <Question label="How much of your average workday is spent on a computer or screen?">
              <OptionGrid
                options={COMPUTER_TIMES.map((o) => o.label)}
                value={COMPUTER_TIMES.find((o) => o.value === a.computer_time)?.label ?? ""}
                onChange={(label) => {
                  const opt = COMPUTER_TIMES.find((o) => o.label === label);
                  if (opt) {
                    update({ computer_time: opt.value });
                    setTimeout(() => setStep(4), 180);
                  }
                }}
              />
            </Question>
          )}

          {step === 4 && (
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

          {step === 5 && (
            <Question label="How would you describe your current relationship with AI at work?">
              <OptionGrid
                options={AI_RELATIONSHIPS.map((o) => o.label)}
                value={AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.label ?? ""}
                onChange={(label) => {
                  const opt = AI_RELATIONSHIPS.find((o) => o.label === label);
                  if (opt) {
                    update({ ai_relationship: opt.value });
                    setTimeout(() => setStep(6), 180);
                  }
                }}
              />
            </Question>
          )}

          {step === 6 && (
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
            {step === TOTAL ? "Get my score" : "Next"}
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
