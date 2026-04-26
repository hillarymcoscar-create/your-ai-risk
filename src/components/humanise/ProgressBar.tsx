type Props = { current: number; total: number };

export const ProgressBar = ({ current, total }: Props) => {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-xs font-medium text-muted-foreground">
        <span>Question {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-cta transition-smooth rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
