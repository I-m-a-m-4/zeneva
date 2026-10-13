import { NextResponse } from 'next/server';
import { requireSuperAdmin, corsHeaders } from '../_guard';
import {
  getWeeklyAutomationConfig,
  setWeeklyAutomationConfig,
  getWeeklyPerformanceRunLogs,
  sendWeeklyPerformanceTestEmail,
  runWeeklyPerformanceBatch,
} from '@/lib/server/weekly-performance-runner';
import { getSampleWeeklyStats, renderWeeklyPerformanceEmail } from '@/lib/server/weekly-performance-email';
import { calculateWeeklyPerformanceStats } from '@/lib/server/weekly-performance-stats';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/admin/weekly-performance
 * Returns status, config, history, and preview HTML.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const [config, recentRuns] = await Promise.all([
      getWeeklyAutomationConfig(),
      getWeeklyPerformanceRunLogs(25),
    ]);

    const sampleStats = getSampleWeeklyStats();
    const sampleHtml = renderWeeklyPerformanceEmail(sampleStats).html;

    return NextResponse.json(
      {
        config,
        recentRuns,
        sampleStats,
        sampleHtml,
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
 * Handles toggling automation, running batch on demand, sending test emails, and rendering live preview.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { action } = body || {};

    if (action === 'toggle') {
      const { enabled } = body;
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled boolean is required' }, { status: 400, headers: corsHeaders });
      }
      await setWeeklyAutomationConfig({ enabled });
      const updatedConfig = await getWeeklyAutomationConfig();
      return NextResponse.json({ success: true, config: updatedConfig }, { headers: corsHeaders });
    }

    if (action === 'send_test') {
      const { email, businessId } = body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid target email is required' }, { status: 400, headers: corsHeaders });
      }

      const result = await sendWeeklyPerformanceTestEmail(email.trim(), businessId);
      return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
    }

    if (action === 'run_batch') {
      const result = await runWeeklyPerformanceBatch({ trigger: 'manual', forced: true });
      const updatedConfig = await getWeeklyAutomationConfig();
      const recentRuns = await getWeeklyPerformanceRunLogs(25);
      return NextResponse.json({ success: true, result, config: updatedConfig, recentRuns }, { headers: corsHeaders });
    }

    if (action === 'preview') {
      const { businessId } = body;
      let stats = null;
      if (businessId) {
        stats = await calculateWeeklyPerformanceStats(businessId);
      }
      if (!stats) {
        stats = getSampleWeeklyStats();
      }
      const rendered = renderWeeklyPerformanceEmail(stats);
      return NextResponse.json({ success: true, stats, html: rendered.html }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error('[Admin Weekly Performance] Failed POST:', error);
    return NextResponse.json(
      { error: 'Action failed', message: error?.message || String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
