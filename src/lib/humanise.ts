export type AiToolKey =
  | "chatgpt"
  | "claude"
  | "copilot"
  | "gemini"
  | "perplexity"
  | "industry"
  | "tried"
  | "none";

export type QuizAnswers = {
  // Q1 — job title (unchanged matching)
  jobTitle: string;

  // Q2 — work type (1-9)
  work_type?: number;
  // True if work_type was inferred from job-title match rather than chosen by the user.
  work_type_inferred?: boolean;

  // Q3 — computer time (1-5)
  computer_time?: number;

  // Q4 — AI tools used (multi-select)
  ai_tools?: AiToolKey[];

  // Q5 — relationship with AI (1-5)
  ai_relationship?: number;

  // Q6 — location (existing)
  country: string;
  region?: string;

  // Derived flags / segments (set as the user advances)
  soft_exit_flag?: boolean;
  segment_tag?:
    | "avoiding"
    | "curious"
    | "occasional"
    | "daily"
    | "building"
    | "hands_on_waitlist";

  // ---- Legacy fields kept so downstream consumers (HonestPicture, email
  // template, send-results-email) continue to receive a meaningful value.
  // These are derived from the new answers; they are NOT user-facing inputs.
  industry: string;
  aiUsage?: string;
  computerUse?: string;
  repeatableTasks?: string;
  handoffTask?: string;
};

// ---------- Q2: work type ----------

export type WorkTypeOption = {
  value: number;          // 1-9
  label: string;
  modifier: number;
  industryTag: string;    // legacy "industry" surface for downstream consumers
};

export const WORK_TYPES: readonly WorkTypeOption[] = [
  { value: 1, label: "Strategy, planning, or analysis. Most of my work is thinking and decisions.",                  modifier:  5, industryTag: "Strategy & Analysis" },
  { value: 2, label: "Creating content, writing, or design. Most of my work is producing things on a screen.",        modifier:  8, industryTag: "Content & Creative" },
  { value: 3, label: "Managing people, projects, or processes. Most of my work is coordination and meetings.",        modifier:  3, industryTag: "Management & Operations" },
  { value: 4, label: "Specialist knowledge work in legal, financial, technical, or research fields.",                 modifier:  5, industryTag: "Specialist Knowledge Work" },
  { value: 5, label: "Customer-facing or sales work, mostly digital. Email, calls, CRM.",                             modifier:  3, industryTag: "Sales & Customer" },
  { value: 6, label: "Administrative or operational work. Forms, data, systems, support.",                            modifier:  8, industryTag: "Admin & Operations" },
  { value: 7, label: "Healthcare, education, or care work.",                                                          modifier:  0, industryTag: "Healthcare, Education & Care" },
  { value: 8, label: "Skilled trade, manual, or hands-on work.",                                                      modifier: -10, industryTag: "Trades & Hands-on" },
  { value: 9, label: "Mixed. I do a bit of everything.",                                                              modifier:  0, industryTag: "Mixed" },
] as const;

// ---------- Q3: computer time ----------

export type ComputerTimeOption = {
  value: number;          // 1-5
  label: string;
  modifier: number;
  legacyComputerUse: string; // map to old COMPUTER_USE labels
};

export const COMPUTER_TIMES: readonly ComputerTimeOption[] = [
  { value: 1, label: "90 to 100 percent. I basically live in tabs, docs, and meetings.",                  modifier:  10, legacyComputerUse: "Almost all of it" },
  { value: 2, label: "70 to 90 percent. Mostly on screen, with some in-person or off-screen work.",       modifier:   6, legacyComputerUse: "Almost all of it" },
  { value: 3, label: "40 to 70 percent. A roughly even split between screen and other work.",             modifier:   0, legacyComputerUse: "About half" },
  { value: 4, label: "10 to 40 percent. My computer is a tool I use occasionally, not constantly.",       modifier:  -8, legacyComputerUse: "Less than half" },
  { value: 5, label: "Under 10 percent. I rarely use a computer for my work.",                            modifier: -15, legacyComputerUse: "Rarely - I work with my hands" },
] as const;

// ---------- Q4: AI tools (multi-select) ----------

export type AiToolOption = { key: AiToolKey; label: string };

export const AI_TOOL_OPTIONS: readonly AiToolOption[] = [
  { key: "chatgpt",     label: "ChatGPT" },
  { key: "claude",      label: "Claude" },
  { key: "copilot",     label: "Microsoft Copilot in Word, Excel, or Teams" },
  { key: "gemini",      label: "Google Gemini in Gmail, Docs, or Sheets" },
  { key: "perplexity",  label: "Perplexity or other AI search tools" },
  { key: "industry",    label: "Industry-specific AI tools in my CRM, design software, accounting software, or similar" },
  { key: "tried",       label: "I've tried a few but don't use them regularly" },
  { key: "none",        label: "I don't use any AI tools yet" },
] as const;

const ACTIVE_TOOL_KEYS: readonly AiToolKey[] = ["chatgpt", "claude", "copilot", "gemini", "perplexity", "industry"];

/** Apply Q4's highest-priority rule (modifiers do NOT sum). */
export function aiToolsModifier(selected: AiToolKey[] | undefined): number {
  if (!selected || selected.length === 0) return 0;
  let s = [...selected];

  // "tried" with any active tool -> drop "tried"
  const hasActive = s.some((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k));
  if (hasActive && s.includes("tried")) s = s.filter((k) => k !== "tried");
  // "none" with anything else -> drop "none"
  if (s.includes("none") && s.length > 1) s = s.filter((k) => k !== "none");

  const activeCount = s.filter((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k)).length;
  if (activeCount >= 2) return -12;
  if (activeCount === 1) return -8;
  if (s.length === 1 && s[0] === "tried") return -2;
  if (s.length === 1 && s[0] === "none") return  5;
  return 0;
}

/** Map Q4 selection back to the legacy `aiUsage` string used by HonestPicture. */
export function deriveLegacyAiUsage(selected: AiToolKey[] | undefined): string {
  if (!selected || selected.length === 0) return "No, not at all";
  const activeCount = selected.filter((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k)).length;
  if (activeCount >= 2) return "Yes, regularly";
  if (activeCount === 1) return "Sometimes";
  if (selected.includes("tried")) return "I've tried but don't use them";
  return "No, not at all";
}

// ---------- Q5: relationship with AI ----------

export type AiRelationshipOption = {
  value: number;     // 1-5
  label: string;
  modifier: number;
  segment: "avoiding" | "curious" | "occasional" | "daily" | "building";
};

export const AI_RELATIONSHIPS: readonly AiRelationshipOption[] = [
  { value: 1, label: "I'm avoiding it. It makes me anxious or I don't trust it.",                  modifier:   0, segment: "avoiding" },
  { value: 2, label: "I'm curious but stuck. I've tried but can't get traction.",                  modifier:  -2, segment: "curious" },
  { value: 3, label: "I use it occasionally for specific tasks. Nothing systematic.",              modifier:  -5, segment: "occasional" },
  { value: 4, label: "I use it daily. It's part of how I work.",                                   modifier: -10, segment: "daily" },
  { value: 5, label: "I'm building with it. Agents, automations, or custom workflows.",            modifier: -12, segment: "building" },
] as const;

// ---------- Location ----------

export const COUNTRIES = [
  "New Zealand",
  "Australia",
  "United States",
  "United Kingdom",
  "Canada",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "Singapore",
  "Japan",
  "India",
  "Other",
] as const;

export const NZ_REGIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatū-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
] as const;

// ---------- Modifier / segment computation ----------

export type ModifiersApplied = {
  q2_work_type: number;
  q3_computer_time: number;
  q4_ai_tools: number;
  q5_ai_relationship: number;
  raw_total: number;
  capped_total: number;
};

export const MODIFIER_CAP = 15;

export function computeModifiers(a: QuizAnswers): ModifiersApplied {
  const q2 = WORK_TYPES.find((o) => o.value === a.work_type)?.modifier ?? 0;
  const q3 = COMPUTER_TIMES.find((o) => o.value === a.computer_time)?.modifier ?? 0;
  const q4 = aiToolsModifier(a.ai_tools);
  const q5 = AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.modifier ?? 0;
  const raw = q2 + q3 + q4 + q5;
  const capped = Math.max(-MODIFIER_CAP, Math.min(MODIFIER_CAP, raw));
  return {
    q2_work_type: q2,
    q3_computer_time: q3,
    q4_ai_tools: q4,
    q5_ai_relationship: q5,
    raw_total: raw,
    capped_total: capped,
  };
}

export function deriveSegmentTag(a: QuizAnswers): QuizAnswers["segment_tag"] {
  if (a.soft_exit_flag) return "hands_on_waitlist";
  return AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.segment;
}

// ---------- Risk band & summaries (unchanged behaviour) ----------

export function riskBand(score: number): "low" | "medium" | "high" {
  if (score <= 40) return "low";
  if (score <= 70) return "medium";
  return "high";
}

export function riskSummary(score: number): string {
  const band = riskBand(score);
  if (band === "low") return "Your role looks resilient. AI is more likely to assist you than replace you.";
  if (band === "medium") return "Parts of your role are exposed. With the right skills, you can stay ahead.";
  return "Your role has significant exposure to automation. Action now will make a real difference.";
}

// Fallback used only when O*NET match fails. Now keyed off work_type/computer_time
// instead of the old industry/AI dropdowns.
export function calculateRisk(a: QuizAnswers): number {
  const base = 50;
  const mods = computeModifiers(a);
  return Math.max(3, Math.min(97, Math.round(base + mods.capped_total)));
}

export function tasksAtRisk(a: QuizAnswers): string[] {
  return [
    "Routine data entry and report generation",
    "Drafting standard emails and documents",
    "Scheduling, summarising and basic research",
  ];
}

export function protectiveSkills(_a: QuizAnswers): string[] {
  return [
    "Complex judgement and stakeholder trust",
    "Hands-on or in-person delivery",
    "Cross-functional problem solving with AI as a tool",
  ];
}

export function industryComparison(score: number, industry: string): string {
  const band = riskBand(score);
  const label = industry || "your work type";
  if (band === "low") return `You sit below the average exposure for ${label}.`;
  if (band === "medium") return `You're roughly in line with the average for ${label}.`;
  return `You're above the typical exposure for ${label}.`;
}

// ---------- Q2 inference from job title ----------

/**
 * Infer a work_type (1-9) from a matched O*NET occupation title.
 * Returns null when the title is too generic/ambiguous to infer reliably.
 * Only call this for HIGH-CONFIDENCE matches (exact alias hits).
 */
export function inferWorkTypeFromTitle(occupationTitle: string | undefined | null): number | null {
  if (!occupationTitle) return null;
  const t = occupationTitle.toLowerCase();

  // Ambiguous bare titles: do not infer, fall through to showing Q2.
  const AMBIGUOUS = ["manager", "managers", "director", "directors", "specialist", "specialists", "coordinator", "officer", "assistant"];
  const tokens = t.split(/[\s,/&-]+/).filter(Boolean);
  if (tokens.length === 1 && AMBIGUOUS.includes(tokens[0])) return null;

  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  // 7 — Healthcare, education, or care
  if (has(
    "nurse", "nursing", "physician", "doctor", "surgeon", "dentist", "paramedic",
    "therap", "psycholog", "counsel", "social work", "midwife", "pharmac",
    "teacher", "teaching", "tutor", "lecturer", "professor", "educator", "early childhood",
    "kaiako", "carer", "caregiver", "care worker", "support worker",
  )) return 7;

  // 8 — Skilled trade, manual, hands-on, hospitality
  if (has(
    "electrician", "plumber", "carpenter", "builder", "construction", "labourer", "laborer",
    "mechanic", "welder", "painter", "roofer", "joiner", "fitter",
    "chef", "cook", "barista", "bartender", "waiter", "waitress", "hospitality",
    "driver", "courier", "farm", "farmer", "horticultur", "landscap", "gardener",
    "cleaner", "housekeep", "warehouse", "forklift", "machinist",
    "sparky", "chippie",
  )) return 8;

  // 3 — Managing people / projects (check before 2/4 so "marketing manager" -> 3)
  if (has("project manager", "programme manager", "program manager", "product manager",
    "marketing manager", "operations manager", "general manager", "team lead",
    "engineering manager", "people manager")) return 3;

  // 5 — Customer-facing or sales
  if (has("sales rep", "sales representative", "account manager", "account executive",
    "business development", "bdm", "customer success", "customer service representative",
    "call centre", "call center", "telemarket")) return 5;

  // 6 — Administrative or operational
  if (has("receptionist", "administrative assistant", "admin assistant", "office administrator",
    "data entry", "secretary", "executive assistant", "ops coordinator", "operations coordinator",
    "payroll clerk", "bookkeep")) return 6;

  // 2 — Content, writing, design, marketing
  if (has("seo", "content", "copywriter", "writer", "editor", "journalist", "designer",
    "graphic", "ux", "ui designer", "creative", "brand", "marketing", "advertising",
    "public relations", "communications specialist", "social media")) return 2;

  // 4 — Specialist knowledge work (technical, legal, financial, research)
  if (has("software", "developer", "engineer", "programmer", "data scientist", "data analyst",
    "data engineer", "devops", "machine learning",
    "lawyer", "solicitor", "barrister", "paralegal", "legal counsel",
    "accountant", "auditor", "actuary", "financial analyst", "consultant",
    "researcher", "scientist", "economist", "statistician")) return 4;

  // 1 — Strategy, planning, analysis (non-technical)
  if (has("strategist", "planner", "policy analyst", "business analyst", "research analyst")) return 1;

  return null;
}
