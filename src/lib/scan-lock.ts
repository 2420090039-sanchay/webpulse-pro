const flights = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent scans for the same monitor into one in-flight execution.
 */
export function runExclusiveSiteScan<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
  const current = flights.get(siteId) as Promise<T> | undefined;
  if (current) {
    console.log('[WebPulse:scan-lock] coalesced scan for', siteId);
    return current;
  }
  const p = fn().finally(() => {
    if (flights.get(siteId) === p) flights.delete(siteId);
  });
  flights.set(siteId, p);
  return p;
}
