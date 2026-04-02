import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const websites = await prisma.website.findMany();
    const websiteIds = websites.map((w) => w.id);

    const totalMonitors = websites.length;
    const activeMonitors = websites.filter((w) => w.isActive).length;

    const now = new Date();
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [changesLast24h, logs30d, currentMajorMonitors, currentMinorMonitors] =
      await Promise.all([
        prisma.changeLog.count({
          where: { websiteId: { in: websiteIds }, timestamp: { gte: day24h } },
        }),
        prisma.changeLog.findMany({
          where: {
            websiteId: { in: websiteIds },
            timestamp: { gte: day30 },
            classification: { in: ['Minor', 'Major'] },
          },
          select: { classification: true, websiteId: true },
        }),
        prisma.website.count({ where: { status: 'Major' } }),
        prisma.website.count({ where: { status: 'Minor' } }),
      ]);

    let pieMajor = 0;
    let pieMinor = 0;
    for (const log of logs30d) {
      if (log.classification === 'Major') pieMajor += 1;
      if (log.classification === 'Minor') pieMinor += 1;
    }

    const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const logs14d = await prisma.changeLog.findMany({
      where: {
        websiteId: { in: websiteIds },
        timestamp: { gte: fourteenDaysAgo },
      },
      select: { timestamp: true, classification: true },
    });

    const lineMap: Record<
      string,
      { date: string; label: string; total: number; minor: number; major: number }
    > = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      lineMap[key] = { date: key, label, total: 0, minor: 0, major: 0 };
    }

    for (const log of logs14d) {
      const key = new Date(log.timestamp).toISOString().slice(0, 10);
      if (!lineMap[key]) continue;
      lineMap[key].total += 1;
      if (log.classification === 'Minor') lineMap[key].minor += 1;
      if (log.classification === 'Major') lineMap[key].major += 1;
    }

    const lineChart = Object.values(lineMap).sort((a, b) => a.date.localeCompare(b.date));

    const byWebsiteCounts = await prisma.changeLog.groupBy({
      by: ['websiteId'],
      where: {
        websiteId: { in: websiteIds },
        timestamp: { gte: day30 },
      },
      _count: { id: true },
    });

    const idToName = new Map(websites.map((w) => [w.id, w.name]));
    const barChartByWebsite = byWebsiteCounts
      .map((row) => ({
        name: idToName.get(row.websiteId) ?? 'Unknown',
        changes: row._count.id,
      }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 12);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const logs7d = await prisma.changeLog.findMany({
      where: {
        websiteId: { in: websiteIds },
        timestamp: { gte: sevenDaysAgo },
      },
    });

    const activityLegacy: Record<string, { name: string; Minor: number; Major: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const keyTitle = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      activityLegacy[keyTitle] = { name: keyTitle, Minor: 0, Major: 0 };
    }
    for (const log of logs7d) {
      const keyTitle = new Date(log.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!activityLegacy[keyTitle]) continue;
      if (log.classification === 'Minor') activityLegacy[keyTitle].Minor += 1;
      if (log.classification === 'Major') activityLegacy[keyTitle].Major += 1;
    }
    const activityChart = Object.values(activityLegacy);

    return NextResponse.json({
      stats: {
        totalMonitors,
        activeMonitors,
        changesLast24h,
        majorChangesCount: currentMajorMonitors,
        minorChangesCount: currentMinorMonitors,
        totalWebsites: totalMonitors,
        majorChanges: currentMajorMonitors,
        minorChanges: currentMinorMonitors,
      },
      lineChart,
      barChartByWebsite,
      pieClassification: [
        { name: 'Minor', value: pieMinor },
        { name: 'Major', value: pieMajor },
      ],
      activityChart,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
