export type AiToolKey =
  | "chatgpt"
  | "claude"
  | "copilot"
  | "gemini"
  | "perplexity"
  | "industry"
  | "tried"
  | "none";

export type MatchConfidence = "high" | "fuzzy" | "no_match";

export type WorkTypeOverride = "knowledge" | "managing" | "care" | "trade";

export type QuizAnswers = {
  // Q1 — job title
  jobTitle: string;

  // Match confirmation (set after Q1 alias resolution)
  job_title_matched?: string | null;
  match_confidence?: MatchConfidence;
  /** User's disambiguation pick (if they clicked "Not quite" or had no match). Null when accepted. */
  work_type_override?: WorkTypeOverride | null;

  // Q2 — computer time (1-5)
  computer_time?: number;

  // Q3 — AI tools used (multi-select)
  ai_tools?: AiToolKey[];

  // Q4 — relationship with AI (1-5)
  ai_relationship?: number;

  // Q5 — location
  country: string;
  region?: string;

  // Derived flags / segments
  soft_exit_flag?: boolean;
  segment_tag?:
    | "avoiding"
    | "curious"
    | "occasional"
    | "daily"
    | "building"
    | "hands_on_waitlist";

  // Knowledge-work uplift telemetry (set on results page)
  uplift_category?: UpliftCategory;
  uplift_applied?: number;

  // ---- Legacy fields kept so downstream consumers (HonestPicture, email
  // template, send-results-email) continue to receive a meaningful value.
  industry: string;
  aiUsage?: string;
  computerUse?: string;
  repeatableTasks?: string;
  handoffTask?: string;
};

// ---------- Match confirmation: disambiguation options ----------

export type WorkTypeOverrideOption = {
  value: WorkTypeOverride;
  label: string;
  modifier: number;
  industryTag: string;
  softExit?: boolean;
};

export const WORK_TYPE_OVERRIDES: readonly WorkTypeOverrideOption[] = [
  {
    value: "knowledge",
    label:
      "Knowledge work on a screen (writing, analysis, design, marketing, admin, customer service, finance, legal, technical)",
    modifier: 5,
    industryTag: "Knowledge Work",
  },
  {
    value: "managing",
    label: "Managing people, projects, or budgets",
    modifier: 3,
    industryTag: "Management & Operations",
  },
  {
    value: "care",
    label: "Healthcare, education, or care work",
    modifier: 0,
    industryTag: "Healthcare, Education & Care",
  },
  {
    value: "trade",
    label: "Skilled trade, manual, or hands-on work",
    modifier: -10,
    industryTag: "Trades & Hands-on",
    softExit: true,
  },
] as const;

// ---------- Q2: computer time ----------

export type ComputerTimeOption = {
  value: number;          // 1-5
  label: string;
  modifier: number;
  legacyComputerUse: string;
};

export const COMPUTER_TIMES: readonly ComputerTimeOption[] = [
  { value: 1, label: "90 to 100 percent. I basically live in tabs, docs, and meetings.",                  modifier:  10, legacyComputerUse: "Almost all of it" },
  { value: 2, label: "70 to 90 percent. Mostly on screen, with some in-person or off-screen work.",       modifier:   6, legacyComputerUse: "Almost all of it" },
  { value: 3, label: "40 to 70 percent. A roughly even split between screen and other work.",             modifier:   0, legacyComputerUse: "About half" },
  { value: 4, label: "10 to 40 percent. My computer is a tool I use occasionally, not constantly.",       modifier:  -8, legacyComputerUse: "Less than half" },
  { value: 5, label: "Under 10 percent. I rarely use a computer for my work.",                            modifier: -15, legacyComputerUse: "Rarely - I work with my hands" },
] as const;

// ---------- Q3: AI tools (multi-select) ----------

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

export function aiToolsModifier(selected: AiToolKey[] | undefined): number {
  if (!selected || selected.length === 0) return 0;
  let s = [...selected];
  const hasActive = s.some((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k));
  if (hasActive && s.includes("tried")) s = s.filter((k) => k !== "tried");
  if (s.includes("none") && s.length > 1) s = s.filter((k) => k !== "none");

  const activeCount = s.filter((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k)).length;
  if (activeCount >= 2) return -12;
  if (activeCount === 1) return -8;
  if (s.length === 1 && s[0] === "tried") return -2;
  if (s.length === 1 && s[0] === "none") return  5;
  return 0;
}

export function deriveLegacyAiUsage(selected: AiToolKey[] | undefined): string {
  if (!selected || selected.length === 0) return "No, not at all";
  const activeCount = selected.filter((k) => (ACTIVE_TOOL_KEYS as readonly string[]).includes(k)).length;
  if (activeCount >= 2) return "Yes, regularly";
  if (activeCount === 1) return "Sometimes";
  if (selected.includes("tried")) return "I've tried but don't use them";
  return "No, not at all";
}

// ---------- Q4: relationship with AI ----------

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
  override_work_type: number;
  computer_time: number;
  ai_tools: number;
  ai_relationship: number;
  raw_total: number;
  capped_total: number;
};

export const MODIFIER_CAP = 15;

export function computeModifiers(a: QuizAnswers): ModifiersApplied {
  const overrideMod = a.work_type_override
    ? WORK_TYPE_OVERRIDES.find((o) => o.value === a.work_type_override)?.modifier ?? 0
    : 0;
  const ct = COMPUTER_TIMES.find((o) => o.value === a.computer_time)?.modifier ?? 0;
  const ai = aiToolsModifier(a.ai_tools);
  const rel = AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.modifier ?? 0;
  const raw = overrideMod + ct + ai + rel;
  const capped = Math.max(-MODIFIER_CAP, Math.min(MODIFIER_CAP, raw));
  return {
    override_work_type: overrideMod,
    computer_time: ct,
    ai_tools: ai,
    ai_relationship: rel,
    raw_total: raw,
    capped_total: capped,
  };
}

export function deriveSegmentTag(a: QuizAnswers): QuizAnswers["segment_tag"] {
  if (a.soft_exit_flag) return "hands_on_waitlist";
  return AI_RELATIONSHIPS.find((o) => o.value === a.ai_relationship)?.segment;
}

// ---------- Risk band & summaries ----------

export type RiskBandLabel = "Low" | "Moderate" | "High" | "Very High";

/** 2026-calibrated thresholds. */
export function bandFromScore(score: number): RiskBandLabel {
  if (score <= 34) return "Low";
  if (score <= 54) return "Moderate";
  if (score <= 74) return "High";
  return "Very High";
}

/** Legacy three-tier band (kept for back-compat with fallback path / older callers). */
export function riskBand(score: number): "low" | "medium" | "high" {
  if (score <= 34) return "low";
  if (score <= 54) return "medium";
  return "high";
}

export function riskSummary(score: number): string {
  const band = bandFromScore(score);
  switch (band) {
    case "Low":
      return "Your role has strong protective factors against AI displacement. Focus on compounding what makes you hard to replace.";
    case "Moderate":
      return "AI will change how you work more than whether you work. The next 12 months are the right time to build AI skills into your workflow.";
    case "High":
      return "Your role has significant AI exposure. The people who navigate this well are the ones who start adapting now, not later.";
    case "Very High":
      return "Some of what you do today will be automated. The question isn't whether to adapt, it's how fast and in which direction.";
  }
}

export function calculateRisk(a: QuizAnswers): number {
  const base = 50;
  const mods = computeModifiers(a);
  return Math.max(3, Math.min(97, Math.round(base + mods.capped_total)));
}

// ---------- Knowledge-work uplift layer ----------

export type UpliftCategory =
  | "content_design"
  | "data_analysis"
  | "administrative"
  | "junior_knowledge"
  | "specialist_senior"
  | "none";

export type UpliftResult = {
  category: UpliftCategory;
  uplift: number;       // points added to base
  flooredBase: number;  // base after applying floor (before uplift)
  adjustedBase: number; // flooredBase + uplift, clamped 0-100
};

const UPLIFT_FLOOR = 45;

const UPLIFT_POINTS: Record<UpliftCategory, number> = {
  content_design:    12,
  data_analysis:     10,
  administrative:    10,
  junior_knowledge:   8,
  specialist_senior:  5,
  none:               0,
};

/** Substring-based classification of an O*NET title into an uplift category. */
export function classifyUpliftCategory(occupationTitle: string | undefined | null): UpliftCategory {
  if (!occupationTitle) return "none";
  const t = occupationTitle.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  // 6 — Roles NOT receiving uplift (check first; hard exclusions)
  if (has(
    // healthcare delivery
    "nurse", "nursing", "physician", "doctor", "surgeon", "dentist", "paramedic",
    "midwife", "pharmacist", "therapist", "carer", "caregiver", "care worker",
    "support worker", "personal care", "home health",
    // teaching / in-person education
    "teacher", "tutor", "lecturer", "professor", "educator", "early childhood", "kaiako",
    // trades, manual, construction, transport
    "electrician", "plumber", "carpenter", "builder", "construction", "labourer", "laborer",
    "mechanic", "welder", "painter", "roofer", "joiner", "fitter", "machinist",
    "driver", "courier", "pilot", "captain",
    // hospitality & cleaning
    "chef", "cook", "barista", "bartender", "waiter", "waitress", "hospitality",
    "housekeep", "cleaner",
    // fieldwork / horticulture / primary
    "farm", "farmer", "horticultur", "landscap", "gardener", "ranger", "forestry", "fisher",
  )) return "none";

  // 1 — Content, writing, design (highest exposure)
  if (has(
    "copywriter", "content writer", "content strategist", "content manager",
    "journalist", "editor", "ux writer", "technical writer", "blogger",
    "social media", "seo", "search engine optim",
    "graphic designer", "digital designer", "web designer", "brand designer",
    "communications manager", "communications advisor", "communications specialist",
    "public relations", "pr manager",
    "marketing coordinator", "marketing manager", "marketing specialist", "marketer",
    "writer", "designer",
  )) return "content_design";

  // 2 — Data, analysis, reporting
  if (has(
    "data analyst", "business analyst", "financial analyst", "reporting analyst",
    "insights analyst", "research analyst", "market researcher", "data entry",
    "operations analyst", "planning analyst",
    "management accountant", "junior accountant", "payroll", "accounts administrator",
    "accounts clerk", "bookkeep",
  )) return "data_analysis";

  // 3 — Administrative, operational, frontline service
  if (has(
    "receptionist", "administrator", "office manager", "executive assistant",
    "personal assistant", "data entry operator",
    "operations coordinator", "project coordinator", "scheduling coordinator",
    "customer service representative", "customer service", "contact centre",
    "call centre", "call center", "helpdesk", "help desk",
    "claims processor", "document controller",
  )) return "administrative";

  // 4 — Junior / mid-level knowledge work
  if (has("graduate", "junior", "associate", "assistant ", "coordinator")) return "junior_knowledge";

  // 5 — Specialist / senior knowledge
  if (has(
    "senior", "director", "head of", "chief", "principal",
    "consultant", "lawyer", "solicitor", "barrister", "legal counsel",
    "financial advisor", "financial adviser",
    "hr manager", "human resources manager",
    "product manager", "architect", "engineer",
    "manager", // catch-all for non-front-line management roles
    "developer", "software", "data scientist", "actuary", "economist",
    "strategist", "policy",
  )) return "specialist_senior";

  return "none";
}

/** Apply floor + uplift to an O*NET base score. Categories 1-5 floor at 45 first. */
export function applyUplift(baseScore: number, occupationTitle: string | undefined | null): UpliftResult {
  const category = classifyUpliftCategory(occupationTitle);
  const uplift = UPLIFT_POINTS[category];
  const flooredBase = category === "none" ? baseScore : Math.max(UPLIFT_FLOOR, baseScore);
  const adjustedBase = Math.max(0, Math.min(100, flooredBase + uplift));
  return { category, uplift, flooredBase, adjustedBase };
}

export function tasksAtRisk(_a: QuizAnswers): string[] {
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
  const band = bandFromScore(score);
  const label = industry || "your work type";
  if (band === "Low") return `You sit below the average exposure for ${label}.`;
  if (band === "Moderate") return `You're roughly in line with the average for ${label}.`;
  return `You're above the typical exposure for ${label}.`;
}
