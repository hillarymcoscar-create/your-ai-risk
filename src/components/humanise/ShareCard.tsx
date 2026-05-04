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
      <h2 className="text-2xl font-semibold text-primary text-center">Share your result</h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        Save this and share with someone whose role might be affected too.
      </p>

      <div className="mt-6 flex flex-col items-center gap-5">
        {/* Preview wrapper — scales the 1080 card down for display */}
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
                position: "relative",
                background: "linear-gradient(135deg, #FFFFFF 0%, #F4FBFA 60%, #E6F7F4 100%)",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                padding: "80px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Decorative accent */}
              <div
                style={{
                  position: "absolute",
                  top: "-200px",
                  right: "-200px",
                  width: "600px",
                  height: "600px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(0,184,169,0.18) 0%, rgba(0,184,169,0) 70%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-180px",
                  left: "-180px",
                  width: "500px",
                  height: "500px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(10,37,64,0.06) 0%, rgba(10,37,64,0) 70%)",
                }}
              />

              {/* Wordmark */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#00B8A9",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  H
                </div>
                <span style={{ fontWeight: 700, fontSize: "30px", color: "#00B8A9", letterSpacing: "-0.02em" }}>
                  Humanise
                </span>
              </div>

              {/* Centre block */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  position: "relative",
                  gap: "28px",
                }}
              >
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#5A6B7C",
                    margin: 0,
                  }}
                >
                  Automation risk for
                </p>
                <h1
                  style={{
                    fontSize: "68px",
                    fontWeight: 700,
                    color: "#0A2540",
                    margin: 0,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    maxWidth: "880px",
                  }}
                >
                  {occupation}
                </h1>

                <div
                  style={{
                    fontSize: "220px",
                    fontWeight: 800,
                    color: "#00B8A9",
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                    margin: "8px 0",
                  }}
                >
                  {score}%
                </div>

                <div
                  style={{
                    display: "inline-block",
                    padding: "14px 32px",
                    borderRadius: "999px",
                    background: bandColor,
                    color: "white",
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}
                >
                  {bandLabel}
                </div>

                {topTask && (
                  <p
                    style={{
                      marginTop: "32px",
                      fontSize: "26px",
                      fontStyle: "italic",
                      color: "#0A2540",
                      maxWidth: "820px",
                      lineHeight: 1.4,
                    }}
                  >
                    “{topTask}” is the biggest exposure
                  </p>
                )}
              </div>

              {/* Footer */}
              <div style={{ position: "relative", textAlign: "center" }}>
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
