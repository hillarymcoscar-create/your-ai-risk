import { useEffect, useState } from "react";

export type Occupation = {
  onet_code: string;
  title: string;
  risk_score: number;
  risk_band: "Low" | "Moderate" | "High" | "Very High" | string;
  key_factors?: Record<string, number>;
  tasks_at_risk: string[];
  protective_tasks: string[];
};

const DATA_URL =
  "https://raw.githubusercontent.com/hillarymcoscar-create/humanise-data/refs/heads/main/humanise-scores.json";

let cache: Occupation[] | null = null;
let inflight: Promise<Occupation[]> | null = null;

export function loadOccupations(): Promise<Occupation[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch(DATA_URL)
    .then((r) => r.json())
    .then((d: Occupation[]) => {
      cache = d;
      return d;
    })
    .catch(() => {
      inflight = null;
      return [] as Occupation[];
    });
  return inflight;
}

export function useOccupations() {
  const [data, setData] = useState<Occupation[] | null>(cache);
  useEffect(() => {
    if (!cache) loadOccupations().then(setData);
  }, []);
  return data;
}

// Case-insensitive fuzzy matching: token overlap + substring boosts
export function findBestMatch(jobTitle: string, list: Occupation[]): Occupation | null {
  if (!jobTitle || !list?.length) return null;
  const q = jobTitle.toLowerCase().trim();
  if (!q) return null;
  const stop = new Set(["the", "a", "an", "of", "and", "to", "for", "in", "at", "on", "&", "-", "/"]);
  const qTokens = q.split(/[\s,/&-]+/).filter((t) => t && !stop.has(t));
  if (!qTokens.length) return null;

  // Synonyms: map common user terms to occupation vocabulary
  const synonyms: Record<string, string[]> = {
    marketer: ["marketing"],
    marketers: ["marketing"],
    dev: ["developer", "software"],
    developer: ["software"],
    programmer: ["software", "developer"],
    coder: ["software", "developer"],
    accountant: ["accounting", "accountants"],
    nurse: ["nursing", "nurses"],
    teacher: ["teachers", "education"],
    lawyer: ["lawyers", "legal"],
    doctor: ["physicians"],
    designer: ["designers", "design"],
    writer: ["writers"],
  };
  const expanded = new Set(qTokens);
  qTokens.forEach((t) => synonyms[t]?.forEach((s) => expanded.add(s)));

  let best: { occ: Occupation; score: number } | null = null;

  for (const occ of list) {
    const title = occ.title.toLowerCase();
    const tTokens = title.split(/[\s,/&-]+/).filter((t) => t && !stop.has(t));
    let score = 0;

    // token overlap
    for (const qt of expanded) {
      if (tTokens.includes(qt)) score += 3;
      else if (tTokens.some((tt) => tt.startsWith(qt) || qt.startsWith(tt))) score += 1.5;
    }
    // substring boosts
    if (title.includes(q)) score += 5;
    if (q.includes(title)) score += 4;

    // small length penalty so shorter/exact titles win ties
    score -= Math.abs(tTokens.length - qTokens.length) * 0.1;

    if (!best || score > best.score) best = { occ, score };
  }

  return best && best.score >= 2 ? best.occ : null;
}

export function percentile(score: number, list: Occupation[]): number {
  if (!list?.length) return 50;
  // Lower risk_score = better rank. Percentile = % of occupations with HIGHER risk than you.
  // i.e. "ranks in the Xth percentile" where higher percentile = safer.
  const lower = list.filter((o) => o.risk_score > score).length;
  return Math.round((lower / list.length) * 100);
}
