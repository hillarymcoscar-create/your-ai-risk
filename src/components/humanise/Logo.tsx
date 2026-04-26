export const Logo = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 group"
    aria-label="Humanise home"
  >
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <span className="absolute inset-0 rounded-lg bg-cta opacity-0 group-hover:opacity-100 transition-smooth" />
      <span className="relative font-bold">H</span>
    </span>
    <span className="font-bold text-lg tracking-tight text-primary">Humanise</span>
  </button>
);
