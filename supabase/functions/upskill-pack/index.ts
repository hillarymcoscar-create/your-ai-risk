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

Generate a concise upskill resource list with:
1. For YouTube, generate 2 search URLs in this format:
https://www.youtube.com/results?search_query=[relevant+keywords]

Use keywords specific to the occupation and how AI affects it. For example, for a Content Creator:
- https://www.youtube.com/results?search_query=ai+tools+for+content+creators
- https://www.youtube.com/results?search_query=video+editing+ai+automation+2025

Never generate youtube.com/watch or youtube.com/@channel URLs — only search URLs. These are guaranteed to work and return relevant results. For each, the title should describe what the search returns (e.g. "AI tools for content creators — YouTube search").
2. Two specific courses on Coursera or LinkedIn Learning relevant to their role (real courses — name, platform, URL, cost, time commitment)
3. One Skillshare browse-category link most relevant to the occupation's industry. Use a real Skillshare browse URL of the form https://www.skillshare.com/en/browse/<category> (examples of valid categories: marketing, technology, finance, health-wellness, education, business-analytics, design, writing, productivity). Title it like "Skillshare — <Category>". Include a one-sentence "why".
4. Two NZ-specific resources (Careers NZ, industry bodies, or local training providers)
5. Three quick wins they can do this week

Only include real, currently active URLs for courses, NZ resources, and Skillshare categories. Do not invent them.`;

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
