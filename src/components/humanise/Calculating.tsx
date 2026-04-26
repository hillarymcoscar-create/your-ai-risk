import { useEffect, useState } from "react";
import { Logo } from "@/components/humanise/Logo";

const STAGES = [
  "Analysing your role...",
  "Comparing against industry data...",
  "Generating your score...",
];

export const Calculating = ({ onDone }: { onDone: () => void }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1000);
    const t2 = setTimeout(() => setStage(2), 2000);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className="min-h-screen bg-hero flex flex-col">
      <header className="container max-w-6xl py-6">
        <Logo />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl animate-pulse-ring" />
          <div className="relative h-24 w-24 rounded-full border-4 border-secondary border-t-accent animate-spin" />
        </div>
        <div className="mt-10 h-7 text-center">
          {STAGES.map((s, i) => (
            <p
              key={i}
              className={`text-lg font-medium text-primary transition-smooth ${
                stage === i ? "opacity-100" : "opacity-0 absolute"
              }`}
              aria-live="polite"
            >
              {s}
            </p>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          {STAGES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-8 rounded-full transition-smooth ${
                i <= stage ? "bg-accent" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
};
