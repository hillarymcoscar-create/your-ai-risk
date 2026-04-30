import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "return_upskill_pack",
      description: "Return a curated upskill resource pack for the role.",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string" },
          youtube: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                why: { type: "string" },
              },
              required: ["title", "url", "why"],
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
                platform: { type: "string" },
                url: { type: "string" },
                cost: { type: "string" },
                time: { type: "string" },
                why: { type: "string" },
              },
              required: ["title", "platform", "url", "cost", "time", "why"],
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
                url: { type: "string" },
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
            description: "A Skillshare browse-category URL most relevant to the occupation's industry.",
            properties: {
              title: { type: "string", description: "Short label, e.g. 'Skillshare — Marketing'." },
              url: { type: "string", description: "A real Skillshare browse URL like https://www.skillshare.com/en/browse/<category>." },
              why: { type: "string", description: "One short sentence on why this category fits the role." },
            },
            required: ["title", "url", "why"],
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

CRITICAL URL SAFETY RULES — read carefully before generating any links.

For all resource links (YouTube, LinkedIn Learning, Coursera, Skillshare), you may ONLY generate URLs that follow these exact safe patterns:

SAFE URL PATTERNS ONLY:
- YouTube: https://www.youtube.com/results?search_query=[keywords]
  (search URLs only — NEVER /watch URLs, NEVER /@channel URLs)
- LinkedIn Learning: https://www.linkedin.com/learning/search?keywords=[keywords]
  (search URL only — NEVER a specific course URL)
- Coursera: https://www.coursera.org/search?query=[keywords]
  (search URL only — NEVER a specific course URL)
- Skillshare: https://www.skillshare.com/en/browse/[category]
  (browse URL only — NEVER a specific class URL)

RULE: If you cannot identify a relevant browse category or search keyword for a platform that genuinely fits the occupation, OMIT that platform entirely. Do not include a link that is generic or forced.

Never generate URLs to specific courses, videos, or instructor pages — these break over time. Only the safe patterns above are allowed.

Generate a concise upskill resource list with:
1. Two YouTube search URLs (using the safe pattern above) with keywords specific to the occupation and how AI affects it. For example, for a Content Creator:
- https://www.youtube.com/results?search_query=ai+tools+for+content+creators
- https://www.youtube.com/results?search_query=video+editing+ai+automation+2025
The title should describe what the search returns (e.g. "AI tools for content creators — YouTube search").
2. Two courses — each must use either the LinkedIn Learning search URL pattern or the Coursera search URL pattern above with keywords relevant to the role. Title should describe the search (e.g. "Prompt engineering — Coursera search"). Set platform to "LinkedIn Learning" or "Coursera", cost to "Free trial / paid", and time to "Self-paced".
3. One Skillshare browse-category link using the safe pattern above. Valid categories include: marketing, technology, finance, health-wellness, education, business-analytics, design, writing, productivity. Title it like "Skillshare — <Category>". Include a one-sentence "why". If no category genuinely fits, omit Skillshare.
4. Two NZ-specific resources (Careers NZ, industry bodies, or local training providers) — these may be real homepage URLs.
5. Three quick wins they can do this week.

Only use the safe URL patterns above for YouTube, LinkedIn Learning, Coursera, and Skillshare. Do not invent specific course, video, or class URLs.`;

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

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upskill-pack error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
