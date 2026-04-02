import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runCheckForWebsite, runCheckAllActiveWebsites } from '@/lib/website-check';

/**
 * POST /api/check — manual trigger from dashboard (no secret required).
 * Scheduled jobs should use GET /api/cron/check?secret=… when CRON_SECRET is set.
 *
 * Body: { "websiteId"?: string }
 * - Omit websiteId → all active sites
 * - With websiteId → single site
 */
export async function POST(req: Request) {
  let body: { websiteId?: string | null } = {};

  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const websiteId = body.websiteId;

    if (websiteId) {
      const site = await prisma.website.findFirst({
        where: { id: websiteId, isActive: true },
      });

      if (!site) {
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }

      const result = await runCheckForWebsite(site);
      return NextResponse.json({ ok: true, results: [result] }, { status: 200 });
    }

    const results = await runCheckAllActiveWebsites();
    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e: unknown) {
    console.error('[WebPulse:check:api] POST failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
