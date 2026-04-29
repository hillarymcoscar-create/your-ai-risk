type NzMarketSignalProps = {
  message?: string | null;
  source?: string | null;
};

// Replace em/en dashes with a comma so dynamic data renders cleanly.
const stripDashes = (s: string) =>
  s.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();

export const NzMarketSignal = ({ message, source }: NzMarketSignalProps) => {
  if (!message) return null;
  const cleanMessage = stripDashes(message).replace(/[.!?]?$/, ".");
  const cleanSource = source ? stripDashes(source) : null;

  return (
    <section
      className="mt-4 rounded-lg border-l-[3px] border-accent bg-accent/10 px-4 py-4 sm:px-5"
      aria-label="NZ market signal"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-accent">
        NZ market signal
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-primary">
        {cleanMessage}
      </p>
      {cleanSource ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Source: {cleanSource}
        </p>
      ) : null}
    </section>
  );
};