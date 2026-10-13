import { NextResponse } from 'next/server';
import {
  runAutomationTrack,
  type AutomationTrackId,
} from '@/lib/server/weekly-performance-runner';

export const dynamic = 'force-dynamic';

function verifyCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('key') === cronSecret) return true;
  } catch {
    // ignore URL parsing error
  }

  return false;
}

/**
 * GET /api/cron/weekly-performance
 * Supports automated cron dispatch for any track (defaults to weekly_performance).
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const track = (searchParams.get('track') as AutomationTrackId) || 'weekly_performance';

    const result = await runAutomationTrack(track, { trigger: 'cron' });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[WeeklyPerformance Cron] Execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/weekly-performance
 * Supports forced webhook execution for a track.
 */
export async function POST(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const track = (searchParams.get('track') as AutomationTrackId) || 'weekly_performance';

    const result = await runAutomationTrack(track, { trigger: 'cron', forced: true });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[WeeklyPerformance Cron] Execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500 },
    );
  }
}
