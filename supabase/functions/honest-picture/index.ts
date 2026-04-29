import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are Hillary Woods, founder of Humanise, a New Zealand AI workforce risk tool. You write in first-person founder voice. You are direct, warm, and honest. You do not use corporate language. You do not hedge everything. You do not catastrophise. You tell people the truth about their situation and then point them toward what they can actually do about it.

You are writing a short paragraph called "Your Honest Picture" for someone who just completed the Humanise quiz. This paragraph appears after their risk score and after the Agent Watch section, so do not repeat anything from those sections.

Your Honest Picture has one job: to make the user feel genuinely seen in their specific situation, and to leave them with one clear emotional truth they can act on.

Real-world context you must factor into your response for high-risk knowledge work roles (risk score above 55%):
New Zealand marketing agencies are already making roles redundant and replacing teams of three people with one person using AI. This is not a future prediction. It is happening now, in 2026, in NZ businesses across Auckland, Wellington, and Christchurch. The pattern is consistent: junior and coordinator-level roles go first. The person who survives is not the most experienced, it is the one who can direct AI tools and agents to do the work the team used to do.

This context applies to: marketing, SEO, content, social media, digital advertising, PR, communications, admin, data analysis, junior finance, and customer service roles.

For moderate-risk roles (35 to 54 percent): the disruption is real but slower. Augmentation is happening before replacement. The window to adapt is 12 to 24 months, not 6.

For low-risk roles (under 35 percent): be honest that the risk is lower without being dismissive. The world around these people is still changing even if their specific role is more protected.

Rules for honest_picture:
- Never use em dashes
- Never use the phrase "it is important"
- Never open with the user's job title
- Never use the word "significant"
- Never use the word "leverage"
- Never say "in today's rapidly changing landscape" or anything like it
- Never repeat the risk score percentage
- Never repeat the agent exposure tier or badge language
- Never repeat anything from the agent_note or agent_tasks you generate
- Maximum 4 sentences
- Write like a trusted colleague who knows this industry, not a consultant who has read about it
- End with a sentence that creates forward momentum, not anxiety

You also generate task lists and an agent note for other parts of the page. Keep those as short, role-specific action phrases (4 to 7 words). The honest_picture must stand alone and never overlap in content with agent_note or agent_tasks.

Return ONLY the structured tool call. No other text.`;

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

// Strip em dashes from a string by replacing with a comma.
function stripEmDashes(s: string): string {
  if (!s) return "";
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      jobTitle,
      industry,
      score,
      usesAi,
      rawJobTitle,
      band,
      agentTier,
      aiTools,
      aiRelationshipSegment,
      region,
    } = await req.json();
    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "jobTitle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const toolsList = Array.isArray(aiTools) && aiTools.length ? aiTools.join(", ") : "none specified";
    const userPrompt = `Write "Your Honest Picture" for this person.

Occupation: ${jobTitle}
Raw job title entered: ${rawJobTitle || jobTitle}
Risk score: ${score}%
Risk band: ${band || "Moderate"}
Agent tier: ${agentTier || "unspecified"}
AI tools used: ${toolsList}
AI relationship: ${aiRelationshipSegment || "unspecified"}
NZ region: ${region || "New Zealand"}
Industry: ${industry || "unspecified"}
Regularly uses AI tools: ${usesAi ? "yes" : "no"}

Return a structured response with these fields:

1. honest_picture: One paragraph, maximum 4 sentences. Follow every rule in the system prompt. Do not repeat anything you put in agent_note or agent_tasks. Speak directly to the emotional reality of this person's situation. End with a forward-looking sentence that creates momentum, not anxiety.

2. tasks_at_risk: Exactly 3 short action phrases (4 to 7 words each) describing the most automatable tasks for this specific role.

3. protective_tasks: Exactly 3 short action phrases (4 to 7 words each) describing what makes this role hard to fully automate.

4. agent_note: Name one specific AI agent tool currently being used for tasks in this occupation (choose the most relevant from: Microsoft Copilot, ChatGPT, Google Gemini, Make.com, or Manus) and give one concrete example of what it handles in this role. Keep to under 30 words. If the occupation is trades, healthcare, or other hands-on physical work, write "This role has strong natural protection from AI agents because [reason]" without naming a tool.

5. agent_tasks: Exactly 3 specific tasks in this occupation that AI agents are handling today. Each must start with an action verb, be specific to the role (not generic), and be no longer than 12 words.

All task phrases must be complete, specific to the role, and never end with a preposition, conjunction, or article. No em dashes anywhere in any field.`;

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
            agent_note: { type: "string" },
            agent_tasks: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["honest_picture", "tasks_at_risk", "protective_tasks", "agent_note", "agent_tasks"],
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
    let parsed: { honest_picture?: string; tasks_at_risk?: string[]; protective_tasks?: string[]; agent_note?: string; agent_tasks?: string[] } = {};

    const toolCall = msg?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error("tool args parse failed", e); }
    } else if (typeof msg?.content === "string") {
      const cleaned = msg.content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      try { parsed = JSON.parse(cleaned); } catch (e) { console.error("content parse failed", e); }
    }

    const honest_picture = stripEmDashes((parsed.honest_picture ?? "").trim());
    const tasks_at_risk = (parsed.tasks_at_risk ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
    const protective_tasks = (parsed.protective_tasks ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
    const agent_note = stripEmDashes((parsed.agent_note ?? "").trim());
    const agent_tasks = (parsed.agent_tasks ?? []).map(cleanTask).filter(Boolean).slice(0, 3);

    return new Response(
      JSON.stringify({ text: honest_picture, honest_picture, tasks_at_risk, protective_tasks, agent_note, agent_tasks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("honest-picture error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
