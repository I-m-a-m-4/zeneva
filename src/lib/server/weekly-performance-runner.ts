import { adminFirestore } from '@/firebase/admin';
import { sendEmail, MarketingOptOutError } from '@/lib/server/resend';
import { calculateWeeklyPerformanceStats, type WeeklyPerformanceStats } from './weekly-performance-stats';
import { renderWeeklyPerformanceEmail, getSampleWeeklyStats } from './weekly-performance-email';

export interface WeeklyAutomationConfig {
  enabled: boolean;
  schedule: string;
  lastRunAt: string | null;
  totalSentCount: number;
  lastRunSummary?: {
    sent: number;
    failed: number;
    skipped: number;
    durationMs: number;
    trigger: string;
  } | null;
}

export interface WeeklyRunLog {
  id: string;
  startedAt: string;
  completedAt?: string;
  trigger: 'cron' | 'manual' | 'test';
  status: 'running' | 'completed' | 'failed';
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs?: number;
  details?: string;
  error?: string;
}

const SETTINGS_DOC_ID = 'weekly_performance_automation';

/**
 * Retrieve current configuration for the weekly performance email automation.
 */
export async function getWeeklyAutomationConfig(): Promise<WeeklyAutomationConfig> {
  const defaultCfg: WeeklyAutomationConfig = {
    enabled: true, // Default to true as requested by user
    schedule: 'Mondays at 08:00 UTC',
    lastRunAt: null,
    totalSentCount: 0,
    lastRunSummary: null,
  };

  if (!adminFirestore) return defaultCfg;

  try {
    const doc = await adminFirestore.collection('platform_settings').doc(SETTINGS_DOC_ID).get();
    if (!doc.exists) return defaultCfg;
    const data = doc.data() || {};
    return {
      enabled: data.enabled !== false, // Defaults to enabled unless explicitly set to false
      schedule: data.schedule || defaultCfg.schedule,
      lastRunAt: data.lastRunAt || null,
      totalSentCount: Number(data.totalSentCount) || 0,
      lastRunSummary: data.lastRunSummary || null,
    };
  } catch (error) {
    console.error('[WeeklyPerformance] Failed to load automation config:', error);
    return defaultCfg;
  }
}

/**
 * Update the weekly automation settings (e.g. toggle enabled / disabled).
 */
export async function setWeeklyAutomationConfig(updates: Partial<WeeklyAutomationConfig>): Promise<void> {
  if (!adminFirestore) throw new Error('Firestore admin is not initialized');
  await adminFirestore.collection('platform_settings').doc(SETTINGS_DOC_ID).set(
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Fetch recent weekly performance run history.
 */
export async function getWeeklyPerformanceRunLogs(limitCount = 20): Promise<WeeklyRunLog[]> {
  if (!adminFirestore) return [];
  try {
    const snap = await adminFirestore
      .collection('weekly_performance_runs')
      .orderBy('startedAt', 'desc')
      .limit(limitCount)
      .get();

    return snap.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        trigger: data.trigger || 'manual',
        status: data.status || 'completed',
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        skippedCount: data.skippedCount || 0,
        durationMs: data.durationMs,
        details: data.details,
        error: data.error,
      };
    });
  } catch (error) {
    console.error('[WeeklyPerformance] Failed to fetch run logs:', error);
    return [];
  }
}

/**
 * Delay execution to stay safely within Resend rate limits (e.g. ~2 req/sec).
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a test send to an admin/specified email address.
 */
export async function sendWeeklyPerformanceTestEmail(targetEmail: string, businessId?: string): Promise<{ ok: boolean; messageId?: string; subject: string }> {
  let stats: WeeklyPerformanceStats | null = null;
  if (businessId) {
    stats = await calculateWeeklyPerformanceStats(businessId);
  }
  if (!stats) {
    stats = getSampleWeeklyStats();
  }

  const rendered = renderWeeklyPerformanceEmail(stats);
  const subject = `[Preview] ${rendered.subject}`;

  const trackId = await sendEmail({
    to: targetEmail,
    name: 'Admin Tester',
    subject,
    body: rendered.html,
    businessId: stats.businessId,
    type: 'weekly_performance_test',
    wrap: false,
    segment: 'test_preview',
  });

  return { ok: true, messageId: trackId, subject };
}

/**
 * Main batch runner: loops through active businesses, calculates performance,
 * renders the email, and dispatches via Resend.
 */
export async function runWeeklyPerformanceBatch(options: {
  trigger: 'cron' | 'manual';
  forced?: boolean;
}): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  totalBusinesses: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  const config = await getWeeklyAutomationConfig();

  // If automation is paused and this was triggered by cron without force, stop immediately
  if (!config.enabled && options.trigger === 'cron' && !options.forced) {
    console.log('[WeeklyPerformance] Cron skipped: automation is currently disabled by admin.');
    return {
      success: true,
      skipped: true,
      reason: 'Automation is currently toggled OFF in the admin console.',
      totalBusinesses: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      durationMs: 0,
    };
  }

  if (!adminFirestore) {
    throw new Error('Firestore admin is not initialized');
  }

  // Create a run log entry
  const runRef = adminFirestore.collection('weekly_performance_runs').doc();
  const startedAt = new Date().toISOString();
  await runRef.set({
    startedAt,
    trigger: options.trigger,
    status: 'running',
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let totalBusinesses = 0;

  try {
    // 1. Fetch all business instances
    const bizSnap = await adminFirestore.collection('businessInstances').get();
    totalBusinesses = bizSnap.size;

    // Build map of ownerId / business info
    const businesses = bizSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 2. Fetch users to find recipient emails and check marketing opt-out
    const usersSnap = await adminFirestore.collection('users').get();
    const userByBizId = new Map<string, any>();
    const userById = new Map<string, any>();

    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data();
      userById.set(uDoc.id, { id: uDoc.id, ...u });
      if (u.businessId && (u.role === 'owner' || u.role === 'admin' || !userByBizId.has(u.businessId))) {
        userByBizId.set(u.businessId, { id: uDoc.id, ...u });
      }
    }

    const emailDedupe = new Set<string>();

    for (const biz of businesses) {
      // Find appropriate recipient user
      let targetUser = userByBizId.get(biz.id);
      if (!targetUser && biz.ownerId) {
        targetUser = userById.get(biz.ownerId);
      }

      const email = targetUser?.email || biz.email;
      const recipientName = targetUser?.name || biz.ownerName || biz.name || 'Merchant';

      // Validation & Opt-Out Checks
      if (!email || !email.includes('@') || emailDedupe.has(email.toLowerCase())) {
        skippedCount++;
        continue;
      }

      if (targetUser?.marketingOptOut === true || biz.marketingOptOut === true) {
        skippedCount++;
        continue;
      }

      emailDedupe.add(email.toLowerCase());

      try {
        // Calculate weekly stats
        const stats = await calculateWeeklyPerformanceStats(biz.id);
        if (!stats) {
          skippedCount++;
          continue;
        }

        // Render responsive email
        const rendered = renderWeeklyPerformanceEmail(stats);

        // Dispatch via Resend with open tracking & opt-out support
        await sendEmail({
          to: email,
          name: recipientName,
          subject: rendered.subject,
          body: rendered.html,
          businessId: biz.id,
          type: 'weekly_performance',
          wrap: false,
          segment: 'weekly_digest',
        });

        sentCount++;

        // Gentle pause to stay under Resend rate limit (2 req/s)
        await sleep(600);
      } catch (err: any) {
        if (err instanceof MarketingOptOutError) {
          skippedCount++;
        } else {
          console.error(`[WeeklyPerformance] Error dispatching to ${email}:`, err);
          failedCount++;
        }
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Update run log
    await runRef.update({
      completedAt,
      status: 'completed',
      sentCount,
      failedCount,
      skippedCount,
      totalBusinesses,
      durationMs,
    });

    // Update automation config summary
    const newTotal = (config.totalSentCount || 0) + sentCount;
    await setWeeklyAutomationConfig({
      lastRunAt: completedAt,
      totalSentCount: newTotal,
      lastRunSummary: {
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        durationMs,
        trigger: options.trigger,
      },
    });

    return {
      success: true,
      totalBusinesses,
      sentCount,
      failedCount,
      skippedCount,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await runRef.update({
      status: 'failed',
      error: err?.message || String(err),
      sentCount,
      failedCount,
      skippedCount,
      durationMs,
    });
    throw err;
  }
}
