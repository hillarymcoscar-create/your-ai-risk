import { useEffect, useState } from "react";

type Band = "Low" | "Moderate" | "High" | "Very High";

const BAND_COLOR: Record<Band, string> = {
  Low: "hsl(var(--success))",
  Moderate: "hsl(var(--warning))",
  High: "hsl(var(--warning-strong))",
  "Very High": "hsl(var(--danger))",
};

export const RiskGauge = ({ score, band }: { score: number; band: Band }) => {
  const [animated, setAnimated] = useState(0);
  const colorVar = BAND_COLOR[band] ?? "hsl(var(--warning))";
  const label = `${band} risk`;

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
