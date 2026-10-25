/**
 * String similarity and normalization utilities for procurement reconciliation.
 * Pure TypeScript, deterministic, zero external dependencies.
 */

/**
 * Normalizes vendor strings by removing company suffixes (Inc, LLC, Ltd, Corp),
 * stripping punctuation, and trimming excess whitespace.
 */
export function normalizeSupplierName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|corporation|incorporated|co|company|gmbh|sa|bv)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes SKU or item code strings.
 */
export function normalizeItemCode(code: string | undefined): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[\s\-_]/g, '');
}

/**
 * Normalizes product descriptions for conservative text comparison.
 */
export function normalizeDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculates a normalized string similarity ratio between 0.0 and 1.0.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeDescription(str1);
  const s2 = normalizeDescription(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  const levenshteinScore = 1.0 - distance / maxLen;

  // Token overlap check using Sørensen-Dice coefficient (robust to word order and qualifiers)
  const words1 = s1.split(' ').filter(w => w.length > 1);
  const words2 = s2.split(' ').filter(w => w.length > 1);

  if (words1.length === 0 || words2.length === 0) return levenshteinScore;

  const set2 = new Set(words2);
  let intersection = 0;
  for (const w of words1) {
    if (set2.has(w)) intersection++;
  }

  const diceScore = (2 * intersection) / (words1.length + words2.length);

  return Math.max(levenshteinScore, diceScore);
}
