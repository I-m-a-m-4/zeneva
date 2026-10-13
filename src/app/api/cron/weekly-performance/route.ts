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

const ALL_AUTOMATION_TRACKS: AutomationTrackId[] = [
  'weekly_performance',
  'win_back',
  'cheer_on',
  'onboarding',
];

/**
 * GET /api/cron/weekly-performance
 * Automated cloud cron runner.
 * When called by Vercel Cron without a track parameter (or track=all),
 * executes all 4 automated marketing tracks sequentially according to admin configuration.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const trackParam = searchParams.get('track');

    if (trackParam && trackParam !== 'all') {
      const track = trackParam as AutomationTrackId;
      const result = await runAutomationTrack(track, { trigger: 'cron' });
      return NextResponse.json(result);
    }

    // Default cron behavior: execute all enabled tracks sequentially in the background
    const results: Record<string, any> = {};
    for (const trackId of ALL_AUTOMATION_TRACKS) {
      try {
        results[trackId] = await runAutomationTrack(trackId, { trigger: 'cron' });
      } catch (err: any) {
        results[trackId] = {
          success: false,
          error: err?.message || String(err),
        };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tracksExecuted: ALL_AUTOMATION_TRACKS,
      results,
    });
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
 * Supports forced webhook execution for a track or all tracks.
 */
export async function POST(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const trackParam = searchParams.get('track');
    const forceFlag = searchParams.get('forced') === 'true';

    if (trackParam && trackParam !== 'all') {
      const track = trackParam as AutomationTrackId;
      const result = await runAutomationTrack(track, { trigger: 'cron', forced: forceFlag });
      return NextResponse.json(result);
    }

    const results: Record<string, any> = {};
    for (const trackId of ALL_AUTOMATION_TRACKS) {
      try {
        results[trackId] = await runAutomationTrack(trackId, { trigger: 'cron', forced: forceFlag });
      } catch (err: any) {
        results[trackId] = {
          success: false,
          error: err?.message || String(err),
        };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('[WeeklyPerformance Cron] Execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500 },
    );
  }
}
