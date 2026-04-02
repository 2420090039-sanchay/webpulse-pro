import type { Website } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchPageWithMetrics } from '@/lib/fetch-page';
import {
  normalizeHtmlToText,
  hashString,
  computeDiff,
  classifyChange,
  sendEmailAlert,
} from '@/lib/checker';
import { parseKeywordsJson } from '@/lib/keywords';
import { analyzeKeywordSignals } from '@/services/keyword-tracker';
import { generateAISummary } from '@/services/ai-summary';
import { captureScreenshotToPublic } from '@/services/screenshot';
import { runExclusiveSiteScan } from '@/lib/scan-lock';

const LOG = '[WebPulse:check]';

export type SiteCheckResult = {
  siteId: string;
  name: string;
  url: string;
  status: 'First Scan' | 'No Change' | 'Minor' | 'Major' | 'Error' | 'Down';
  error?: string;
  logId?: string;
  normalizedLength?: number;
  hashChanged?: boolean;
};

async function executeSiteCheck(site: Website): Promise<SiteCheckResult> {
  const base: Pick<SiteCheckResult, 'siteId' | 'name' | 'url'> = {
    siteId: site.id,
    name: site.name,
    url: site.url,
  };

  const keywords = parseKeywordsJson(site.keywordsJson);

  console.log(`${LOG} start siteId=${site.id} url=${site.url} keywords=${keywords.length}`);

  try {
    const page = await fetchPageWithMetrics(site.url);

    await prisma.uptimeProbe.create({
      data: {
        websiteId: site.id,
        isUp: page.ok,
        httpStatus: page.statusCode,
        latencyMs: page.latencyMs,
        error: page.error ?? null,
      },
    });

    await prisma.website.update({
      where: { id: site.id },
      data: {
        lastChecked: new Date(),
        lastIsUp: page.ok,
        lastHttpStatus: page.statusCode,
        lastLatencyMs: page.latencyMs,
      },
    });

    if (!page.ok) {
      await prisma.website.update({
        where: { id: site.id },
        data: { status: 'Down' },
      });
      console.warn(`${LOG} down siteId=${site.id}`, page.error);
      return {
        ...base,
        status: 'Down',
        error: page.error,
      };
    }

    const normalizedText = normalizeHtmlToText(page.html);
    const currentHash = hashString(normalizedText);

    console.log(
      `${LOG} normalized ok chars=${normalizedText.length} hashPrefix=${currentHash.slice(0, 16)}…`
    );

    const lastSnapshot = await prisma.snapshot.findFirst({
      where: { websiteId: site.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastSnapshot) {
      const snap = await prisma.snapshot.create({
        data: {
          websiteId: site.id,
          contentHash: currentHash,
          normalizedContent: normalizedText,
          httpStatus: page.statusCode,
          responseTimeMs: page.latencyMs,
          isUp: true,
        },
      });

      const screenshotPath = await captureScreenshotToPublic(page.finalUrl, snap.id);
      if (screenshotPath) {
        await prisma.snapshot.update({
          where: { id: snap.id },
          data: { screenshotPath },
        });
      }

      await prisma.website.update({
        where: { id: site.id },
        data: { status: 'No Change' },
      });

      console.log(`${LOG} baseline snapshot created websiteId=${site.id}`);
      return {
        ...base,
        status: 'First Scan',
        normalizedLength: normalizedText.length,
      };
    }

    if (lastSnapshot.contentHash === currentHash) {
      await prisma.website.update({
        where: { id: site.id },
        data: { status: 'No Change' },
      });

      console.log(`${LOG} unchanged hash websiteId=${site.id}`);
      return {
        ...base,
        status: 'No Change',
        normalizedLength: normalizedText.length,
        hashChanged: false,
      };
    }

    const diffs = computeDiff(lastSnapshot.normalizedContent, normalizedText);
    const classification = classifyChange(diffs);

    const keywordSignals = analyzeKeywordSignals(
      lastSnapshot.normalizedContent,
      normalizedText,
      keywords
    );

    const aiSummary = await generateAISummary(diffs, classification);

    console.log(
      `${LOG} content changed websiteId=${site.id} diffOps=${diffs.length} class=${classification}`
    );

    const newSnapshot = await prisma.snapshot.create({
      data: {
        websiteId: site.id,
        contentHash: currentHash,
        normalizedContent: normalizedText,
        httpStatus: page.statusCode,
        responseTimeMs: page.latencyMs,
        isUp: true,
      },
    });

    const screenshotPath = await captureScreenshotToPublic(page.finalUrl, newSnapshot.id);
    if (screenshotPath) {
      await prisma.snapshot.update({
        where: { id: newSnapshot.id },
        data: { screenshotPath },
      });
    }

    const newLog = await prisma.changeLog.create({
      data: {
        websiteId: site.id,
        snapshotId: newSnapshot.id,
        previousSnapshotId: lastSnapshot.id,
        diffResult: JSON.stringify(diffs),
        classification,
        aiSummary,
        keywordSignalsJson: JSON.stringify(keywordSignals),
      },
    });

    await prisma.website.update({
      where: { id: site.id },
      data: {
        status: classification,
        lastChanged: new Date(),
      },
    });

    if (classification === 'Major') {
      const alertTo = process.env.ALERT_EMAIL || process.env.SMTP_USER;
      if (alertTo) {
        await sendEmailAlert(alertTo, site.name, site.url, aiSummary.slice(0, 500));
      }
    }

    console.log(`${LOG} changelog written logId=${newLog.id}`);

    return {
      ...base,
      status: classification,
      logId: newLog.id,
      normalizedLength: normalizedText.length,
      hashChanged: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} failed websiteId=${site.id}:`, message);

    await prisma.website.update({
      where: { id: site.id },
      data: { status: 'Error', lastChecked: new Date() },
    });

    return { ...base, status: 'Error', error: message };
  }
}

export function runCheckForWebsite(site: Website): Promise<SiteCheckResult> {
  return runExclusiveSiteScan(site.id, async () => {
    const fresh = await prisma.website.findUniqueOrThrow({ where: { id: site.id } });
    return executeSiteCheck(fresh);
  });
}

export async function runCheckAllActiveWebsites(): Promise<SiteCheckResult[]> {
  const websites = await prisma.website.findMany({ where: { isActive: true } });
  console.log(`${LOG} batch start count=${websites.length}`);

  const results: SiteCheckResult[] = [];
  for (const site of websites) {
    results.push(await runCheckForWebsite(site));
  }

  console.log(`${LOG} batch done`);
  return results;
}
