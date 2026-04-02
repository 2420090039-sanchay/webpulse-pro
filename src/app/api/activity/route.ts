import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))
    );

    const websites = await prisma.website.findMany({
      select: { id: true, name: true, url: true },
    });

    const websiteIds = websites.map((w) => w.id);
    const websiteMap = websites.reduce(
      (acc, w) => {
        acc[w.id] = { name: w.name, url: w.url };
        return acc;
      },
      {} as Record<string, { name: string; url: string }>
    );

    const logs = await prisma.changeLog.findMany({
      where: { websiteId: { in: websiteIds } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const formattedLogs = logs.map((log) => {
      let diffResult: unknown = [];
      try {
        diffResult = JSON.parse(log.diffResult);
      } catch {
        diffResult = [];
      }
      let keywordSignals: unknown = null;
      if (log.keywordSignalsJson) {
        try {
          keywordSignals = JSON.parse(log.keywordSignalsJson);
        } catch {
          keywordSignals = null;
        }
      }
      return {
        id: log.id,
        websiteName: websiteMap[log.websiteId]?.name || 'Unknown',
        websiteUrl: websiteMap[log.websiteId]?.url || '',
        classification: log.classification,
        timestamp: log.timestamp,
        diffResult,
        aiSummary: log.aiSummary,
        keywordSignals,
      };
    });

    return NextResponse.json({ logs: formattedLogs }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
