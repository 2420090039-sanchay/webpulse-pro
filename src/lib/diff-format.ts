/**
 * Shared helpers: turn diff-match-patch tuples into readable strings and summaries.
 */

export type DiffTuple = [number, string];

export function parseDiffTuples(raw: string): DiffTuple[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is DiffTuple =>
        Array.isArray(x) &&
        x.length >= 2 &&
        typeof x[0] === 'number' &&
        typeof x[1] === 'string'
    );
  } catch {
    return [];
  }
}

export function aggregateDiff(diffs: DiffTuple[]) {
  let added = '';
  let removed = '';
  let addedFragments = 0;
  let removedFragments = 0;

  for (const [op, text] of diffs) {
    if (op === 1) {
      added += text;
      addedFragments += 1;
    } else if (op === -1) {
      removed += text;
      removedFragments += 1;
    }
  }

  const addedLen = added.length;
  const removedLen = removed.length;
  const changeChars = addedLen + removedLen;

  return {
    added: added.trim(),
    removed: removed.trim(),
    addedFragments,
    removedFragments,
    addedLen,
    removedLen,
    changeChars,
  };
}

/** 0–100 heuristic for PDF “impact score”. */
export function computeImpactScore(diffs: DiffTuple[]): number {
  const { changeChars } = aggregateDiff(diffs);
  if (changeChars === 0) return 0;
  const raw = Math.log10(changeChars + 10) * 28;
  return Math.min(100, Math.max(1, Math.round(raw)));
}

export function classificationToImpactLevel(
  classification: string
): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' {
  if (classification === 'Major') return 'HIGH';
  if (classification === 'Minor') return 'MEDIUM';
  if (classification === 'Error') return 'LOW';
  return 'NONE';
}

export function narrativeFromDiff(
  classification: string,
  addedLen: number,
  removedLen: number
): string {
  const level = classificationToImpactLevel(classification);
  const parts: string[] = [];

  if (classification === 'Major' || classification === 'Minor') {
    parts.push('Content has been updated compared to the previous scan.');
    if (addedLen > 0 || removedLen > 0) {
      parts.push(
        `Approximately ${addedLen.toLocaleString()} characters were added and ${removedLen.toLocaleString()} removed.`
      );
    }
    parts.push(
      `Impact level is ${level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low'}.`
    );
  } else if (classification === 'No Change') {
    parts.push('No substantive content changes were detected since the last successful scan.');
  } else {
    parts.push('Baseline or scan status — compare future scans for differences.');
  }

  return parts.join(' ');
}

/** Short bullets for PDF “detected differences” (no raw JSON). */
export function formatDiffBullets(diffs: DiffTuple[], maxEach = 480): {
  addedLines: string[];
  removedLines: string[];
} {
  const { added, removed } = aggregateDiff(diffs);
  const clip = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length <= maxEach) return t;
    return `${t.slice(0, maxEach - 1)}…`;
  };

  const addedLines = added ? [clip(added)] : ['— None detected —'];
  const removedLines = removed ? [clip(removed)] : ['— None detected —'];

  return { addedLines, removedLines };
}

export function scanStatusLabel(status: string, hasChangeLogs: boolean): 'CHANGED' | 'NO CHANGE' {
  if (status === 'Major' || status === 'Minor') return 'CHANGED';
  if (status === 'No Change' || status === 'Pending') return 'NO CHANGE';
  if (status === 'Error') return hasChangeLogs ? 'CHANGED' : 'NO CHANGE';
  return 'NO CHANGE';
}
