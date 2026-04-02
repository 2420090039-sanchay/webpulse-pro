/**
 * Resilient HTTP fetch with retries, timeout, and timing for uptime probes.
 */

export const FETCH_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 3;

export type FetchPageResult = {
  ok: boolean;
  statusCode: number;
  finalUrl: string;
  latencyMs: number;
  html: string;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPageWithMetrics(url: string): Promise<FetchPageResult> {
  let lastError = 'Request failed';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; WebPulse-Monitor/1.0; +https://webpulse.local/bot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });

      const latencyMs = Date.now() - started;
      clearTimeout(timer);

      const html = await res.text();

      if (!res.ok) {
        return {
          ok: false,
          statusCode: res.status,
          finalUrl: res.url,
          latencyMs,
          html: '',
          error: `HTTP ${res.status} ${res.statusText}`.trim(),
        };
      }

      return {
        ok: true,
        statusCode: res.status,
        finalUrl: res.url,
        latencyMs,
        html,
      };
    } catch (e: unknown) {
      clearTimeout(timer);
      lastError =
        e instanceof Error
          ? e.name === 'AbortError'
            ? `Timeout after ${FETCH_TIMEOUT_MS / 1000}s`
            : e.message
          : String(e);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(400 * 2 ** attempt + Math.random() * 200);
      }
    }
  }

  return {
    ok: false,
    statusCode: 0,
    finalUrl: url,
    latencyMs: 0,
    html: '',
    error: lastError,
  };
}
