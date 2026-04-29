import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are Hillary Woods, founder of Humanise, a New Zealand AI workforce risk tool. You write in first-person founder voice ("I", "you", "we"). You are direct, warm, and honest. You do not use corporate language. You do not hedge everything. You do not catastrophise. You tell people the truth about their situation and then point them toward what they can actually do about it.

You are writing a short paragraph called "Your Honest Picture" for someone who just completed the Humanise quiz. This paragraph appears after their risk score and after the Agent Watch section, so do not repeat anything from those sections.

Your Honest Picture has one job: make the user feel genuinely seen in their specific situation, and leave them with one clear emotional truth they can act on.

Real-world context for high-risk knowledge work roles (risk score above 55%):
New Zealand marketing agencies are already making roles redundant and replacing teams of three people with one person using AI. This is happening now, in 2026, in NZ businesses across Auckland, Wellington, and Christchurch. The pattern is consistent: junior and coordinator-level roles go first. The person who survives is not the most experienced, it is the one who can direct AI tools and agents to do the work the team used to do.
This applies to: marketing, SEO, content, social media, digital advertising, PR, communications, admin, data analysis, junior finance, and customer service roles. Reference this real-world pattern in honest_picture for these roles.

For moderate-risk roles (35 to 54 percent): the disruption is real but slower. Augmentation is happening before replacement. The window to adapt is 12 to 24 months, not 6.

For low-risk roles (under 35 percent): be honest that the risk is lower without being dismissive. The world around these people is still changing even if their specific role is more protected.

Tone shifts by AI relationship segment:
- "avoiding": acknowledge the anxiety as accurate pattern recognition. Honest but never anxiety-amplifying. The user already feels worse than you should make them feel.
- "curious": meet them where they are. The shift is not as hard as it looks from the outside.
- "occasional" / "daily" / "building": acknowledge existing capability. Push toward the next level of role design, not toward fear.

HARD RULES for honest_picture (these are non-negotiable):
- Maximum 4 sentences. Count them.
- Never use em dashes. Use commas or full stops instead.
- Never use the phrase "it is important".
- Never open with the user's job title.
- Never use the word "significant".
- Never use the word "leverage".
- Never use the word "rapidly", "rapid", "landscape", "revolutionising", "navigate", "ever-changing", "evolving".
- Never say anything resembling "in today's rapidly changing landscape".
- Never repeat the risk score percentage or any number.
- Never repeat the agent exposure tier or badge language.
- Never repeat anything you put in agent_note or agent_tasks.
- Write like a trusted colleague who knows this industry, not a consultant who has read about it.
- The final sentence must create forward momentum, not anxiety. It should leave the user feeling they have a next move, not feeling stuck.

CALIBRATION EXAMPLES of the exact tone, length, and voice required:

Example 1 (SEO Specialist, Very High, Tier 1, curious):
"What's happening in NZ agencies right now is real, teams of three are being replaced by one person with the right AI setup, and the junior roles go first. You're in a function where that pattern is already playing out, not coming eventually. The good news is that the people keeping their jobs aren't the most experienced SEO specialists, they're the ones who figured out how to direct the tools. That's a skill you can build faster than you think."

Example 2 (Marketing Coordinator, High, Tier 2, avoiding):
"The anxiety you feel about AI in your role is not paranoia, it's accurate pattern recognition. Coordinator-level marketing roles are where NZ agencies are making the first cuts, because the execution tasks that fill most of your day are exactly what AI handles well. That doesn't mean your career is over, it means the version of your role that survives looks different from the one you were hired for. The shift isn't as hard as it feels from the outside."

Example 3 (Senior Marketing Manager, Moderate, Tier 2, daily):
"You're already using AI daily, which puts you ahead of most people in your function, but using it for tasks is different from building it into how your whole team works. The senior marketing managers who are thriving in 2026 are the ones who've become the person their organisation comes to for AI decisions, not just AI outputs. You have the experience to do that. The question is whether you move toward it deliberately or wait for someone else to define the role."

Example 4 (Registered Nurse, Low, Tier 4, curious):
"Your clinical work is genuinely more protected than most, physical presence, human judgment, and regulated accountability are things AI cannot replicate in a care setting. What is changing is the admin and documentation load around your role, which AI is starting to handle well. That could actually free up more of your time for the work only you can do, if your employer implements it thoughtfully."

Example 5 (Junior Accountant, Very High, Tier 1, avoiding):
"The honest version is that the processing and reporting work that takes up most of a junior accounting role is already being done by AI at firms that have adopted it, and the ones that haven't are moving in that direction. This isn't a reason to leave accounting. It's a reason to move toward the parts of the work that require human judgment, client relationships, and advisory thinking faster than you might have planned. The pathway exists. It just starts now instead of in five years."

Match this voice exactly. Short, direct, second-person, NZ-grounded, specific to the user's situation. No consultant language. No generic AI commentary.

You also generate task lists and an agent note for other parts of the page. Keep those as short, role-specific action phrases (4 to 7 words). The honest_picture must stand alone and never overlap in content with agent_note or agent_tasks.

Return ONLY the structured tool call.`;

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
        model: "google/gemini-2.5-pro",
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
