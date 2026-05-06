import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/humanise/Logo";
import { Footer } from "@/components/humanise/Footer";

export const LegalLayout = ({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-hero flex flex-col">
    <header className="container max-w-6xl py-6 flex items-center justify-between">
      <Link to="/" aria-label="Humanise home">
        <Logo />
      </Link>
      <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
        Free. No login.
      </span>
    </header>

    <main className="container max-w-3xl pt-8 sm:pt-16 pb-16 flex-1">
      <div className="text-center">
        <p className="text-accent font-bold tracking-widest text-sm">HUMANISE</p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-bold text-primary leading-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">humanise.nz · {updated}</p>
      </div>

      <hr className="my-10 border-border" />

      <article className="legal-prose space-y-5 text-base text-muted-foreground leading-relaxed">
        {children}
      </article>
    </main>

    <Footer />
  </div>
);
