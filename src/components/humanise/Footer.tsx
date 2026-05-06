import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="border-t border-border mt-16">
    <div className="container max-w-6xl py-6 text-center text-xs text-muted-foreground">
      <Link to="/privacy" className="hover:text-primary transition-smooth">Privacy</Link>
      <span className="mx-2">·</span>
      <Link to="/terms" className="hover:text-primary transition-smooth">Terms</Link>
      <span className="mx-2">·</span>
      <span>© 2026 Humanise</span>
      <span className="mx-2">·</span>
      <span>humanise.nz</span>
    </div>
  </footer>
);
