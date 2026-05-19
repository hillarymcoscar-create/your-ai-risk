import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/humanise/Logo";
import { Footer } from "@/components/humanise/Footer";

const TITLE = "Why hands-on roles are safer from AI — Humanise";
const DESCRIPTION =
  "If your work involves your hands, your body, or being physically present — you're in genuinely lower-risk territory. Here's why, and what to watch for.";

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const WhyHandsOnRolesAreSafer = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = TITLE;
    setMeta("description", DESCRIPTION);
    setMeta("og:title", TITLE, "property");
    setMeta("og:description", DESCRIPTION, "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
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
            Why hands-on roles are safer
          </h1>
          <p className="mt-3 text-base text-muted-foreground italic">For now, at least.</p>
        </div>

        <hr className="my-10 border-border" />

        <article className="space-y-6 text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed">
          <p>
            If your work involves your hands, your body, or being physically present somewhere —
            you're in genuinely lower-risk territory than most knowledge workers. Here's why.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-accent pt-4">
            AI can't replicate physical dexterity.
          </h2>
          <p>
            The robotics needed to match a sparky pulling cable through a wall cavity, a plumber
            working under a sink, or a nurse changing a dressing on real human skin — that
            technology exists in research labs, but it's nowhere near commercial deployment. The
            hardware costs more than the worker, breaks down often, and can't adapt to unexpected
            conditions. A sparky's hands and judgement are still cheaper and more reliable than any
            robot Bunnings could put on a job site.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-accent pt-4">
            Real-world unpredictability defeats current AI.
          </h2>
          <p>
            Knowledge work happens in controlled environments — spreadsheets, emails, documents. AI
            thrives there. But a building site has weather, ground conditions, unexpected old
            wiring, customers changing their minds, and a thousand variables no model has been
            trained on. AI is genuinely terrible at situations it hasn't seen before. Hands-on work
            is full of them.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-accent pt-4">
            Regulation and licensing protect you.
          </h2>
          <p>
            Electrical work, plumbing, medical care, building inspection — these are regulated. You
            need certification, licensing, insurance, and accountability. AI doesn't have a licence.
            Even if a model could technically diagnose a wiring fault, no one can legally sign off
            on the work, carry the insurance, or be liable when it goes wrong. That regulatory moat
            protects entire industries.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-accent pt-4">
            Customers want a human.
          </h2>
          <p>
            In hands-on services — hairdressing, aged care, hospitality, personal training,
            hands-on therapy — the human element is the product. Customers aren't paying for the
            task to be done. They're paying for someone to do it for them, with care, in person.
            That demand isn't going anywhere.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-accent pt-4">
            The caveat: it's not forever.
          </h2>
          <p>
            Robotics is improving. Within 10-15 years, some hands-on work will start to face real
            automation pressure (warehouse picking, basic food prep, simple agricultural tasks).
            And the paperwork around hands-on jobs — quoting, invoicing, scheduling, compliance
            reporting — is already being automated.
          </p>

          <p className="text-primary font-medium">
            So if you're in a hands-on role, your hands are safe for now. Your admin probably isn't.
          </p>

          <p className="italic">That's the honest picture.</p>
        </article>

        <div className="mt-12 flex justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground hover:opacity-95 font-semibold h-11 px-6 text-sm transition-smooth"
          >
            Back to your score →
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WhyHandsOnRolesAreSafer;
