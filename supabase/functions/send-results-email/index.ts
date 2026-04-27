import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type Band = "Low" | "Moderate" | "High" | "Very High";

function bandFromScore(score: number): Band {
  if (score <= 30) return "Low";
  if (score <= 55) return "Moderate";
  if (score <= 75) return "High";
  return "Very High";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function generateInsight(jobTitle: string, score: number, band: Band, industry?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const systemPrompt = `You are a career advisor for New Zealand workers facing AI automation. Write a single 'Career Insight' paragraph (2-3 sentences, max 60 words) that is specific, practical and grounded. No emojis, no marketing fluff, no hedging. Speak directly to the reader.`;
  const userPrompt = `Job title: ${jobTitle}
Industry: ${industry || "not specified"}
AI automation risk score: ${score}% (${band} risk)

Write the Career Insight now.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error", resp.status, text);
    if (resp.status === 429) throw new Error("AI rate limit. Please try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI returned empty content");
  }
  return content.trim();
}

function renderEmail(opts: {
  jobTitle: string;
  matchedTitle?: string | null;
  score: number;
  band: Band;
  insight: string;
}): { subject: string; html: string; text: string } {
  const { jobTitle, matchedTitle, score, band, insight } = opts;
  const subject = `Your Humanise result: ${score}% ${band} Risk`;

  const safeJob = escapeHtml(jobTitle);
  const safeMatched = matchedTitle ? escapeHtml(matchedTitle) : "";
  const safeInsight = escapeHtml(insight);

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:20px;margin:0 0 8px;">Humanise — your AI automation risk result</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">For: ${safeJob}${safeMatched ? ` · matched to ${safeMatched}` : ""}</p>

    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;background:#fff;text-align:center;">
      <p style="margin:0;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#64748b;">Your risk score</p>
      <p style="margin:8px 0 0;font-size:48px;font-weight:700;line-height:1;">${score}%</p>
      <p style="margin:8px 0 0;font-size:16px;font-weight:600;">${band} Risk</p>
    </div>

    <h2 style="font-size:16px;margin:32px 0 8px;">Your Career Insight</h2>
    <p style="margin:0;line-height:1.6;font-size:15px;">${safeInsight}</p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
    <p style="margin:0;font-size:12px;color:#94a3b8;">Powered by O*NET 30.2 and AI Forum NZ research. You're receiving this because you requested it on humanise.</p>
  </div>
</body></html>`;

  const text = `Humanise — your AI automation risk result

For: ${jobTitle}${matchedTitle ? ` (matched to ${matchedTitle})` : ""}

Your risk score: ${score}% — ${band} Risk

Career Insight:
${insight}
`;

  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const {
      email,
      jobTitle,
      matchedTitle,
      score,
      industry,
    } = body ?? {};

    // Basic validation
    const emailStr = typeof email === "string" ? email.trim() : "";
    const jobStr = typeof jobTitle === "string" ? jobTitle.trim() : "";
    const scoreNum = typeof score === "number" ? score : Number(score);
    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr) || emailStr.length > 254) {
      return new Response(JSON.stringify({ error: "A valid email is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!jobStr || jobStr.length > 200) {
      return new Response(JSON.stringify({ error: "A job title is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return new Response(JSON.stringify({ error: "A valid score is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const band = bandFromScore(scoreNum);
    const insight = await generateInsight(jobStr, scoreNum, band, typeof industry === "string" ? industry : undefined);

    const { subject, html, text } = renderEmail({
      jobTitle: jobStr,
      matchedTitle: typeof matchedTitle === "string" ? matchedTitle : null,
      score: Math.round(scoreNum),
      band,
      insight,
    });

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Humanise <onboarding@resend.dev>",
        to: [emailStr],
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("Resend error", resendRes.status, resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendData?.id ?? null, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-results-email error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
