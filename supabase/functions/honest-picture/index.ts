import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are Humanise, an honest and empathetic AI career advisor helping New Zealand workers understand how AI affects their specific job. You speak like a knowledgeable friend — direct, warm, and honest. You never dismiss real risks but you always find the genuine human strengths worth protecting. You reference specific AI tools and capabilities (e.g. ChatGPT, Midjourney, GitHub Copilot, Claude) where relevant.

Always return tasks as short action phrases of 4-7 words that are specific to the actual role, not generic. Reference real AI tools where relevant (e.g. 'AI image generation replacing stock shots' for photographers). Return ONLY valid JSON, no other text.`;

const TRAILING_STOPWORDS = new Set([
  "and","or","the","a","an","of","to","for","in","on","at","by","with","from",
  "into","as","is","are","was","were","be","but","if","than","that","which",
  "who","whom","while","when","such","via","per","about",
]);

function cleanTask(raw: string): string {
  if (!raw) return "";
  let s = String(raw).replace(/\s+/g, " ").trim();
  s = s.replace(/[.;,:\-–—]+$/g, "").trim();
  let words = s.split(" ").filter(Boolean);
  if (words.length > 8) words = words.slice(0, 8);
  while (words.length > 1 && TRAILING_STOPWORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  if (!words.length) return "";
  let out = words.join(" ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobTitle, industry, score, usesAi } = await req.json();
    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "jobTitle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Role: ${jobTitle}
Industry: ${industry || "unspecified"}
Country: New Zealand
Automation risk score: ${score}%
Regularly uses AI tools: ${usesAi ? "yes" : "no"}

Return a JSON object with three fields:
- "honest_picture": a 3-4 sentence paragraph explaining what AI can and cannot ACTUALLY do to this specific role right now. Reference real AI tools where relevant. Be honest, warm, and specific.
- "tasks_at_risk": exactly 3 short action phrases (4-7 words each) describing the most automatable tasks for this specific role.
- "protective_tasks": exactly 3 short action phrases (4-7 words each) describing what makes this role hard to fully automate.

All task phrases must be complete, specific to the role, and never end with a preposition, conjunction, or article.`;

    const tools = [{
      type: "function",
      function: {
        name: "return_analysis",
        description: "Return the honest picture and task lists for the role.",
        parameters: {
          type: "object",
          properties: {
            honest_picture: { type: "string" },
            tasks_at_risk: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
            protective_tasks: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["honest_picture", "tasks_at_risk", "protective_tasks"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
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
    let parsed: { honest_picture?: string; tasks_at_risk?: string[]; protective_tasks?: string[] } = {};

    const toolCall = msg?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error("tool args parse failed", e); }
    } else if (typeof msg?.content === "string") {
      const cleaned = msg.content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      try { parsed = JSON.parse(cleaned); } catch (e) { console.error("content parse failed", e); }
    }

    const honest_picture = (parsed.honest_picture ?? "").trim();
    const tasks_at_risk = (parsed.tasks_at_risk ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
    const protective_tasks = (parsed.protective_tasks ?? []).map(cleanTask).filter(Boolean).slice(0, 3);

    return new Response(
      JSON.stringify({ text: honest_picture, honest_picture, tasks_at_risk, protective_tasks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("honest-picture error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
