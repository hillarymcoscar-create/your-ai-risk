import { Button } from "@/components/ui/button";
import { Logo } from "@/components/humanise/Logo";
import { RiskGauge } from "@/components/humanise/RiskGauge";
import { AlertTriangle, Shield, BarChart3, Mail, LineChart, Share2, RotateCcw } from "lucide-react";
import {
  calculateRisk,
  industryComparison,
  protectiveSkills,
  riskSummary,
  tasksAtRisk,
  type QuizAnswers,
} from "@/lib/humanise";
import { toast } from "sonner";

type Props = {
  answers: QuizAnswers;
  onRestart: () => void;
};

export const Results = ({ answers, onRestart }: Props) => {
  const score = calculateRisk(answers);
  const summary = riskSummary(score);
  const tasks = tasksAtRisk(answers);
  const skills = protectiveSkills(answers);
  const comparison = industryComparison(score, answers.industry);

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
        <section className="mt-6 sm:mt-10 rounded-3xl bg-hero border border-border p-8 sm:p-12 text-center shadow-card animate-scale-in">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Your automation risk score
          </p>
          <div className="mt-6 flex justify-center">
            <RiskGauge score={score} />
          </div>
          <p className="mt-8 text-xl sm:text-2xl font-medium text-primary max-w-2xl mx-auto leading-snug">
            {summary}
          </p>
          {answers.jobTitle && (
            <p className="mt-3 text-sm text-muted-foreground">
              {answers.jobTitle}
              {answers.industry ? ` · ${answers.industry}` : ""}
              {answers.country ? ` · ${answers.region ? `${answers.region}, ` : ""}${answers.country}` : ""}
            </p>
          )}
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <InsightCard
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
            title="Top 3 tasks at risk"
            items={tasks}
          />
          <InsightCard
            icon={<Shield className="h-5 w-5" />}
            tone="success"
            title="Top 3 protective skills"
            items={skills}
          />
          <InsightCard
            icon={<BarChart3 className="h-5 w-5" />}
            tone="accent"
            title="How you compare"
            items={[comparison]}
          />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-primary text-center">What's next?</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <CtaCard
              icon={<Mail className="h-5 w-5" />}
              title="Get my full action plan"
              desc="Personalised steps emailed to you."
              cta="Email me the plan"
              onClick={() => toast.success("Action plan — coming soon", { description: "We'll wire up email capture next." })}
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
      </main>
    </div>
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
