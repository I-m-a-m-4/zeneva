import { NextResponse } from 'next/server';
import { requireSuperAdmin, corsHeaders } from '../_guard';
import {
  getMarketingAutomationsConfig,
  setTrackEnabled,
  getAutomationRunLogs,
  sendTrackTestEmail,
  runAutomationTrack,
  renderTrackPreview,
  type AutomationTrackId,
} from '@/lib/server/weekly-performance-runner';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/admin/weekly-performance
 * Returns all automation tracks, config, run history, and default preview HTML.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const [config, recentRuns] = await Promise.all([
      getMarketingAutomationsConfig(),
      getAutomationRunLogs(30),
    ]);

    const defaultPreview = renderTrackPreview('weekly_performance', true);

    return NextResponse.json(
      {
        config,
        recentRuns,
        preview: defaultPreview,
      },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('[Admin Weekly Performance] Failed GET:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/admin/weekly-performance
 * Handles toggling individual tracks, testing emails to Gmail, running tracks, and switching previews.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { action, trackId = 'weekly_performance' } = body || {};

    if (action === 'toggle') {
      const { enabled } = body;
      if (typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'enabled boolean is required' },
          { status: 400, headers: corsHeaders },
        );
      }

      await setTrackEnabled(trackId as AutomationTrackId, enabled);
      const updatedConfig = await getMarketingAutomationsConfig();
      return NextResponse.json(
        { success: true, config: updatedConfig },
        { headers: corsHeaders },
      );
    }

    if (action === 'send_test') {
      const { email } = body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Valid target email is required' },
          { status: 400, headers: corsHeaders },
        );
      }

      const result = await sendTrackTestEmail(trackId as AutomationTrackId, email.trim());
      return NextResponse.json(
        { success: true, ...result },
        { headers: corsHeaders },
      );
    }

    if (action === 'run_track' || action === 'run_batch') {
      const result = await runAutomationTrack(trackId as AutomationTrackId, {
        trigger: 'manual',
        forced: true,
      });
      const updatedConfig = await getMarketingAutomationsConfig();
      const recentRuns = await getAutomationRunLogs(30);
      return NextResponse.json(
        { success: true, result, config: updatedConfig, recentRuns },
        { headers: corsHeaders },
      );
    }

    if (action === 'preview') {
      const preview = renderTrackPreview(trackId as AutomationTrackId, true);
      return NextResponse.json(
        { success: true, preview },
        { headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400, headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('[Admin Weekly Performance] Failed POST:', error);
    return NextResponse.json(
      { error: 'Action failed', message: error?.message || String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
