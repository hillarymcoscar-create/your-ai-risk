import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  jobTitle: string;
  industry: string;
  score: number;
  usesAi: boolean;
  onTasks?: (tasks: { tasks_at_risk: string[]; protective_tasks: string[]; honest_picture?: string; agent_note?: string; agent_tasks?: string[] }) => void;
};

export const HonestPicture = ({ jobTitle, industry, score, usesAi, onTasks }: Props) => {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setText("");

    supabase.functions
      .invoke("honest-picture", {
        body: { jobTitle, industry, score, usesAi },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError("We couldn't generate your personalised analysis just now. Please try again shortly.");
        } else if (data?.error) {
          setError(data.error);
        } else {
          setText(data?.honest_picture ?? data?.text ?? "");
          if (onTasks && (data?.tasks_at_risk?.length || data?.protective_tasks?.length)) {
            onTasks({
              tasks_at_risk: data?.tasks_at_risk ?? [],
              protective_tasks: data?.protective_tasks ?? [],
              honest_picture: data?.honest_picture ?? data?.text ?? "",
              agent_note: data?.agent_note ?? "",
              agent_tasks: data?.agent_tasks ?? [],
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't generate your personalised analysis just now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobTitle, industry, score, usesAi]);

  return (
    <section
      className="mt-8 rounded-2xl bg-card border border-border shadow-soft p-6 sm:p-7 animate-scale-in"
      style={{ borderLeft: "4px solid hsl(var(--accent))" }}
      aria-live="polite"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Your honest picture
      </p>

      <div className="mt-3 min-h-[4.5rem]">
        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-secondary border-t-accent animate-spin" />
            <span className="text-[15px]">Analysing your role…</span>
          </div>
        ) : error ? (
          <p className="text-[15px] text-muted-foreground">{error}</p>
        ) : (
          <p className="text-[15px] leading-relaxed text-primary whitespace-pre-line">{text}</p>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/70">Powered by AI analysis</p>
    </section>
  );
};
