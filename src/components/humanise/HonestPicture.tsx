import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  jobTitle: string;
  industry: string;
  score: number;
  usesAi: boolean;
  rawJobTitle?: string;
  band?: string;
  agentTier?: string | null;
  aiTools?: string[];
  aiRelationshipSegment?: string;
  region?: string;
  onTasks?: (tasks: { tasks_at_risk: string[]; protective_tasks: string[]; honest_picture?: string; agent_note?: string; agent_tasks?: string[]; agent_reality?: string; agent_reality_email?: string; nz_signal?: string; your_move?: string; locked_preview?: string }) => void;
};

export const HonestPicture = ({
  jobTitle, industry, score, usesAi,
  rawJobTitle, band, agentTier, aiTools, aiRelationshipSegment, region,
  onTasks,
}: Props) => {
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
        body: { jobTitle, industry, score, usesAi, rawJobTitle, band, agentTier, aiTools, aiRelationshipSegment, region },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError("We couldn't generate your personalised analysis just now. Please try again shortly.");
        } else if (data?.error) {
          setError(data.error);
        } else {
          setText(data?.honest_picture ?? data?.text ?? "");
          if (onTasks && (data?.tasks_at_risk?.length || data?.protective_tasks?.length || data?.agent_reality)) {
            onTasks({
              tasks_at_risk: data?.tasks_at_risk ?? [],
              protective_tasks: data?.protective_tasks ?? [],
              honest_picture: data?.honest_picture ?? data?.text ?? "",
              agent_note: data?.agent_note ?? "",
              agent_tasks: data?.agent_tasks ?? [],
              agent_reality: data?.agent_reality ?? "",
              agent_reality_email: data?.agent_reality_email ?? "",
              nz_signal: data?.nz_signal ?? "",
              your_move: data?.your_move ?? "",
              locked_preview: data?.locked_preview ?? "",
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
  }, [jobTitle, industry, score, usesAi, rawJobTitle, band, agentTier, aiTools?.join(","), aiRelationshipSegment, region]);

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
          <div className="space-y-2 animate-pulse" aria-label="Generating your honest picture">
            <div className="h-4 rounded bg-muted/70 w-[95%]" />
            <div className="h-4 rounded bg-muted/70 w-[88%]" />
            <div className="h-4 rounded bg-muted/70 w-[72%]" />
          </div>
        ) : error ? (
          <p className="text-[15px] text-muted-foreground">{error}</p>
        ) : (
          <p className="text-[15px] leading-relaxed text-primary whitespace-pre-line animate-fade-in">{text}</p>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/70">Generated using O*NET 30.2 task data, Reserve Bank of NZ occupation risk research, and real-time AI capability analysis.</p>
    </section>
  );
};
