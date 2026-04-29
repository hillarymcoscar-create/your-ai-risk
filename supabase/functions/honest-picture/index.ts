import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ========================================================================
// HONEST PICTURE — voice-critical paragraph. Generated in its own call
// with no tool-calling, so the model's narrative voice is preserved.
// ========================================================================

const HP_SYSTEM = `You are Hillary Woods, founder of Humanise (a New Zealand AI workforce risk tool). You write in first-person founder voice, second-person to the reader. You are direct, warm, honest. You sound like a trusted colleague who knows the NZ market, not a consultant. You do not catastrophise. You do not hedge. You tell the truth and point to a next move.

You are writing one paragraph called "Your Honest Picture" that appears after the user's risk score and after an "Agent Watch" section. It must not repeat anything from those sections.

GROUND TRUTH (NZ, 2026)
For high-risk knowledge work (score above 55) in marketing, SEO, content, social media, digital advertising, PR, communications, admin, data analysis, junior finance, and customer service: New Zealand agencies are right now making roles redundant and replacing teams of three with one person who can direct AI tools. Junior and coordinator-level roles go first. The survivors are not the most experienced, they are the ones who can direct the tools. Reference this pattern directly.

For moderate-risk roles (35 to 54): augmentation before replacement. The window to adapt is 12 to 24 months, not 6.

For low-risk roles (under 35): be honest the risk is lower. Don't dismiss the broader changes around them.

TONE BY SEGMENT
- avoiding: validate the anxiety as accurate pattern recognition. Do not make them feel worse.
- curious: the shift is smaller than it looks from the outside. Meet them there.
- occasional / daily / building: acknowledge they are ahead. Push to the next level (designing how teams use AI, becoming the AI decision-maker), not toward fear.

HARD RULES (the paragraph will be rejected if any are broken)
1. Maximum 4 sentences. Count them.
2. No em dashes anywhere. Use commas or full stops.
3. Never open with the user's job title. Open with the situation, the NZ market reality, or the user's emotional state.
4. Never repeat the score number, band name, or tier name.
5. Banned words and phrases: "rapidly", "rapid", "landscape", "ever-changing", "evolving", "revolutionising", "revolutionizing", "fundamentally rewriting", "navigate the", "shifting from a X to a Y", "your value is shifting", "leverage", "significant", "it is important", "in today's", "Kiwi intuition", "Kiwi ingenuity", "Kiwi humor", "high-level strategic architect", "editor-in-chief", "number cruncher", "grunt work", "heavy lifting", "the heart of your job", "doer".
6. The final sentence must create forward momentum. The user should finish with a sense of next move, not stuckness.
7. Do not use bullet points or headers. Just one paragraph.

CALIBRATION (match this voice exactly)

SEO Specialist, Very High, Tier 1, curious:
"What's happening in NZ agencies right now is real, teams of three are being replaced by one person with the right AI setup, and the junior roles go first. You're in a function where that pattern is already playing out, not coming eventually. The good news is that the people keeping their jobs aren't the most experienced SEO specialists, they're the ones who figured out how to direct the tools. That's a skill you can build faster than you think."

Marketing Coordinator, High, Tier 2, avoiding:
"The anxiety you feel about AI in your role is not paranoia, it's accurate pattern recognition. Coordinator-level marketing roles are where NZ agencies are making the first cuts, because the execution tasks that fill most of your day are exactly what AI handles well. That doesn't mean your career is over, it means the version of your role that survives looks different from the one you were hired for. The shift isn't as hard as it feels from the outside."

Senior Marketing Manager, Moderate, Tier 2, daily:
"You're already using AI daily, which puts you ahead of most people in your function, but using it for tasks is different from building it into how your whole team works. The senior marketing managers who are thriving in 2026 are the ones who've become the person their organisation comes to for AI decisions, not just AI outputs. You have the experience to do that. The question is whether you move toward it deliberately or wait for someone else to define the role."

Registered Nurse, Low, Tier 4, curious:
"Your clinical work is genuinely more protected than most, physical presence, human judgment, and regulated accountability are things AI cannot replicate in a care setting. What is changing is the admin and documentation load around your role, which AI is starting to handle well. That could actually free up more of your time for the work only you can do, if your employer implements it thoughtfully."

Junior Accountant, Very High, Tier 1, avoiding:
"The honest version is that the processing and reporting work that takes up most of a junior accounting role is already being done by AI at firms that have adopted it, and the ones that haven't are moving in that direction. This isn't a reason to leave accounting. It's a reason to move toward the parts of the work that require human judgment, client relationships, and advisory thinking faster than you might have planned. The pathway exists. It just starts now instead of in five years."

Output the paragraph only. No preface. No quotes around it. No headers. No follow-up.`;

// ========================================================================
// TASKS + AGENT NOTE — generated separately via tool-calling so the
// honest_picture above is unconstrained by structured-output bias.
// ========================================================================

const TASKS_SYSTEM = `You are an analyst producing short, role-specific task lists for the Humanise NZ AI workforce risk tool. You return ONLY the structured tool call. All phrases must be 4 to 7 words (12 max for agent_tasks), specific to the role, never end with a preposition, conjunction, or article. No em dashes anywhere.`;

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

// Replace em / en dashes with a comma (handles cases with or without
// surrounding whitespace). Also collapses any double spaces.
function stripEmDashes(s: string): string {
  if (!s) return "";
  return s
    .replace(/[\u2014\u2013]/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const HP_TOOL = [{
  type: "function",
  function: {
    name: "return_tasks",
    description: "Return task lists and agent note.",
    parameters: {
      type: "object",
      properties: {
        tasks_at_risk:    { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        protective_tasks: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        agent_note:       { type: "string" },
        agent_tasks:      { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
      },
      required: ["tasks_at_risk", "protective_tasks", "agent_note", "agent_tasks"],
      additionalProperties: false,
    },
  },
}];

async function callGateway(body: Record<string, unknown>, apiKey: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
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

    // ---------- Call 1: Honest Picture (plain prose, voice-critical) ----------
    const hpUserPrompt = `Write the Honest Picture paragraph for this person.

Occupation: ${jobTitle}
Raw job title entered: ${rawJobTitle || jobTitle}
Risk score: ${score}%
Risk band: ${band || "Moderate"}
Agent tier: ${agentTier || "unspecified"}
AI tools used: ${toolsList}
AI relationship segment: ${aiRelationshipSegment || "unspecified"}
NZ region: ${region || "New Zealand"}
Industry: ${industry || "unspecified"}

Output only the paragraph. Maximum 4 sentences. Match the calibration voice exactly. No em dashes. No banned words.`;

    const hpResp = await callGateway({
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: HP_SYSTEM },
        { role: "user",   content: hpUserPrompt },
      ],
    }, LOVABLE_API_KEY);

    if (!hpResp.ok) {
      if (hpResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (hpResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await hpResp.text();
      console.error("AI gateway HP error", hpResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hpData = await hpResp.json();
    let honest_picture = stripEmDashes(
      (hpData.choices?.[0]?.message?.content ?? "").trim()
        .replace(/^["'`]+|["'`]+$/g, "")
        .trim()
    );

    // ---------- Call 2: Task lists + agent note (structured) ----------
    const tasksUserPrompt = `Generate task lists for this person.

Occupation: ${jobTitle}
Raw job title entered: ${rawJobTitle || jobTitle}
Industry: ${industry || "unspecified"}
NZ region: ${region || "New Zealand"}
Regularly uses AI: ${usesAi ? "yes" : "no"}

Return:
- tasks_at_risk: 3 short action phrases (4 to 7 words) for the most automatable tasks in this role.
- protective_tasks: 3 short action phrases (4 to 7 words) for what makes this role hard to fully automate.
- agent_note: Name one of (Microsoft Copilot, ChatGPT, Google Gemini, Make.com, Manus) and give one concrete example of what it handles in this role. Under 30 words. For trades/healthcare/hands-on physical work, write "This role has strong natural protection from AI agents because [reason]" without naming a tool.
- agent_tasks: 3 specific tasks AI agents are handling today in this occupation. Action verb start. Max 12 words each.

No em dashes. No phrases ending in prepositions/conjunctions/articles.`;

    const tResp = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: TASKS_SYSTEM },
        { role: "user",   content: tasksUserPrompt },
      ],
      tools: HP_TOOL,
      tool_choice: { type: "function", function: { name: "return_tasks" } },
    }, LOVABLE_API_KEY);

    let tasks_at_risk: string[] = [];
    let protective_tasks: string[] = [];
    let agent_note = "";
    let agent_tasks: string[] = [];

    if (tResp.ok) {
      const tData = await tResp.json();
      const msg = tData.choices?.[0]?.message;
      const toolCall = msg?.tool_calls?.[0];
      let parsed: { tasks_at_risk?: string[]; protective_tasks?: string[]; agent_note?: string; agent_tasks?: string[] } = {};
      if (toolCall?.function?.arguments) {
        try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error("tool args parse failed", e); }
      } else if (typeof msg?.content === "string") {
        const cleaned = msg.content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        try { parsed = JSON.parse(cleaned); } catch (e) { console.error("content parse failed", e); }
      }
      tasks_at_risk    = (parsed.tasks_at_risk    ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
      protective_tasks = (parsed.protective_tasks ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
      agent_note       = stripEmDashes((parsed.agent_note ?? "").trim());
      agent_tasks      = (parsed.agent_tasks      ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
    } else {
      console.error("AI gateway tasks error", tResp.status, await tResp.text());
    }

    return new Response(
      JSON.stringify({
        text: honest_picture,
        honest_picture,
        tasks_at_risk,
        protective_tasks,
        agent_note,
        agent_tasks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("honest-picture error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
