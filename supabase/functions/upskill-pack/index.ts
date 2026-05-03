import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ── Safe URL constructors (NEVER let AI return full URLs) ──────────────
const enc = (s: string) => encodeURIComponent(s.trim());
const youtubeUrl = (kw: string) => `https://www.youtube.com/results?search_query=${enc(kw)}`;
const linkedinUrl = (kw: string) => `https://www.linkedin.com/learning/search?keywords=${enc(kw)}`;
const courseraUrl = (kw: string) => `https://www.coursera.org/search?query=${enc(kw)}`;
const skillshareUrl = (kw: string) => `https://www.skillshare.com/en/search?query=${enc(kw).replace(/%20/g, "+")}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "return_upskill_pack",
      description: "Return a curated upskill resource pack for the role. Return KEYWORDS ONLY for platform searches — never URLs.",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string" },
          youtube: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short label, e.g. 'AI tools for content creators — YouTube search'." },
                keywords: { type: "string", description: "Search keywords only, e.g. 'ai tools for content creators 2025'." },
                why: { type: "string" },
              },
              required: ["title", "keywords", "why"],
            },
            minItems: 2,
            maxItems: 2,
          },
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                platform: { type: "string", enum: ["LinkedIn Learning", "Coursera"] },
                keywords: { type: "string", description: "Search keywords only, e.g. 'prompt engineering for marketers'." },
                cost: { type: "string" },
                time: { type: "string" },
                why: { type: "string" },
              },
              required: ["title", "platform", "keywords", "cost", "time", "why"],
            },
            minItems: 2,
            maxItems: 2,
          },
          nz_specific: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                platform: { type: "string" },
                url: { type: "string", description: "Real homepage URL of an NZ resource (Careers NZ, industry body, training provider)." },
                cost: { type: "string" },
                why: { type: "string" },
              },
              required: ["title", "platform", "url", "cost", "why"],
            },
            minItems: 2,
            maxItems: 2,
          },
          skillshare: {
            type: "object",
            description: "Skillshare search keywords most relevant to the occupation.",
            properties: {
              title: { type: "string", description: "Short label, e.g. 'Skillshare — Digital Marketing'." },
              keywords: { type: "string", description: "Search keywords only, e.g. 'digital marketing strategy'." },
              why: { type: "string" },
            },
            required: ["title", "keywords", "why"],
          },
          quick_wins: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["headline", "youtube", "courses", "nz_specific", "skillshare", "quick_wins"],
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobTitle, industry, score } = await req.json();
    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "jobTitle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `You are an upskill advisor for New Zealand workers facing AI automation risk. The user works as a ${jobTitle} in the ${industry || "general"} industry in New Zealand, with a risk score of ${score}%.

CRITICAL: For YouTube, LinkedIn Learning, Coursera, and Skillshare resources, you MUST return SEARCH KEYWORDS ONLY — never URLs. The system constructs the safe search URLs from your keywords. Never include http/https or domains in the keywords field.

Generate:
1. Two YouTube search items — each with a descriptive title (e.g. "AI tools for content creators — YouTube search") and concise search keywords specific to the occupation and how AI affects it.
2. Two courses — one LinkedIn Learning, one Coursera (or two of either if more relevant). Each with title, platform ("LinkedIn Learning" or "Coursera"), keywords (the search query), cost (e.g. "Free trial / paid"), time (e.g. "Self-paced"), and why.
3. One Skillshare search — title (e.g. "Skillshare — Digital Marketing"), keywords (the search query), and why.
4. Two NZ-specific resources (Careers NZ, industry bodies, or local training providers) — these MAY include real homepage URLs in the url field.
5. Three quick wins they can do this week.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: userPrompt }],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "return_upskill_pack" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    let parsed: Record<string, unknown> = {};

    const toolCall = msg?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error("parse failed", e); }
    } else if (typeof msg?.content === "string") {
      const cleaned = msg.content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      try { parsed = JSON.parse(cleaned); } catch (e) { console.error("content parse failed", e); }
    }

    // ── Construct safe URLs from AI-returned keywords ──────────────────
    type KwItem = { title?: string; keywords?: string; why?: string };
    type KwCourse = KwItem & { platform?: string; cost?: string; time?: string };

    const youtube = Array.isArray(parsed.youtube)
      ? (parsed.youtube as KwItem[])
          .filter((r) => r?.keywords)
          .map((r) => ({ title: r.title ?? "YouTube search", url: youtubeUrl(r.keywords!), why: r.why ?? "" }))
      : [];

    const courses = Array.isArray(parsed.courses)
      ? (parsed.courses as KwCourse[])
          .filter((c) => c?.keywords && (c.platform === "LinkedIn Learning" || c.platform === "Coursera"))
          .map((c) => ({
            title: c.title ?? `${c.platform} search`,
            platform: c.platform!,
            url: c.platform === "Coursera" ? courseraUrl(c.keywords!) : linkedinUrl(c.keywords!),
            cost: c.cost ?? "Free trial / paid",
            time: c.time ?? "Self-paced",
            why: c.why ?? "",
          }))
      : [];

    const ssRaw = parsed.skillshare as KwItem | undefined;
    const skillshare = ssRaw?.keywords
      ? { title: ssRaw.title ?? "Skillshare search", url: skillshareUrl(ssRaw.keywords), why: ssRaw.why ?? "" }
      : undefined;

    const safePack = {
      headline: parsed.headline ?? "",
      youtube,
      courses,
      skillshare,
      nz_specific: parsed.nz_specific ?? [],
      quick_wins: parsed.quick_wins ?? [],
    };

    return new Response(JSON.stringify(safePack), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upskill-pack error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
