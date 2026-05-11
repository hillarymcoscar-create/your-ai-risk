import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// ========================================================================
// HONEST PICTURE — Hybrid paragraph.
// Sentence 2 is hardcoded NZ market data (display_message from
// humanise-scores.json, or ANZSCO group template from nz-job-trends.json).
// Sentences 1, 3, 4 are AI-generated, grounded in O*NET task anchors passed
// by the frontend from the already-loaded humanise-scores.json record.
// Final order: [AI S1] [hardcoded S2] [AI S2 → pos 3] [AI S3 → pos 4]
// ========================================================================

type Band = "Low" | "Moderate" | "High" | "Very High";
type Segment = "avoiding" | "curious" | "occasional" | "daily" | "building";

// ========================================================================
// ANZSCO GROUP LOOKUP
// Derived from nz-job-trends.json onet_match arrays.
// Priority rules handle shared O*NET major groups (17-3, 29-2, 51, 53).
// ========================================================================

function getAnzscoGroup(onetCode: string): string | null {
  if (!onetCode) return null;
  const prefix4 = onetCode.slice(0, 4); // e.g. "17-3"
  const prefix2 = onetCode.slice(0, 2); // e.g. "17"

  // More-specific overrides first (17 and 29 are split between Professionals and Technicians)
  if (prefix4 === "17-3") return "Technicians and Trades Workers";
  if (prefix4 === "29-2") return "Technicians and Trades Workers";

  switch (prefix2) {
    case "11": return "Managers";
    case "13": case "15": case "17": case "19":
    case "21": case "23": case "25": case "27": case "29":
      return "Professionals";
    case "31": case "33": case "35": case "39":
      // 33 = Protective Services → Community and Personal Service per brief
      return "Community and Personal Service Workers";
    case "37": case "45": return "Labourers";
    case "41": return "Sales Workers";
    case "43": return "Clerical and Administrative Workers";
    case "47": case "49": return "Technicians and Trades Workers";
    case "51": case "53": return "Machinery Operators and Drivers"; // 51 tie-break → Machinery per brief
    case "55": return "Technicians and Trades Workers"; // Military → Technicians per brief
    default: return null; // Unknown → skip sentence 2
  }
}

const GROUP_LABELS: Record<string, string> = {
  "Managers": "management",
  "Professionals": "professional",
  "Technicians and Trades Workers": "technician and trades",
  "Community and Personal Service Workers": "community and personal service",
  "Clerical and Administrative Workers": "clerical and administrative",
  "Sales Workers": "sales",
  "Machinery Operators and Drivers": "machinery operator and driver",
  "Labourers": "labouring",
};

// ========================================================================
// AI PROMPT — 3 sentences only (sentence 2 is hardcoded separately)
// ========================================================================

const CLAUSE_SYSTEM = `You are writing a clear-eyed, specific paragraph for a New Zealand worker who has just found out their AI automation risk score. You will produce exactly 3 sentences. A separate hardcoded sentence about the NZ job market will be inserted between your sentence 1 and sentence 2.

Their job title: {occupation}
Their risk score: {score}%
Their location: {location}
Their industry: {industry}

Tasks they do that are exposed to automation (use as anchor for sentence 1):
- {task_at_risk_0}
- {task_at_risk_1}
- {task_at_risk_2}

Tasks where human judgement still matters (use as anchor for sentence 2 of your output):
- {protective_task_0}
- {protective_task_1}
- {protective_task_2}

The provided task descriptions may be truncated mid-phrase. Treat them as topic anchors for what the role involves, not as verbatim quotes.

Output format — exactly 3 complete sentences, in this order:

Sentence 1: Describe what AI is currently doing to one or two of the exposed tasks listed above. Speak generally about the capability — describe what AI does, not which specific product does it. Do NOT name AI tools, products, or company brands (no ChatGPT, Claude, Gemini, Copilot, Salesforce, Xero, etc.). Use "AI systems" or "current AI tools" instead.

Sentence 2: Identify what part of the role still requires human judgement, drawing on the protective tasks listed above. Be specific about why the human element matters — not generic ("relationships matter") but concrete (what the human is actually doing that AI can't replicate).

Sentence 3: A directional sentence about action. The workers staying valuable in this role are the ones who learn to direct AI rather than avoid it. Make it specific to the occupation, anti-passive, not chirpy. No calls to action, no "you should", no exclamation marks.

Constraints:
- Respond in English only. Use only Latin characters — never any Chinese, Japanese, or Korean characters.
- The user is in New Zealand. When referring to money, use NZ dollars (NZD or $). NEVER use pounds (£), euros (€), or any other currency. NEVER use UK or US geographic references (no "high street", no "Main Street", no "across the pond").
- Do not name specific AI products, companies, or tool brands.
- Do not invent NZ-specific statistics or claims about NZ employer behaviour. The hardcoded sentence handles NZ market context.
- Do not use any of these phrases anywhere in your output: leverage, navigate, navigating, evolving, landscape, rapidly, future-proof, stay ahead, adaptable, irreplaceable, in today's, significant, meaningful way.
- Tone: clear-eyed, specific, anti-corporate. Like a smart friend telling the truth, not a coach or consultant.
- Each sentence MUST be a grammatically complete sentence ending in a period. NEVER end mid-thought or mid-clause. If you are running out of room, write shorter sentences — do not truncate.`;

// ========================================================================
// TASKS + AGENT NOTE — separate structured call (unchanged)
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
    .replace(/[—–]/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Remove CJK characters (Chinese, Japanese, Korean) that occasionally bleed
// through from Gemini. Preserves Latin Extended (ā ē ī ō ū etc.) for te reo Māori.
function stripCJK(s: string): string {
  if (!s) return "";
  return s
    .replace(/[一-鿿぀-ゟ゠-ヿ가-힯]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanClause(s: string): string {
  if (!s) return "";
  let out = s.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  out = out.replace(/^(and|but|so|also|moreover|furthermore)[,\s]+/i, "");
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

function ensureCompleteEnding(s: string): string {
  const out = stripEmDashes(s).trim();
  if (!out) return "";
  if (/[.!?]["')\]]?$/.test(out)) return out;

  const sentenceMatches = [...out.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentence = sentenceMatches.at(-1);
  if (lastSentence?.index !== undefined) {
    return out.slice(0, lastSentence.index + 1).trim();
  }

  return `${out.replace(/[,:;\-\s]+$/g, "").trim()}.`;
}

function extractCompleteSentences(s: string): string[] {
  return (stripEmDashes(s).match(/[^.!?]+[.!?](?:["')\]]+)?/g) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);
}

function normaliseThreeSentenceParagraph(s: string): string {
  const sentences = extractCompleteSentences(s);
  if (sentences.length >= 3) {
    return sentences.slice(0, 3).join(" ").trim();
  }
  return ensureCompleteEnding(s);
}

function sentenceCount(s: string): number {
  return extractCompleteSentences(s).length;
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

// Safe template fill: avoids $ replacement-pattern issues from String.replace
function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.split(k).join(v), template);
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
        protective_skill_keywords: {
          type: "array",
          items: { type: "string", description: "2-3 word industry-standard keyword phrase summarising the matching protective_tasks entry. Keywords only, never a full sentence." },
          minItems: 3,
          maxItems: 3,
          description: "One short 2-3 word keyword phrase per protective_tasks entry, in the same order. Used for platform course searches.",
        },
        agent_note:       { type: "string" },
        agent_tasks:      { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        agent_reality:    { type: "string", description: "2-3 sentences specific to this occupation describing what autonomous AI agents are doing right now in this role. Name 2-3 specific real tools (e.g. Semrush AI, BrightEdge Copilot, custom GPT-4o pipelines, Microsoft Copilot, Make.com). Be concrete about what work is being absorbed." },
        agent_reality_email: { type: "string", description: "4 to 5 sentences. A SIGNIFICANTLY EXPANDED version of agent_reality, written for the email the user just gave their address to receive. It must go deeper than agent_reality and contain information NOT visible on the results page. Name specific tools, specific NZ businesses or industry patterns where known, specific timelines, and specific tasks being automated right now. Do NOT repeat agent_reality verbatim, expand and deepen it. No em dashes." },
        nz_signal:        { type: "string", description: "2 sentences with at least one specific NZ-grounded data point (job-ad changes, hiring trend, NZ industry shift since 2025) relevant to this occupation. No generic claims." },
        your_move:        { type: "string", description: "EXACTLY ONE sentence. One concrete 30-day action the user can take, specific to this role. Direct, specific, no platitudes. MUST NOT mention humanise.nz, Humanise, the email, the report, the results page, or any link or URL. MUST NOT contain any follow-on sentence after the action. Just the single action sentence and nothing else." },
        locked_preview:   { type: "string", description: "Maximum 2 sentences. Write one locked teaser that creates a specific unresolved question about THIS person's situation. Reference their occupation by name and their agent tier reality. Make them feel like there is one piece of information about their specific role that would change how they think about their next 90 days. End with a direct question to the reader. Do NOT use the words unlock, discover, or exclusive. Do NOT promise tips, strategies, or insights. Do NOT sound like a marketing headline or pricing-page copy. No em dashes." },
        locked_content_full: { type: "string", description: "3 to 4 sentences. The expanded answer to the locked_preview teaser. This is the most valuable content in the Humanise product. It must contain specific, actionable intelligence about THIS occupation in NZ that is NOT visible anywhere else on the results page. Name specific tools, specific tasks, specific timelines, specific NZ regions or company types where known. Do NOT repeat anything from agent_reality, nz_signal, your_move, or locked_preview. This is the insight that makes the user think: I needed to know that. No em dashes. End with 2 sentences: sentence 1 references something concrete and specific to this occupation that Humanise has data on and the reader has not yet seen (a specific task, trend, or comparison, not a generic teaser); sentence 2 directs the reader back to humanise.nz using one of: 'See the full breakdown for your role at humanise.nz' / 'Your full results are waiting at humanise.nz' / 'The complete picture for your role is at humanise.nz'. The ending must NOT be a question and must NOT end with a question mark. It must always end with humanise.nz as the destination." },
      },
      required: ["tasks_at_risk", "protective_tasks", "protective_skill_keywords", "agent_note", "agent_tasks", "agent_reality", "agent_reality_email", "nz_signal", "your_move", "locked_preview", "locked_content_full"],
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

// Trimmed to only the phrases explicitly listed in CLAUSE_SYSTEM constraints.
const BANNED_PATTERNS: RegExp[] = [
  /\bleverage\b/i,
  /\bnavigate\b/i,
  /\bevolving\b/i,
  /\blandscape\b/i,
  /\brapidly\b/i,
  /\bfuture[- ]proof\b/i,
  /\bstay ahead\b/i,
  /\badaptable\b/i,
  /\birreplaceable\b/i,
  /\bin today's\b/i,
  /\bsignificant\b/i,
  /\bmeaningful way\b/i,
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
      // New fields passed from frontend (from already-loaded humanise-scores.json record)
      onetCode,
      tasksAtRisk,
      protectiveTasks,
      nzMarketSignal,
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

    // ---- Defensive validation of task arrays ----
    const hasValidTasks = Array.isArray(tasksAtRisk) && tasksAtRisk.length > 0;
    const hasValidProtective = Array.isArray(protectiveTasks) && protectiveTasks.length > 0;

    if (!hasValidTasks || !hasValidProtective) {
      console.warn(
        `[honest-picture] missing task data for "${jobTitle}" (onetCode: ${onetCode ?? "none"}) — using generic fallback anchors`
      );
    }

    const taskList: string[] = hasValidTasks
      ? (tasksAtRisk as string[])
      : [`tasks performed as ${jobTitle}`, "data processing and reporting", "documentation and record keeping"];

    const protectiveList: string[] = hasValidProtective
      ? (protectiveTasks as string[])
      : ["client and stakeholder communication", "complex judgement and decision making", "relationship and contextual understanding"];

    // ---- Build sentence 2 (hardcoded NZ market data) ----
    let hardcodedS2: string | null = null;

    if (typeof nzMarketSignal === "string" && nzMarketSignal.trim()) {
      // Use the display_message from humanise-scores.json directly
      hardcodedS2 = nzMarketSignal.trim();
    } else {
      // Fallback: derive ANZSCO group from onetCode, fetch nz-job-trends.json, build template
      const anzscoGroup = onetCode ? getAnzscoGroup(String(onetCode)) : null;

      if (anzscoGroup) {
        try {
          const trendsResp = await fetch(
            "https://cdn.jsdelivr.net/gh/hillarymcoscar-create/humanise-data@main/nz-job-trends.json"
          );
          if (trendsResp.ok) {
            const trends = await trendsResp.json();
            const occ = (trends.occupations ?? []).find(
              (o: { mbie_category: string }) => o.mbie_category === anzscoGroup
            );
            if (occ) {
              const label = GROUP_LABELS[anzscoGroup] ?? anzscoGroup.toLowerCase();
              const yoy: number = occ.yoy_change_percent ?? 0;
              let descriptor: string;
              if (yoy >= 10) descriptor = "growing strongly";
              else if (yoy >= 3) descriptor = "growing";
              else if (yoy >= -3) descriptor = "stable";
              else descriptor = "declining";
              const direction = yoy >= 0 ? "up" : "down";
              const absYoy = Math.abs(yoy).toFixed(1);
              hardcodedS2 = `In New Zealand, ${label} roles are ${descriptor} — job ad volume ${direction} ${absYoy}% over the past year (MBIE Jobs Online, Dec 2025).`;
            }
          }
        } catch (e) {
          console.warn("[honest-picture] failed to fetch nz-job-trends:", e);
          // hardcodedS2 stays null → paragraph will be 3 sentences only
        }
      } else {
        console.warn(
          `[honest-picture] no ANZSCO mapping for onetCode "${onetCode ?? "none"}" — skipping hardcoded sentence 2`
        );
        // hardcodedS2 stays null → do not fabricate; return 3-sentence paragraph
      }
    }

    // ---- Build and fill AI prompt ----
    const clauseSystemFilled = fillTemplate(CLAUSE_SYSTEM, {
      "{occupation}":      String(jobTitle),
      "{score}":           String(score ?? ""),
      "{location}":        String(region || "New Zealand"),
      "{industry}":        String(industry || "unspecified"),
      "{task_at_risk_0}":  taskList[0] ?? "",
      "{task_at_risk_1}":  taskList[1] ?? "",
      "{task_at_risk_2}":  taskList[2] ?? "",
      "{protective_task_0}": protectiveList[0] ?? "",
      "{protective_task_1}": protectiveList[1] ?? "",
      "{protective_task_2}": protectiveList[2] ?? "",
    });

    const clauseUserPrompt = `Generate the 3 sentences for ${jobTitle} (${rawJobTitle || jobTitle}) in ${region || "New Zealand"}, industry ${industry || "unspecified"}, risk band ${bandKey}. Output only the prose. No quotes, no labels, no numbering.`;

    // ---- Generate AI clause (up to 3 attempts) ----
    async function generateClause(retryFeedback?: string): Promise<{ text: string; finishReason: string | null }> {
      const messages: Array<{ role: string; content: string }> = [
        { role: "user", content: clauseUserPrompt },
      ];
      if (retryFeedback) {
        messages.push({
          role: "user",
          content: `Your previous draft was rejected: ${retryFeedback}. Rewrite it without the issue. Same constraints. Output only the prose.`,
        });
      }
      const resp = await callGateway({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        max_tokens: 800,
        messages: [
          { role: "system", content: clauseSystemFilled },
          ...messages,
        ],
      }, LOVABLE_API_KEY);
      if (!resp.ok) {
        let bodyText = "<unread>";
        try { bodyText = await resp.text(); } catch (readErr) {
          console.error("[honest-picture] clause: failed to read response body", readErr);
        }
        console.error("[honest-picture] clause gateway non-2xx", {
          status: resp.status,
          statusText: resp.statusText,
          contentType: resp.headers.get("content-type"),
          body: bodyText.slice(0, 2000),
        });
        if (resp.status === 429) throw new Error("RATE_LIMIT");
        if (resp.status === 402) throw new Error("CREDITS");
        throw new Error("GATEWAY");
      }
      const data = await resp.json();
      const choice = data.choices?.[0] ?? {};
      // Apply CJK strip before all other cleaning
      const raw = stripCJK(cleanClause(stripEmDashes(choice.message?.content ?? "")));
      return {
        text: raw,
        finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
      };
    }

    let clause = "";
    let clauseFinishReason: string | null = null;
    let clauseAccepted = false;
    try {
      let retryFeedback: string | undefined;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const draft = await generateClause(retryFeedback);
        clause = draft.text;
        clauseFinishReason = draft.finishReason;

        const banned = findBannedPhrase(clause);
        const count = sentenceCount(clause);
        const stoppedEarly = clauseFinishReason === "length" || clauseFinishReason === "max_tokens";

        if (!banned && count === 3 && !stoppedEarly) {
          clauseAccepted = true;
          break;
        }

        const problems: string[] = [];
        if (banned) problems.push(`it contained the banned phrase "${banned}"`);
        if (count !== 3) problems.push(`it returned ${count} complete sentences instead of exactly 3`);
        if (stoppedEarly) problems.push(`it stopped early with finish_reason=${clauseFinishReason}`);

        retryFeedback = `${problems.join("; ")}. Rewrite as exactly 3 complete sentences.`;
        console.warn(`[honest-picture] retrying clause (attempt ${attempt + 1}): ${retryFeedback}`);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "GATEWAY";
      console.error("[honest-picture] clause generation failed", {
        code,
        errorName: err instanceof Error ? err.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        jobTitle,
        onetCode,
        bandKey,
      });
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

    if (!clauseAccepted) {
      console.error("[honest-picture] clause failed all 3 attempts", {
        finishReason: clauseFinishReason,
        sentenceCount: sentenceCount(clause),
        bannedPhrase: findBannedPhrase(clause),
        jobTitle,
        onetCode,
      });
      return new Response(JSON.stringify({
        error: "Could not generate a clean honest picture after 3 attempts. Showing fallback.",
        code: "CLAUSE_RETRY_EXHAUSTED",
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Stitch final paragraph ----
    // AI returns 3 sentences (positions 1, 3, 4 in final output).
    // Hardcoded S2 is inserted between AI sentence 1 and AI sentence 2.
    const aiSentences = extractCompleteSentences(normaliseThreeSentenceParagraph(clause));
    const aiS1 = aiSentences[0] ?? "";
    const aiS2 = aiSentences[1] ?? "";
    const aiS3 = aiSentences[2] ?? "";

    // Defensive: ensure each sentence is trimmed of leading whitespace/stray
    // punctuation and ends with terminal punctuation before joining. This makes
    // the stitched paragraph robust to whatever lands in display_message or the
    // ANZSCO fallback template.
    const ensureSentence = (s: string | null | undefined): string => {
      if (!s) return "";
      const cleaned = s.replace(/^[\s\u00A0,;:\-–—]+/, "").trim();
      if (!cleaned) return "";
      return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
    };

    const honest_picture = [aiS1, hardcodedS2, aiS2, aiS3]
      .map(ensureSentence)
      .filter(Boolean)
      .join(" ")
      .trim();

    // ---- Tasks call ----
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
- protective_skill_keywords: For each protective_tasks entry, output a 'searchKeywords'-style string containing a short 2-3 word keyword phrase that summarises the skill's core topic for platform course searches. Use simple industry-standard terms (e.g. 'project management', 'content strategy', 'data analysis', 'stakeholder management', 'search intent'). Never use full sentences — keywords only. Same order as protective_tasks. Lowercase preferred.
- agent_note: Name one of (Microsoft Copilot, ChatGPT, Google Gemini, Make.com, Manus) and give one concrete example of what it handles in this role. Under 30 words. For trades/healthcare/hands-on physical work, write "This role has strong natural protection from AI agents because [reason]" without naming a tool.
- agent_tasks: 3 specific tasks AI agents are handling today in this occupation. Action verb start. Max 12 words each.

AGENT WATCH FIELDS
- agent_reality: 2 to 3 sentences specific to this occupation. Describe what autonomous AI agents are doing right now in this exact role. Name 2 to 3 specific real tools (e.g. Semrush AI, BrightEdge Copilot, custom GPT-4o pipelines, Microsoft Copilot, Make.com, Manus, Claude). Be concrete about what work is being absorbed. Mention NZ digital agencies or NZ businesses where natural. Do NOT repeat the agent_note content. THIS IS THE SHORTER RESULTS-PAGE VERSION.
- agent_reality_email: 4 to 5 sentences. A SIGNIFICANTLY EXPANDED, deeper version of agent_reality, written for the email the user just gave their address to receive. It MUST contain information that was NOT visible on the results page. Name specific tools, specific NZ businesses or industry patterns where known, specific timelines (e.g. "in the last 6 months", "by mid 2026"), and specific tasks being automated right now in NZ. Do NOT repeat agent_reality verbatim. Treat agent_reality as the teaser and agent_reality_email as the full briefing. No em dashes.
- nz_signal: 2 sentences. Include at least one specific NZ data point relevant to this occupation (e.g. AI mentions in NZ job ads have risen 143.5% since March 2025; junior coordinator roles being advertised less; senior roles increasingly listing AI proficiency as baseline). No generic global claims.
- your_move: EXACTLY ONE sentence. One concrete 30-day action specific to this role (e.g. "Spend the next 30 days building one AI-assisted SEO workflow you own completely, site audit automation, content briefing, or monthly reporting."). Direct, specific, no platitudes. MUST NOT mention humanise.nz, Humanise, the report, the email, results, or any URL or link. MUST NOT include any follow-on sentence. The field ends after the single action sentence.
- locked_preview: Maximum 2 sentences. Write one teaser that creates a specific, unresolved question about THIS person's situation. Reference the occupation by name and the agent tier reality. Make them feel there is one piece of information about their specific role that would change how they think about their next 90 days. End with a direct question to the reader. Banned words: unlock, discover, exclusive, tips, strategies, insights, premium. Do not sound like a marketing headline. No em dashes.
- locked_content_full: 3 to 4 sentences. The EXPANDED answer to the locked_preview teaser, written for the email the user just gave their address to receive. This is the deepest, most specific intelligence in the entire product. It MUST contain information not visible on the results page: name specific NZ regions, specific company types, specific tools, specific tasks, specific timelines (e.g. "Canterbury and Auckland agencies are trialling agent-first SEO workflows where one senior strategist directs a stack of agents handling audits, briefs, and reporting. The roles surviving are not generalist coordinators, they are specialists in technical architecture, client strategy, or AI workflow design. The window to make that move deliberately is roughly 6 to 12 months."). Do NOT repeat anything from agent_reality, nz_signal, your_move, or locked_preview. No em dashes. End with 2 sentences that do the following. Sentence 1: Tell the reader that Humanise has specific data about their occupation that they have not yet seen. Reference something concrete, a specific task, a specific trend, or a specific comparison, that sounds like real intelligence, not a generic teaser. Sentence 2: Direct them back to humanise.nz with a clear action. Use one of these endings depending on context: Option A (if they have not yet seen their full results): "See the full breakdown for your role at humanise.nz". Option B (if they have completed the quiz): "Your full results are waiting at humanise.nz". Option C (if the content implies an upgrade): "The complete picture for your role is at humanise.nz". The ending must never be a yes/no question answerable from memory. It must create a specific gap between what the reader knows and what Humanise knows about their situation. It must always end with humanise.nz as the destination. The ending must NOT be a question and must NOT end with a question mark. Examples of the correct ending shape: "Humanise has identified the three specific SEO tasks disappearing fastest from Canterbury job ads right now, and scored whether your current workflow depends on any of them. Your full breakdown is waiting at humanise.nz" / "The NZ data shows one coordinator function that is actually growing while others compress, and it is not the one most people assume. See where your role sits at humanise.nz" / "Humanise has scored your specific task mix against the two accounting functions being automated fastest in NZ firms right now. See the full picture at humanise.nz".

EXAMPLES OF THE RIGHT TONE FOR locked_preview (do not copy verbatim, match the structure)
- SEO Specialist (Tier 1): "There are three specific SEO tasks agents cannot yet do reliably, and whether your current role focuses on any of them determines how exposed you actually are. Does yours?"
- Marketing Coordinator (Tier 2): "The agencies in NZ that restructured last quarter kept one type of coordinator and cut another. The difference was not seniority or salary. Do you know which side of that line your role sits on?"
- Junior Accountant (Tier 1): "Two accounting tasks are disappearing from NZ job ads faster than any others right now. If either of them describes most of your week, your timeline is shorter than your score suggests. Want to know what they are?"
- Registered Nurse (Tier 4): "Your clinical work is protected, but one part of your role is changing faster than most nurses realise. It is not what you would expect. Do you know what it is?"

No em dashes anywhere. No phrases ending in prepositions/conjunctions/articles in the task arrays.`;

    const tResp = await callGateway({
      model: "google/gemini-3-flash-preview",
      max_tokens: 1000,
      messages: [
        { role: "system", content: TASKS_SYSTEM },
        { role: "user",   content: tasksUserPrompt },
      ],
      tools: HP_TOOL,
      tool_choice: { type: "function", function: { name: "return_tasks" } },
    }, LOVABLE_API_KEY);

    let tasks_at_risk: string[] = [];
    let protective_tasks: string[] = [];
    let protective_skill_keywords: string[] = [];
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
        protective_skill_keywords?: string[];
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
      protective_skill_keywords = (parsed.protective_skill_keywords ?? [])
        .map((s) => String(s ?? "").trim().replace(/[."']+$/g, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      agent_note       = stripEmDashes((parsed.agent_note ?? "").trim());
      agent_tasks      = (parsed.agent_tasks      ?? []).map(cleanTask).filter(Boolean).slice(0, 3);
      agent_reality    = stripEmDashes((parsed.agent_reality ?? "").trim());
      agent_reality_email = stripEmDashes((parsed.agent_reality_email ?? "").trim());
      nz_signal        = stripEmDashes((parsed.nz_signal ?? "").trim());
      your_move        = stripEmDashes((parsed.your_move ?? "").trim());
      {
        const sentences = your_move.match(/[^.!?]+[.!?]+/g) ?? [your_move];
        let first = (sentences[0] ?? your_move).trim();
        first = first.replace(/\s*(?:see|view|find|get).{0,80}humanise\.nz.*/i, "").trim();
        first = first.replace(/\s*humanise\.nz.*/i, "").trim();
        your_move = first;
      }
      locked_preview      = stripEmDashes((parsed.locked_preview ?? "").trim());
      locked_content_full = stripEmDashes((parsed.locked_content_full ?? "").trim());
    } else {
      let tBodyText = "<unread>";
      try { tBodyText = await tResp.text(); } catch (readErr) {
        console.error("[honest-picture] tasks: failed to read response body", readErr);
      }
      console.error("[honest-picture] tasks gateway non-2xx", {
        status: tResp.status,
        statusText: tResp.statusText,
        contentType: tResp.headers.get("content-type"),
        body: tBodyText.slice(0, 2000),
        jobTitle,
        onetCode,
      });
    }

    // Universal CJK strip across every string field in the response.
    const scrubStr = (s: string) => stripCJK(s ?? "");
    const scrubArr = (arr: string[]) => arr.map((x) => scrubStr(x)).filter(Boolean);

    const responsePayload = {
      text: scrubStr(honest_picture),
      honest_picture: scrubStr(honest_picture),
      tasks_at_risk: scrubArr(tasks_at_risk),
      protective_tasks: scrubArr(protective_tasks),
      protective_skill_keywords: scrubArr(protective_skill_keywords),
      agent_note: scrubStr(agent_note),
      agent_tasks: scrubArr(agent_tasks),
      agent_reality: scrubStr(agent_reality),
      agent_reality_email: scrubStr(agent_reality_email),
      nz_signal: scrubStr(nz_signal),
      your_move: scrubStr(your_move),
      locked_preview: scrubStr(locked_preview),
      locked_content_full: scrubStr(locked_content_full),
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[honest-picture] top-level error", {
      errorName: e instanceof Error ? e.name : typeof e,
      errorMessage: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
