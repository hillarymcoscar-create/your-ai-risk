import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { RiskBandLabel } from "@/lib/humanise";

const BAND_HEX: Record<RiskBandLabel, string> = {
  Low: "#2BB673",
  Moderate: "#F5B400",
  High: "#F08A24",
  "Very High": "#E5484D",
};

type Props = {
  occupation: string;
  score: number;
  band: RiskBandLabel;
  topTask?: string;
};

export const ShareCard = ({ occupation, score, band, topTask }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const bandColor = BAND_HEX[band] ?? "#F5B400";
  const bandLabel = `${band.toUpperCase()} RISK`;
  const scoreText = `${score}%`;
  const occupationLength = occupation.trim().length;
  const occupationFontSize =
    occupationLength > 52 ? 52 : occupationLength > 42 ? 60 : occupationLength > 30 ? 68 : 78;
  const taskPreview = topTask?.trim()
    ? `${topTask.trim()} is the biggest exposure`
    : "Your most exposed task is the biggest exposure";
  const scoreFontSize = score >= 100 ? 200 : 220;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `humanise-${occupation.toLowerCase().replace(/\s+/g, "-")}-${score}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-primary text-center">Know someone whose role might be affected?</h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        Save this card and send it to them. The conversation needs more honest data.
      </p>

      <div className="mt-6 flex flex-col items-center gap-5">
        <div
          className="rounded-2xl overflow-hidden shadow-card border border-border"
          style={{ width: "min(420px, 100%)", aspectRatio: "1 / 1" }}
        >
          <div
            style={{
              width: "1080px",
              height: "1080px",
              transform: "scale(calc(min(420px, 100vw - 32px) / 1080))",
              transformOrigin: "top left",
            }}
          >
            <div
              ref={cardRef}
              style={{
                width: "1080px",
                height: "1080px",
                background: "linear-gradient(180deg, #FFFFFF 0%, #F7FCFB 72%, #ECF9F7 100%)",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                padding: "80px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                borderRadius: "24px",
                border: "1px solid rgba(0, 184, 169, 0.16)",
                textAlign: "center",
                gap: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#00B8A9",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  H
                </div>
                <span style={{ fontWeight: 700, fontSize: "28px", color: "#00B8A9" }}>
                  Humanise
                </span>
              </div>

              <div style={{ height: "40px", flexShrink: 0 }} />

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 32px",
                  borderRadius: "999px",
                  background: bandColor,
                  color: "white",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  flexShrink: 0,
                }}
              >
                {bandLabel}
              </div>

              <div style={{ height: "24px", flexShrink: 0 }} />

              <div
                style={{
                  fontSize: `${scoreFontSize}px`,
                  fontWeight: 800,
                  color: "#00B8A9",
                  lineHeight: 0.92,
                  letterSpacing: "-0.05em",
                  maxWidth: "100%",
                  flexShrink: 0,
                }}
              >
                {scoreText}
              </div>

              <div style={{ height: "24px", flexShrink: 0 }} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  maxWidth: "920px",
                  flexShrink: 1,
                }}
              >
                <h1
                  style={{
                    fontSize: `${occupationFontSize}px`,
                    fontWeight: 700,
                    color: "#0A2540",
                    margin: 0,
                    lineHeight: 1.1,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {occupation}
                </h1>
              </div>

              <div style={{ flex: 1, minHeight: "48px" }} />

              <p
                style={{
                  margin: 0,
                  fontSize: "26px",
                  fontStyle: "italic",
                  color: "#0A2540",
                  lineHeight: 1.35,
                  maxWidth: "860px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  wordBreak: "break-word",
                  flexShrink: 0,
                }}
              >
                {taskPreview}
              </p>

              <div style={{ height: "24px", flexShrink: 0 }} />

              <div style={{ flexShrink: 0 }}>
                <p style={{ fontSize: "20px", color: "#7A8A99", fontWeight: 500, margin: 0 }}>
                  Get your honest picture · humanise.nz
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full font-semibold bg-cta text-accent-foreground hover:opacity-95 px-6 h-11"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Preparing…" : "Download my card"}
        </Button>
      </div>
    </section>
  );
};
