export type QuizAnswers = {
  jobTitle: string;
  industry: string;
  computerUse: string;
  aiUsage: string;
  repeatableTasks?: string;
  handoffTask?: string;
  country: string;
  region?: string;
};

export const INDUSTRIES = [
  "Admin & Clerical",
  "Agriculture & Primary Industries",
  "Arts & Creative",
  "Community & Social Services",
  "Construction",
  "Education",
  "Finance & Accounting",
  "Government & Public Sector",
  "Healthcare",
  "Hospitality & Tourism",
  "Legal",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Communications",
  "Real Estate",
  "Retail",
  "Technology",
  "Transport & Logistics",
  "Other",
] as const;

export const COMPUTER_USE = [
  "Almost all of it",
  "About half",
  "Less than half",
  "Rarely - I work with my hands",
] as const;

export const AI_USAGE = [
  "Yes, regularly",
  "Sometimes",
  "I've tried but don't use them",
  "No, not at all",
] as const;

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

// Simple placeholder scoring (0–100, higher = more risk)
export function calculateRisk(a: QuizAnswers): number {
  let score = 35;

  const highRiskIndustries = ["Admin & Clerical", "Retail", "Finance & Accounting", "Marketing & Advertising", "Transport & Logistics"];
  const lowRiskIndustries = ["Healthcare", "Construction", "Education"];
  if (highRiskIndustries.includes(a.industry)) score += 18;
  if (lowRiskIndustries.includes(a.industry)) score -= 15;

  // Modifiers for new industries (MBIE Jobs Online Dec 2025). Existing industries above unchanged.
  const newIndustryMods: Record<string, number> = {
    "Agriculture & Primary Industries": -8,
    "Arts & Creative":                  -5,
    "Community & Social Services":       2,
    "Government & Public Sector":        0,
    "Hospitality & Tourism":            -15,
    "Media & Communications":            3,
    "Real Estate":                       0,
  };
  score += newIndustryMods[a.industry] ?? 0;

  const computerMap: Record<string, number> = {
    "Almost all of it": 22,
    "About half": 8,
    "Less than half": -6,
    "Rarely - I work with my hands": -22,
  };
  score += computerMap[a.computerUse] ?? 0;

  const aiMap: Record<string, number> = {
    "Yes, regularly": -10,
    "Sometimes": -3,
    "I've tried but don't use them": 4,
    "No, not at all": 8,
  };
  score += aiMap[a.aiUsage] ?? 0;

  // Job title heuristics
  const t = a.jobTitle.toLowerCase();
  const risky = ["data entry", "clerk", "bookkeeper", "cashier", "telemarketer", "receptionist", "admin", "translator", "copywriter"];
  const safe = ["nurse", "plumber", "electrician", "therapist", "teacher", "carpenter", "chef", "surgeon", "social worker"];
  if (risky.some((k) => t.includes(k))) score += 15;
  if (safe.some((k) => t.includes(k))) score -= 18;

  return Math.max(3, Math.min(97, Math.round(score)));
}

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

export function tasksAtRisk(a: QuizAnswers): string[] {
  const generic = [
    "Routine data entry and report generation",
    "Drafting standard emails and documents",
    "Scheduling, summarising and basic research",
  ];
  const byIndustry: Record<string, string[]> = {
    "Finance & Accounting": ["Reconciliation and bookkeeping", "Standardised financial reporting", "Invoice processing"],
    "Marketing & Advertising": ["First-draft copywriting", "Audience segmentation", "Campaign performance reporting"],
    "Legal": ["Contract review and redlining", "Legal research and case summaries", "Document discovery"],
    "Admin & Clerical": ["Data entry and form processing", "Calendar and inbox management", "Document templating"],
    "Retail": ["Checkout and self-service ops", "Inventory replenishment forecasts", "Standard customer queries"],
  };
  return byIndustry[a.industry] ?? generic;
}

export function protectiveSkills(a: QuizAnswers): string[] {
  return [
    "Complex judgement and stakeholder trust",
    "Hands-on or in-person delivery",
    "Cross-functional problem solving with AI as a tool",
  ];
}

export function industryComparison(score: number, industry: string): string {
  const band = riskBand(score);
  if (band === "low") return `You sit below the average exposure for ${industry || "your industry"}.`;
  if (band === "medium") return `You're roughly in line with the average for ${industry || "your industry"}.`;
  return `You're above the typical exposure for ${industry || "your industry"}.`;
}
