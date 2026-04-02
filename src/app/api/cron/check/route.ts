import { NextResponse } from 'next/server';
import { runCheckAllActiveWebsites } from '@/lib/website-check';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runCheckAllActiveWebsites();
    return NextResponse.json({ message: 'CRON Job Completed', results }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WebPulse:cron] GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
