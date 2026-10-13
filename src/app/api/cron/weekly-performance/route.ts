import { NextResponse } from 'next/server';
import { runWeeklyPerformanceBatch } from '@/lib/server/weekly-performance-runner';

export const dynamic = 'force-dynamic';

function verifyCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // If no secret configured in environment, allow call (or Vercel local dev)
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
 *
 * Triggered automatically by Vercel Cron or an external cron scheduler.
 * Executes the weekly performance marketing email batch dispatch.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyPerformanceBatch({ trigger: 'cron' });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[WeeklyPerformance Cron] Execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/weekly-performance
 * Supports forced execution via webhook / scheduler.
 */
export async function POST(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyPerformanceBatch({ trigger: 'cron', forced: true });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[WeeklyPerformance Cron] Execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
