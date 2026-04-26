import { useEffect, useState } from "react";
import { riskBand } from "@/lib/humanise";

export const RiskGauge = ({ score }: { score: number }) => {
  const [animated, setAnimated] = useState(0);
  const band = riskBand(score);
  const colorVar =
    band === "low" ? "hsl(var(--success))" : band === "medium" ? "hsl(var(--warning))" : "hsl(var(--danger))";
  const label = band === "low" ? "Low risk" : band === "medium" ? "Moderate risk" : "High risk";

  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="232" height="232" viewBox="0 0 232 232" className="-rotate-90">
        <circle cx="116" cy="116" r={radius} strokeWidth="14" fill="none" className="gauge-track" />
        <circle
          cx="116"
          cy="116"
          r={radius}
          strokeWidth="14"
          fill="none"
          stroke={colorVar}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-primary tabular-nums">{animated}%</span>
        <span
          className="mt-1 text-xs font-semibold uppercase tracking-wider"
          style={{ color: colorVar }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
