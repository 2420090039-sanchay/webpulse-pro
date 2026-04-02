export type KeywordSignals = {
  appeared: string[];
  disappeared: string[];
  contextChanged: { term: string; note: string }[];
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function hasWordBoundary(haystackLower: string, term: string): boolean {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${t}\\b`, 'i');
  return re.test(haystackLower);
}

function snippetAround(full: string, termLower: string): string {
  const low = full.toLowerCase();
  const i = low.indexOf(termLower);
  if (i < 0) return '';
  const a = Math.max(0, i - 40);
  const b = Math.min(full.length, i + termLower.length + 40);
  return full.slice(a, b).replace(/\s+/g, ' ').trim();
}

/**
 * Compare normalized old vs new page text for tracked keywords.
 */
export function analyzeKeywordSignals(
  oldText: string,
  newText: string,
  keywords: string[]
): KeywordSignals {
  const appeared: string[] = [];
  const disappeared: string[] = [];
  const contextChanged: { term: string; note: string }[] = [];

  const oldL = oldText.toLowerCase();
  const newL = newText.toLowerCase();

  for (const raw of keywords) {
    const n = norm(raw);
    if (!n) continue;
    const inOld = hasWordBoundary(oldL, n);
    const inNew = hasWordBoundary(newL, n);

    if (inNew && !inOld) appeared.push(raw);
    if (inOld && !inNew) disappeared.push(raw);
    if (inOld && inNew) {
      const so = snippetAround(oldText, n);
      const sn = snippetAround(newText, n);
      if (so && sn && so !== sn) {
        contextChanged.push({
          term: raw,
          note: 'Keyword still present but surrounding copy shifted',
        });
      }
    }
  }

  return { appeared, disappeared, contextChanged };
}
