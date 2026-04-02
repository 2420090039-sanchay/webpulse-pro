import fs from 'fs/promises';
import path from 'path';

/**
 * Saves a PNG under /public/screenshots/{snapshotId}.png and returns public URL path.
 * - SCREENSHOT_API_URL: optional GET endpoint returning image bytes or { url }
 * - ENABLE_SCREENSHOTS=true: tries local Puppeteer (must be installed)
 */
export async function captureScreenshotToPublic(
  pageUrl: string,
  snapshotId: string
): Promise<string | null> {
  const api = process.env.SCREENSHOT_API_URL;
  if (api) {
    try {
      const joiner = api.includes('?') ? '&' : '?';
      const res = await fetch(`${api}${joiner}url=${encodeURIComponent(pageUrl)}`, {
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = (await res.json()) as { url?: string };
        if (j?.url && typeof j.url === 'string') return j.url;
        return null;
      }
      if (ct.includes('image') || ct.includes('octet-stream')) {
        const buf = Buffer.from(await res.arrayBuffer());
        return await writeScreenshot(snapshotId, buf);
      }
    } catch (e) {
      console.warn('[WebPulse:screenshot] API failed', e);
    }
  }

  if (process.env.ENABLE_SCREENSHOTS !== 'true') {
    return null;
  }

  try {
    // Dynamic import so production bundles don't require puppeteer unless enabled
    const puppeteer = (await import('puppeteer')).default;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page
        .goto(pageUrl, { waitUntil: 'networkidle2', timeout: 22000 })
        .catch(() => null);
      const dir = path.join(process.cwd(), 'public', 'screenshots');
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${snapshotId}.png`);
      await page.screenshot({ path: filePath, type: 'png', fullPage: false });
      return `/screenshots/${snapshotId}.png`;
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.warn('[WebPulse:screenshot] puppeteer unavailable or failed —', e);
    return null;
  }
}

async function writeScreenshot(snapshotId: string, buf: Buffer): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'screenshots');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${snapshotId}.png`);
  await fs.writeFile(filePath, buf);
  return `/screenshots/${snapshotId}.png`;
}
