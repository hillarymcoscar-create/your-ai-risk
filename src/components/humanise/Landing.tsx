import { Button } from "@/components/ui/button";
import { Logo } from "@/components/humanise/Logo";
import { ArrowRight, Clock, Lock, BookOpen } from "lucide-react";

export const Landing = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-hero">
      <header className="container max-w-6xl py-6 flex items-center justify-between">
        <Logo />
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
          Free · No login
        </span>
      </header>

      <main className="container max-w-3xl pt-16 sm:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Powered by data from 1,016 occupations
        </div>

        <h1 className="mt-6 text-4xl sm:text-6xl font-bold text-primary leading-[1.05] animate-fade-in">
          Is AI coming for your job?
          <br />
          <span className="text-accent">Find out in 60 seconds.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
          Get your personalised automation risk score, free and instant. Based on data from
          1,016 occupations.
        </p>

        <div className="mt-10 animate-scale-in">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-cta hover:opacity-95 text-accent-foreground shadow-glow h-14 px-8 text-base font-semibold rounded-full"
          >
            Check My Risk Score
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <TrustItem icon={<Clock className="h-5 w-5" />} title="60-second quiz" desc="Five quick questions, no fluff." />
          <TrustItem icon={<Lock className="h-5 w-5" />} title="No login required" desc="Get your score before sharing anything." />
          <TrustItem icon={<BookOpen className="h-5 w-5" />} title="Research-backed" desc="Built on WEF & McKinsey research." />
        </div>
      </main>

      <section className="container max-w-6xl pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Aotearoa New Zealand
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-primary">
            Why it matters in New Zealand
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <StatCard
            number="46%"
            label="of NZ jobs at risk"
            sub="over the next 20 years"
            source="NZ Productivity Commission"
          />
          <StatCard
            number="87%"
            label="of large NZ organisations use AI"
            sub="up from 48% just two years ago"
            source="Datacom State of AI Index 2025"
          />
          <StatCard
            number="14%"
            label="of NZ workers feel AI-confident"
            sub="while their employers race ahead"
            source="Datacom State of AI Index 2025"
          />
        </div>

        <p className="mt-12 text-center text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          That gap between organisational AI adoption and individual worker readiness is exactly the problem Humanise is here to solve.
        </p>

        <div className="mt-8 text-center">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-cta hover:opacity-95 text-accent-foreground shadow-glow h-14 px-8 text-base font-semibold rounded-full"
          >
            Check My Risk Score
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ number, label, sub, source }: { number: string; label: string; sub: string; source: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft flex flex-col h-full">
    <div className="text-5xl font-bold text-accent tracking-tight">{number}</div>
    <h3 className="mt-3 font-semibold text-primary">{label}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    <p className="mt-4 pt-4 border-t border-border text-xs font-medium text-muted-foreground">
      Source: {source}
    </p>
  </div>
);

const TrustItem = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-accent">
      {icon}
    </div>
    <h3 className="mt-3 font-semibold text-primary">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
  </div>
);
