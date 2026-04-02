import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runCheckForWebsite } from '@/lib/website-check';
import { parseKeywordsJson, stringifyKeywords } from '@/lib/keywords';

export async function GET() {
  try {
    const websites = await prisma.website.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 2,
          select: {
            id: true,
            screenshotPath: true,
            timestamp: true,
            isUp: true,
            httpStatus: true,
            responseTimeMs: true,
          },
        },
        changeLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            aiSummary: true,
            keywordSignalsJson: true,
            classification: true,
          },
        },
      },
    });

    const mapped = await Promise.all(
      websites.map(async (w) => {
        const probes = await prisma.uptimeProbe.findMany({
          where: { websiteId: w.id },
          orderBy: { timestamp: 'desc' },
          take: 100,
          select: { isUp: true },
        });
        const uptimePercent = probes.length
          ? Math.round((probes.filter((p) => p.isUp).length / probes.length) * 100)
          : 100;

        const log = w.changeLogs[0];
        let latestKeywordSignals: unknown = null;
        if (log?.keywordSignalsJson) {
          try {
            latestKeywordSignals = JSON.parse(log.keywordSignalsJson);
          } catch {
            latestKeywordSignals = null;
          }
        }

        const { snapshots, changeLogs, ...base } = w;

        return {
          ...base,
          _id: w.id,
          keywords: parseKeywordsJson(w.keywordsJson),
          uptimePercent,
          recentSnapshots: snapshots,
          latestAiSummary: log?.aiSummary ?? null,
          latestKeywordSignals,
        };
      })
    );

    return NextResponse.json({ websites: mapped }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, name, keywords } = body;

    if (!url || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const keywordsJson = stringifyKeywords(
      Array.isArray(keywords) ? keywords.map((k: unknown) => String(k)) : []
    );

    const website = await prisma.website.create({
      data: {
        url,
        name,
        keywordsJson,
      },
    });

    const checkResult = await runCheckForWebsite(website);
    const fresh = await prisma.website.findUniqueOrThrow({ where: { id: website.id } });

    return NextResponse.json(
      {
        website: {
          ...fresh,
          _id: fresh.id,
          keywords: parseKeywordsJson(fresh.keywordsJson),
        },
        check: checkResult,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
