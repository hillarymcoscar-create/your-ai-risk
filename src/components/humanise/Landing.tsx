import React from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/humanise/Logo";
import { ArrowRight, Clock, Lock, BookOpen } from "lucide-react";

export const Landing = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-hero">
      <header className="container max-w-6xl py-6 flex items-center justify-between">
        <Logo />
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
          Free. No login.
        </span>
      </header>

      {/* SECTION 1 — HERO */}
      <main className="container max-w-3xl pt-8 sm:pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-primary leading-[1.1] animate-fade-in">
          How much of your job can AI already do?
        </h1>

        <p className="mt-5 sm:mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
          Humanise scores AI risk for 1,016 jobs using real New Zealand data. Reserve Bank of NZ
          research, published hiring trends, and O*NET task analysis. Built for the workers most
          exposed: knowledge workers, desk roles, anyone whose day is mostly tabs, docs, and
          meetings.
        </p>

        <p className="mt-4 text-xs sm:text-sm font-medium text-muted-foreground animate-fade-in">
          60 seconds. No email needed. No account required. Made in New Zealand.
        </p>

        <div className="mt-6 sm:mt-8 animate-scale-in">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-cta hover:opacity-95 text-accent-foreground shadow-glow h-14 px-8 text-base font-semibold rounded-full"
          >
            Score my job
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <TrustItem icon={<Clock className="h-5 w-5" />} title="60-second quiz" desc="60 seconds, no fluff." />
          <TrustItem icon={<Lock className="h-5 w-5" />} title="No login required" desc="Get your score before sharing anything." />
          <TrustItem icon={<BookOpen className="h-5 w-5" />} title="Research-backed" desc="Built on WEF & McKinsey research." />
        </div>
      </main>

      {/* SECTION 2 — SOCIAL PROOF STRIP */}
      <section className="container max-w-6xl pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <Stat
            number="14%"
            label="of NZ businesses now attribute job losses to AI, double last year's figure."
          />
          <Stat
            number="143.5%"
            label="rise in AI mentions in NZ job ads since March 2025."
          />
          <Stat
            number="30%"
            label="of NZ workers face high joint AI and robotics exposure (Reserve Bank of NZ)."
          />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sources: AI Forum NZ, SEEK NZ, Reserve Bank of NZ AN2026-02
        </p>
      </section>

      {/* SECTION 3 — FOUNDER VOICE */}
      <section className="container max-w-2xl py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary">Why Humanise exists</h2>
        <div className="mt-6 space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Most AI risk calculators are built for the US. They score 200 jobs and tell you nothing
            useful about your situation in New Zealand.
          </p>
          <p>
            I built Humanise because the data on AI displacement is real, NZ-specific, and being
            ignored. We score 1,016 occupations using the same research the Reserve Bank of NZ used
            to model workforce risk.
          </p>
          <p>
            Every score is calibrated against published NZ hiring trends and includes te reo Māori
            job titles. Each result includes an honest paragraph written for your specific role.
          </p>
          <p>
            The goal isn't to scare you. It's to tell you the truth, and help you do something
            about it.
          </p>
        </div>
        <p className="mt-6 italic text-primary font-medium text-right">— Hillary Woods, Founder</p>
      </section>

      {/* SECTION 4 — HOW IT WORKS */}
      <section className="container max-w-6xl py-16 sm:py-20">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-primary">How it works</h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <HowCard
            title="60-second quiz"
            body="Five quick questions. No email. No account. Real NZ data behind every score."
          />
          <HowCard
            title="Honest result"
            body="Your AI risk score, your role's top 3 vulnerable tasks, your top 3 protective skills, and a paragraph written specifically for your job in New Zealand."
          />
          <HowCard
            title="Real next steps"
            body="Live NZ market signal from SEEK and Trade Me. Concrete reskilling actions. A free fortnightly Substack. Optional Premium Plan when you're ready."
          />
        </div>
      </section>

      {/* SECTION 5 — WHO HUMANISE IS FOR */}
      <section className="container max-w-2xl py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary">Is Humanise for you?</h2>
        <div className="mt-6 space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-primary font-semibold">Yes, almost certainly:</strong>{" "}
            marketing, design, finance, legal, admin, HR, project management, sales, customer
            service, journalism, education leadership, healthcare admin, government policy, and
            technology. Anyone whose day is mostly on a computer.
          </p>
          <p>
            <strong className="text-primary font-semibold">Yes, with a caveat:</strong> managers
            and business owners in trades, hospitality, healthcare, and horticulture. The admin
            side of your work is real, and it is being changed by AI even if the customer-facing
            side isn't.
          </p>
          <p>
            <strong className="text-primary font-semibold">Probably not:</strong> if your work is
            almost entirely hands-on. Most trades, manual labour, hospitality service,
            on-the-ground healthcare, and fieldwork fall into this category. Take the quiz anyway
            if you want. Your result will be honest. But the tools we recommend are mostly built
            for screen-based work.
          </p>
        </div>
      </section>

      {/* SECTION 6 — RESEARCH CREDIBILITY STRIP */}
      <section className="container max-w-4xl py-8">
        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          Powered by O*NET 30.2, Reserve Bank of NZ AN2026-02, MBIE Jobs Online, published NZ
          hiring data, AI Forum NZ, and Microsoft/Accenture workforce research.
        </p>
      </section>

      {/* SECTION 7 — FINAL CTA */}
      <section className="container max-w-2xl py-16 sm:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary">
          Ready to find out?
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          60 seconds. Five questions. A real NZ score for 1,016 occupations.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-cta hover:opacity-95 text-accent-foreground shadow-glow h-14 px-8 text-base font-semibold rounded-full"
          >
            Score my job
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
          Free forever. No account needed.
        </p>
      </section>
    </div>
  );
};

const Stat = ({ number, label }: { number: string; label: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft flex flex-col h-full">
    <div className="text-4xl sm:text-5xl font-bold text-accent tracking-tight">{number}</div>
    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{label}</p>
  </div>
);

const HowCard = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
    <h3 className="font-semibold text-primary text-lg">{title}</h3>
    <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{body}</p>
  </div>
);

const TrustItem = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-start gap-3">
    <div className="mt-0.5 text-accent shrink-0">{icon}</div>
    <div>
      <p className="font-semibold text-primary text-sm">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);
