import { useEffect, useState } from "react";

export type Occupation = {
  onet_code: string;
  title: string;
  risk_score: number;
  risk_band: "Low" | "Moderate" | "High" | "Very High" | string;
  key_factors?: Record<string, number>;
  tasks_at_risk: string[];
  protective_tasks: string[];
  job_market_signals?: {
    nz_market?: string;
    nz_yoy_change?: string;
    source?: string;
    display_message?: string;
    [key: string]: unknown;
  } | null;
};

export type AliasEntry = {
  input_variants: string[];
  onet_title: string;
  onet_code?: string;
  category?: string;
};

type AliasFile = { aliases: AliasEntry[] };

const DATA_URL =
  "https://cdn.jsdelivr.net/gh/hillarymcoscar-create/humanise-data@main/humanise-scores.json?v=3";
const ALIAS_URL =
  "https://cdn.jsdelivr.net/gh/hillarymcoscar-create/humanise-data@main/job-title-aliases.json?v=3";

let cache: Occupation[] | null = null;
let inflight: Promise<Occupation[]> | null = null;

let aliasCache: AliasEntry[] | null = null;
let aliasInflight: Promise<AliasEntry[]> | null = null;
// Lookup map: lowercased trimmed variant -> onet_title
let aliasLookup: Map<string, string> | null = null;

function fetchFreshJson<T>(url: string): Promise<T> {
  const timestamp = Date.now();
  // Note: do NOT send Cache-Control / Pragma request headers here.
  // raw.githubusercontent.com does not allow them via CORS preflight,
  // and the ?t= query param is sufficient to bust caches.
  return fetch(`${url}?t=${timestamp}`, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

export function loadOccupations(): Promise<Occupation[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetchFreshJson<Occupation[]>(DATA_URL)
    .then((d: Occupation[]) => {
      console.log(
        "Soil and Plant Scientists score:",
        d.find((o) => o.onet_code === "19-1013.00")?.risk_score,
      );
      cache = d;
      return d;
    })
    .catch(() => {
      inflight = null;
      return [] as Occupation[];
    });
  return inflight;
}

export function loadAliases(): Promise<AliasEntry[]> {
  if (aliasCache) return Promise.resolve(aliasCache);
  if (aliasInflight) return aliasInflight;
  aliasInflight = fetchFreshJson<AliasFile | AliasEntry[]>(ALIAS_URL)
    .then((d: AliasFile | AliasEntry[]) => {
      const arr = Array.isArray(d) ? d : d.aliases ?? [];
      aliasCache = arr;
      const map = new Map<string, string>();
      for (const entry of arr) {
        for (const v of entry.input_variants ?? []) {
          map.set(v.toLowerCase().trim(), entry.onet_title);
        }
      }
      aliasLookup = map;
      return arr;
    })
    .catch(() => {
      aliasInflight = null;
      return [] as AliasEntry[];
    });
  return aliasInflight;
}

export function loadAll() {
  return Promise.all([loadOccupations(), loadAliases()]);
}

export function useOccupations() {
  const [data, setData] = useState<Occupation[] | null>(cache);
  useEffect(() => {
    if (!cache) loadOccupations().then(setData);
  }, []);
  return data;
}

export function useAliases() {
  const [data, setData] = useState<AliasEntry[] | null>(aliasCache);
  useEffect(() => {
    if (!aliasCache) loadAliases().then(setData);
  }, []);
  return data;
}

/**
 * Resolve a user-typed job title via the alias file (exact, case-insensitive).
 * Returns the matching Occupation by exact onet_title lookup, or null.
 */
export function findByAlias(jobTitle: string, occupations: Occupation[]): Occupation | null {
  if (!jobTitle || !aliasLookup || !occupations?.length) return null;
  const key = jobTitle.toLowerCase().trim();
  if (!key) return null;
  const onetTitle = aliasLookup.get(key);
  if (!onetTitle) return null;
  const target = onetTitle.toLowerCase();
  return occupations.find((o) => o.title.toLowerCase() === target) ?? null;
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
