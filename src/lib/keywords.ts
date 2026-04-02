export function parseKeywordsJson(raw: string | null | undefined): string[] {
  if (!raw || raw === '[]') return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function stringifyKeywords(keywords: string[]): string {
  const cleaned = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  return JSON.stringify(cleaned);
}
