import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/humanise/ProgressBar";
import { Logo } from "@/components/humanise/Logo";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  AI_USAGE,
  COMPUTER_USE,
  COUNTRIES,
  INDUSTRIES,
  NZ_REGIONS,
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
    computerUse: "",
    aiUsage: "",
    repeatableTasks: "",
    country: "",
    region: "",
  });

  const next = () => {
    if (step < TOTAL) setStep(step + 1);
    else onComplete(a);
  };
  const back = () => (step === 1 ? onExit() : setStep(step - 1));

  const canAdvance = (() => {
    if (step === 1) return a.jobTitle.trim().length > 1;
    if (step === 2) return !!a.industry;
    if (step === 3) return !!a.computerUse;
    if (step === 4) return !!a.aiUsage;
    if (step === 5) return !!a.repeatableTasks;
    if (step === 6) return !!a.country && (a.country !== "New Zealand" || !!a.region);
    return false;
  })();

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
                onChange={(e) => setA({ ...a, jobTitle: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && canAdvance && next()}
                placeholder="Type your role..."
                className="h-14 text-lg rounded-xl"
              />
            </Question>
          )}

          {step === 2 && (
            <Question label="What industry do you work in?">
              <Select value={a.industry} onValueChange={(v) => setA({ ...a, industry: v })}>
                <SelectTrigger className="h-14 text-base rounded-xl">
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Question>
          )}

          {step === 3 && (
            <Question label="How much of your work happens on a computer?">
              <OptionGrid
                options={COMPUTER_USE as readonly string[]}
                value={a.computerUse}
                onChange={(v) => { setA({ ...a, computerUse: v }); setTimeout(() => setStep(4), 180); }}
              />
            </Question>
          )}

          {step === 4 && (
            <Question label="Do you currently use AI tools in your work?">
              <OptionGrid
                options={AI_USAGE as readonly string[]}
                value={a.aiUsage}
                onChange={(v) => { setA({ ...a, aiUsage: v }); setTimeout(() => setStep(5), 180); }}
              />
            </Question>
          )}

          {step === 5 && (
            <Question
              label="Does your role involve repeatable digital tasks?"
              hint="Things like scheduling, reporting, data entry, email triage, or approvals"
            >
              <OptionGrid
                options={[
                  "Yes, most of my day is this",
                  "Some of my work is like this",
                  "Only occasionally",
                  "No, my work is varied and unpredictable",
                ]}
                value={a.repeatableTasks ?? ""}
                onChange={(v) => { setA({ ...a, repeatableTasks: v }); setTimeout(() => setStep(6), 180); }}
              />
            </Question>
          )}

          {step === 6 && (
            <Question label="Where are you based?">
              <div className="space-y-4">
                <Select value={a.country} onValueChange={(v) => setA({ ...a, country: v, region: "" })}>
                  <SelectTrigger className="h-14 text-base rounded-xl">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {a.country === "New Zealand" && (
                  <div className="animate-fade-in">
                    <Select value={a.region} onValueChange={(v) => setA({ ...a, region: v })}>
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
