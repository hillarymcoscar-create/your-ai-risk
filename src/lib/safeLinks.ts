// Safe URL constructors + validators for external learning platforms.
// AI must never return full URLs for these platforms; we always construct
// them from keywords. For curated content that may contain legacy
// specific-course URLs, we normalise to search URLs.

const enc = (s: string) => encodeURIComponent(s.trim());

export const youtubeSearchUrl = (kw: string) =>
  `https://www.youtube.com/results?search_query=${enc(kw)}`;
export const linkedinSearchUrl = (kw: string) =>
  `https://www.linkedin.com/learning/search?keywords=${enc(kw)}`;
export const courseraSearchUrl = (kw: string) =>
  `https://www.coursera.org/search?query=${enc(kw)}`;
export const skillshareSearchUrl = (kw: string) =>
  `https://www.skillshare.com/en/search?query=${enc(kw).replace(/%20/g, "+")}`;

const SAFE_PATTERNS: RegExp[] = [
  /^https:\/\/www\.youtube\.com\/results\?search_query=/,
  /^https:\/\/www\.linkedin\.com\/learning\/search\?keywords=/,
  /^https:\/\/www\.coursera\.org\/search\?query=/,
  /^https:\/\/www\.skillshare\.com\/en\/search\?query=/,
];

export const isSafePlatformUrl = (url: string): boolean =>
  SAFE_PATTERNS.some((re) => re.test(url));

const stripTitleSuffix = (title: string): string =>
  title
    .replace(/\s*[—–-]\s*(YouTube|LinkedIn Learning|Coursera|Skillshare).*$/i, "")
    .replace(/\bSkillshare\b\s*[–—-]?\s*/i, "")
    .trim();

/**
 * Given a (possibly broken) URL and its display title, return a safe search
 * URL for the matching platform. If the platform can't be detected, returns
 * null and the caller should hide the link.
 */
export const normalisePlatformUrl = (
  url: string | undefined | null,
  title: string,
  platformHint?: string,
): string | null => {
  if (url && isSafePlatformUrl(url)) return url;

  const hint = (platformHint || "").toLowerCase();
  const u = (url || "").toLowerCase();
  const kw = stripTitleSuffix(title) || title || "";
  if (!kw) return null;

  if (hint.includes("youtube") || u.includes("youtube.com")) return youtubeSearchUrl(kw);
  if (hint.includes("linkedin") || u.includes("linkedin.com")) return linkedinSearchUrl(kw);
  if (hint.includes("coursera") || u.includes("coursera.org")) return courseraSearchUrl(kw);
  if (hint.includes("skillshare") || u.includes("skillshare.com")) return skillshareSearchUrl(kw);

  return null;
};
