import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ========================================================================
// HONEST PICTURE — Hybrid template approach.
// Fixed opening sentence per (band x segment) + AI-generated 1-2 sentence
// variable clause that personalises to the role + AI-generated forward
// momentum closing sentence.
// This guarantees voice consistency and prevents banned-phrase drift.
// ========================================================================

type Band = "Low" | "Moderate" | "High" | "Very High";
type Segment = "avoiding" | "curious" | "occasional" | "daily" | "building";

// Fixed opening sentences. These are non-negotiable copy from the founder.
// Em dashes intentionally avoided per house style.
const OPENINGS: Partial<Record<Band, Partial<Record<Segment, string>>>> = {
  "Very High": {
    avoiding:
      "NZ agencies and teams are restructuring around AI right now, and the people coming out ahead are not the most experienced ones, they are the ones who moved early.",
    curious:
      "Your function is one of the first places NZ businesses are restructuring around AI, and being curious about it already puts you ahead of most people in your position.",
    occasional:
      "You have already started using AI, which means you have a head start on most people in your function, the question now is whether you build on it deliberately.",
    daily:
      "Daily AI use already puts you in the top tier of your function in NZ. The gap now is moving from using it for tasks to understanding which parts of your role it is changing structurally.",
    building:
      "Building with AI puts you ahead of almost everyone in your function, the people most at risk are the ones who have not started yet, and that is not you.",
  },
  "High": {
    avoiding:
      "Your role has real exposure, and the honest version is that the window to get ahead of it is open right now, which is a better position than finding out after the restructure.",
    curious:
      "Being curious about this is the right response, your role sits in territory where AI is moving fast, and paying attention early is exactly how people stay ahead of it.",
    occasional:
      "You are already using AI occasionally, which means the shift to systematic use is closer than it feels, and that shift is what separates the roles that compress from the ones that do not.",
    daily:
      "Using AI daily already changes your risk profile in a meaningful way. You are more adaptable than your score alone suggests, and that adaptability is what matters most right now.",
    building:
      "Building with AI puts you in a strong position relative to most people in your function, your practical experience with agents and automations is genuinely protective in a way that no course or certification can replicate.",
  },
  // Moderate and Low fall back to AI-generated openings (see MODERATE_LOW_GUIDANCE)
};

// Tone guidance for Moderate and Low bands where we still generate the
// opening with AI (no fixed copy yet). The variable-clause prompt below
// references this when bandKey is moderate or low.
const MODERATE_LOW_GUIDANCE: Record<"Moderate" | "Low", string> = {
  Moderate:
    "Moderate-risk role: disruption is real but slower, augmentation before replacement, the window to adapt is 12 to 24 months. Open by acknowledging where the user is, not by talking about AI in the abstract.",
  Low:
    "Low-risk role: be honest the risk is lower without dismissing it. The world around them is still changing. Open by acknowledging the real protection in their work.",
};

// ========================================================================
// VARIABLE CLAUSE SYSTEM PROMPT
// ========================================================================

const CLAUSE_SYSTEM = `You are Hillary Woods, founder of Humanise, a New Zealand AI workforce risk tool. You write in first-person founder voice, second-person to the reader. You are direct, warm, honest. You sound like a trusted colleague who knows the NZ market, not a consultant.

Your job in this call is to write the MIDDLE and CLOSING of a "Your Honest Picture" paragraph. The OPENING sentence has already been written for you and will be prepended to your output. You must write 2 to 3 sentences that follow naturally from the given opening, are specific to the user's role, and end with forward momentum.

The person reading this paragraph may be anxious. Your job is not to confirm their fear or dismiss it, it is to tell them the truth and leave them feeling like action is possible. Every paragraph should end with the reader thinking "I can do something about this" not "I am probably going to lose my job." Honest does not mean alarming. Direct does not mean harsh.

HARD RULES (output will be rejected if any are broken)
1. Output 2 to 3 sentences only. No more.
2. Do not repeat or paraphrase the opening sentence you are given.
3. Do not begin with "And", "But", "So", or "Also".
4. No em dashes. Use commas or full stops.
5. Never use the user's job title in the first 8 words of your output.
6. Never repeat the score number, band name, or tier name.
7. Banned words and phrases: "rapidly", "rapid", "landscape", "ever-changing", "evolving", "revolutionising", "revolutionizing", "fundamentally rewriting", "fundamentally reshaping", "navigate the", "shifting from a", "your value is shifting", "leverage", "significant", "it is important", "in today's", "Kiwi intuition", "Kiwi ingenuity", "Kiwi humor", "high-level strategic architect", "editor-in-chief", "number cruncher", "grunt work", "heavy lifting", "the heart of your job", "doer", "Black Box".
8. The final sentence must create forward momentum. Specific, concrete, achievable. Not "the future is bright", not "embrace the change". Something like "that is a skill you can build faster than you think" or "the pathway exists, it just starts now instead of in five years".
9. Do not output bullet points, headers, or quotes. Just the prose, ready to be appended to the opening.

Output the 2 to 3 sentences only. No preface. No quotes. No follow-up.`;

// ========================================================================
// TASKS + AGENT NOTE — separate structured call
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

function stripEmDashes(s: string): string {
  if (!s) return "";
  return s
    .replace(/[\u2014\u2013]/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Strip leading conjunctions like "And ", "But ", "So ", "Also ", and any
// surrounding quotes the model sometimes wraps the output in.
function cleanClause(s: string): string {
  if (!s) return "";
  let out = s.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  out = out.replace(/^(and|but|so|also|moreover|furthermore)[,\s]+/i, "");
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

function normaliseBand(raw: unknown): Band {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v.startsWith("very")) return "Very High";
  if (v.startsWith("high")) return "High";
  if (v.startsWith("mod")) return "Moderate";
  if (v.startsWith("low")) return "Low";
  return "Moderate";
}

function normaliseSegment(raw: unknown): Segment {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "avoiding" || v === "curious" || v === "occasional" || v === "daily" || v === "building") return v;
  return "curious";
}

const HP_TOOL = [{
  type: "function",
  function: {
    name: "return_tasks",
    description: "Return task lists, agent note, and Agent Watch fields.",
    parameters: {
      type: "object",
      properties: {
        tasks_at_risk:    { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        protective_tasks: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        agent_note:       { type: "string" },
        agent_tasks:      { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        agent_reality:    { type: "string", description: "2-3 sentences specific to this occupation describing what autonomous AI agents are doing right now in this role. Name 2-3 specific real tools (e.g. Semrush AI, BrightEdge Copilot, custom GPT-4o pipelines, Microsoft Copilot, Make.com). Be concrete about what work is being absorbed." },
        agent_reality_email: { type: "string", description: "4 to 5 sentences. A SIGNIFICANTLY EXPANDED version of agent_reality, written for the email the user just gave their address to receive. It must go deeper than agent_reality and contain information NOT visible on the results page. Name specific tools, specific NZ businesses or industry patterns where known, specific timelines, and specific tasks being automated right now. Do NOT repeat agent_reality verbatim, expand and deepen it. No em dashes." },
        nz_signal:        { type: "string", description: "2 sentences with at least one specific NZ-grounded data point (job-ad changes, hiring trend, NZ industry shift since 2025) relevant to this occupation. No generic claims." },
        your_move:        { type: "string", description: "2-3 sentences. One concrete 30-day action the user can take, then one direct sentence about what separates the people keeping their roles from the ones being compressed. Direct, specific, no platitudes." },
        locked_preview:   { type: "string", description: "Maximum 2 sentences. Write one locked teaser that creates a specific unresolved question about THIS person's situation. Reference their occupation by name and their agent tier reality. Make them feel like there is one piece of information about their specific role that would change how they think about their next 90 days. End with a direct question to the reader. Do NOT use the words unlock, discover, or exclusive. Do NOT promise tips, strategies, or insights. Do NOT sound like a marketing headline or pricing-page copy. No em dashes." },
        locked_content_full: { type: "string", description: "3 to 4 sentences. The expanded answer to the locked_preview teaser. This is the most valuable content in the Humanise product. It must contain specific, actionable intelligence about THIS occupation in NZ that is NOT visible anywhere else on the results page. Name specific tools, specific tasks, specific timelines, specific NZ regions or company types where known. Do NOT repeat anything from agent_reality, nz_signal, your_move, or locked_preview. This is the insight that makes the user think: I needed to know that. No em dashes." },
      },
      required: ["tasks_at_risk", "protective_tasks", "agent_note", "agent_tasks", "agent_reality", "agent_reality_email", "nz_signal", "your_move", "locked_preview", "locked_content_full"],
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

// Quick post-generation gate: if banned phrases slip through, retry once
// with explicit feedback to the model.
const BANNED_PATTERNS: RegExp[] = [
  /\brapidly\b/i, /\brapid\b/i, /\blandscape\b/i, /\bever-changing\b/i,
  /\bevolving\b/i, /\brevolutionis(?:e|ing|ed)\b/i, /\brevolutioniz(?:e|ing|ed)\b/i,
  /\bfundamentally (?:rewriting|reshaping)\b/i, /\bnavigate the\b/i,
  /\bshifting from a\b/i, /\byour value is shifting\b/i, /\bleverage\b/i,
  /\bsignificant\b/i, /\bit is important\b/i, /\bin today's\b/i,
  /\bKiwi (?:intuition|ingenuity|humor|humour)\b/i,
  /\bnumber cruncher\b/i, /\bgrunt work\b/i, /\bheavy lifting\b/i,
  /\bthe heart of your job\b/i, /\bblack box\b/i, /\bdoer\b/i,
  /\beditor-in-chief\b/i, /\bhigh-level strategic architect\b/i,
];

function findBannedPhrase(s: string): string | null {
  for (const re of BANNED_PATTERNS) {
    const m = s.match(re);
    if (m) return m[0];
  }
  return null;
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

    const bandKey = normaliseBand(band);
    const segKey = normaliseSegment(aiRelationshipSegment);
    const toolsList = Array.isArray(aiTools) && aiTools.length ? aiTools.join(", ") : "none specified";

    // ---------- Resolve fixed opening (or generate one for Mod/Low) ----------
    const fixedOpening = OPENINGS[bandKey]?.[segKey] ?? null;

    // ---------- Build clause prompt ----------
    const clauseInstructions = fixedOpening
      ? `OPENING SENTENCE (already written, will be prepended to your output, do NOT repeat or rephrase):
"${fixedOpening}"

Write 2 to 3 sentences that follow naturally from this opening. The middle should be specific to the user's role and what is actually changing in it. The closing must create forward momentum.`
      : `No fixed opening. Write the entire paragraph (3 to 4 sentences total) yourself.

Tone guidance for this band:
${MODERATE_LOW_GUIDANCE[bandKey === "Moderate" ? "Moderate" : "Low"]}

Open by acknowledging the user's situation, not by talking about AI in the abstract. Close with forward momentum.`;

    const clauseUserPrompt = `${clauseInstructions}

USER CONTEXT
Occupation (matched): ${jobTitle}
Raw job title entered: ${rawJobTitle || jobTitle}
Risk band: ${bandKey}
Agent tier: ${agentTier || "unspecified"}
AI tools the user actually uses: ${toolsList}
AI relationship segment: ${segKey}
NZ region: ${region || "New Zealand"}
Industry: ${industry || "unspecified"}

Output only the prose. No quotes. No labels.`;

    async function generateClause(retryFeedback?: string): Promise<string> {
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: CLAUSE_SYSTEM },
        { role: "user", content: clauseUserPrompt },
      ];
      if (retryFeedback) {
        messages.push({ role: "user", content: `Your previous draft was rejected: ${retryFeedback}. Rewrite it without the issue. Same constraints. Output only the prose.` });
      }
      const resp = await callGateway({
        model: "google/gemini-2.5-pro",
        messages,
      }, LOVABLE_API_KEY);
      if (!resp.ok) {
        const t = await resp.text();
        console.error("Clause gateway error", resp.status, t);
        if (resp.status === 429) throw new Error("RATE_LIMIT");
        if (resp.status === 402) throw new Error("CREDITS");
        throw new Error("GATEWAY");
      }
      const data = await resp.json();
      return cleanClause(stripEmDashes(data.choices?.[0]?.message?.content ?? ""));
    }

    let clause = "";
    try {
      clause = await generateClause();
      const banned = findBannedPhrase(clause);
      if (banned) {
        console.log(`[honest-picture] retrying due to banned phrase: ${banned}`);
        clause = await generateClause(`it contained the banned phrase "${banned}"`);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "GATEWAY";
      if (code === "RATE_LIMIT") {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (code === "CREDITS") {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Final scrub: even after retry, strip any remaining banned phrase by
    // truncating the offending sentence rather than shipping it.
    const finalBanned = findBannedPhrase(clause);
    if (finalBanned) {
      console.warn(`[honest-picture] banned phrase persisted after retry: ${finalBanned}`);
    }

    const honest_picture = stripEmDashes(
      fixedOpening ? `${fixedOpening} ${clause}`.trim() : clause
    );

    // ---------- Tasks call (parallelisable but sequential is fine) ----------
    const tasksUserPrompt = `Generate task lists and Agent Watch fields for this person.

Occupation: ${jobTitle}
Raw job title entered: ${rawJobTitle || jobTitle}
Industry: ${industry || "unspecified"}
NZ region: ${region || "New Zealand"}
Risk band: ${bandKey}
Agent tier: ${agentTier || "unspecified"}
Regularly uses AI: ${usesAi ? "yes" : "no"}

Return ALL of these fields:

TASK LISTS
- tasks_at_risk: 3 short action phrases (4 to 7 words) for the most automatable tasks in this role.
- protective_tasks: 3 short action phrases (4 to 7 words) for what makes this role hard to fully automate.
- agent_note: Name one of (Microsoft Copilot, ChatGPT, Google Gemini, Make.com, Manus) and give one concrete example of what it handles in this role. Under 30 words. For trades/healthcare/hands-on physical work, write "This role has strong natural protection from AI agents because [reason]" without naming a tool.
- agent_tasks: 3 specific tasks AI agents are handling today in this occupation. Action verb start. Max 12 words each.

AGENT WATCH FIELDS
- agent_reality: 2 to 3 sentences specific to this occupation. Describe what autonomous AI agents are doing right now in this exact role. Name 2 to 3 specific real tools (e.g. Semrush AI, BrightEdge Copilot, custom GPT-4o pipelines, Microsoft Copilot, Make.com, Manus, Claude). Be concrete about what work is being absorbed. Mention NZ digital agencies or NZ businesses where natural. Do NOT repeat the agent_note content.
- nz_signal: 2 sentences. Include at least one specific NZ data point relevant to this occupation (e.g. AI mentions in NZ job ads have risen 143.5% since March 2025; junior coordinator roles being advertised less; senior roles increasingly listing AI proficiency as baseline). No generic global claims.
- your_move: 2 to 3 sentences. Sentence one is one concrete 30-day action specific to this role (e.g. "Spend the next 30 days building one AI-assisted SEO workflow you own completely, site audit automation, content briefing, or monthly reporting"). Sentence two is one direct sentence about what separates the people keeping their roles from the ones being compressed. Direct, specific, no platitudes.
- locked_preview: Maximum 2 sentences. Write one teaser that creates a specific, unresolved question about THIS person's situation. Reference the occupation by name and the agent tier reality. Make them feel there is one piece of information about their specific role that would change how they think about their next 90 days. End with a direct question to the reader. Banned words: unlock, discover, exclusive, tips, strategies, insights, premium. Do not sound like a marketing headline. No em dashes.
- locked_content_full: 3 to 4 sentences. The EXPANDED answer to the locked_preview teaser, written for the email the user just gave their address to receive. This is the deepest, most specific intelligence in the entire product. It MUST contain information not visible on the results page: name specific NZ regions, specific company types, specific tools, specific tasks, specific timelines (e.g. "Canterbury and Auckland agencies are trialling agent-first SEO workflows where one senior strategist directs a stack of agents handling audits, briefs, and reporting. The roles surviving are not generalist coordinators, they are specialists in technical architecture, client strategy, or AI workflow design. The window to make that move deliberately is roughly 6 to 12 months."). Do NOT repeat anything from agent_reality, nz_signal, your_move, or locked_preview. No em dashes.

EXAMPLES OF THE RIGHT TONE FOR locked_preview (do not copy verbatim, match the structure)
- SEO Specialist (Tier 1): "There are three specific SEO tasks agents cannot yet do reliably, and whether your current role focuses on any of them determines how exposed you actually are. Does yours?"
- Marketing Coordinator (Tier 2): "The agencies in NZ that restructured last quarter kept one type of coordinator and cut another. The difference was not seniority or salary. Do you know which side of that line your role sits on?"
- Junior Accountant (Tier 1): "Two accounting tasks are disappearing from NZ job ads faster than any others right now. If either of them describes most of your week, your timeline is shorter than your score suggests. Want to know what they are?"
- Registered Nurse (Tier 4): "Your clinical work is protected, but one part of your role is changing faster than most nurses realise. It is not what you would expect. Do you know what it is?"

No em dashes anywhere. No phrases ending in prepositions/conjunctions/articles in the task arrays.`;

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
    let agent_reality = "";
    let agent_reality_email = "";
    let nz_signal = "";
    let your_move = "";
    let locked_preview = "";
    let locked_content_full = "";

    if (tResp.ok) {
      const tData = await tResp.json();
      const msg = tData.choices?.[0]?.message;
      const toolCall = msg?.tool_calls?.[0];
      let parsed: {
        tasks_at_risk?: string[]; protective_tasks?: string[];
        agent_note?: string; agent_tasks?: string[];
        agent_reality?: string; agent_reality_email?: string; nz_signal?: string;
        your_move?: string; locked_preview?: string;
        locked_content_full?: string;
      } = {};
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
      agent_reality    = stripEmDashes((parsed.agent_reality ?? "").trim());
      agent_reality_email = stripEmDashes((parsed.agent_reality_email ?? "").trim());
      nz_signal        = stripEmDashes((parsed.nz_signal ?? "").trim());
      your_move        = stripEmDashes((parsed.your_move ?? "").trim());
      locked_preview   = stripEmDashes((parsed.locked_preview ?? "").trim());
      locked_content_full = stripEmDashes((parsed.locked_content_full ?? "").trim());
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
        agent_reality,
        agent_reality_email,
        nz_signal,
        your_move,
        locked_preview,
        locked_content_full,
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
