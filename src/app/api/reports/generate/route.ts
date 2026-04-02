import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWebPulseReportPdf } from '@/lib/pdf-report';
import { parseKeywordsJson } from '@/lib/keywords';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const websiteId = url.searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json({ error: 'Missing websiteId' }, { status: 400 });
    }

    const website = await prisma.website.findFirst({
      where: { id: websiteId },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const [snapshotCount, changeLogCount, logsDesc, probes, latestSnap] = await Promise.all([
      prisma.snapshot.count({ where: { websiteId } }),
      prisma.changeLog.count({ where: { websiteId } }),
      prisma.changeLog.findMany({
        where: { websiteId },
        orderBy: { timestamp: 'desc' },
        take: 25,
      }),
      prisma.uptimeProbe.findMany({
        where: { websiteId },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: { isUp: true },
      }),
      prisma.snapshot.findFirst({
        where: { websiteId },
        orderBy: { timestamp: 'desc' },
        select: {
          screenshotPath: true,
          httpStatus: true,
          responseTimeMs: true,
        },
      }),
    ]);

    const uptimePercent = probes.length
      ? Math.round((probes.filter((p) => p.isUp).length / probes.length) * 100)
      : 100;

    const pdfBytes = await buildWebPulseReportPdf({
      website,
      snapshotCount,
      changeLogCount,
      logsDesc,
      uptimePercent,
      trackedKeywords: parseKeywordsJson(website.keywordsJson),
      latestSnapshotMeta: latestSnap,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="webpulse-pro-report-${website.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
