import { adminFirestore } from '@/firebase/admin';
import { sendEmail, MarketingOptOutError } from '@/lib/server/resend';
import {
  calculateWeeklyPerformanceStats,
  type WeeklyPerformanceStats,
} from './weekly-performance-stats';
import {
  renderWeeklyPerformanceEmail,
  getSampleWeeklyStats,
} from './weekly-performance-email';
import {
  renderCampaignEmail,
  CAMPAIGN_DRAFTS,
  mergeTokensFor,
} from '@/lib/email-templates';
import {
  profileUser,
  type BehaviorUserLike,
  type BehaviorBusinessLike,
} from '@/lib/behavior-segments';
import type { AutomationTrackId, AutomationTrackMeta } from '@/types';
export type { AutomationTrackId, AutomationTrackMeta };

export interface MarketingAutomationsConfig {
  tracks: Record<AutomationTrackId, AutomationTrackMeta>;
  lastUpdated: string | null;
}

export interface AutomationRunLog {
  id: string;
  trackId: AutomationTrackId;
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

const SETTINGS_DOC = 'marketing_automations';
const LEGACY_DOC = 'weekly_performance_automation';

export const TRACK_DEFINITIONS: Record<
  AutomationTrackId,
  Omit<AutomationTrackMeta, 'enabled' | 'lastRunAt' | 'totalSent'>
> = {
  weekly_performance: {
    id: 'weekly_performance',
    name: 'Weekly Performance Digest',
    badge: 'Sales & Growth',
    description:
      'Personalized sales digest with revenue, % growth, units sold, top products, and strategic advice.',
    schedule: 'Every Monday at 08:00 UTC',
  },
  win_back: {
    id: 'win_back',
    name: 'Win-Back / Re-engagement',
    badge: 'Retention',
    description:
      'Detects merchants whose activity slowed or who haven’t returned, cheering them on and offering help.',
    schedule: 'Weekly check (Wednesdays at 10:00 UTC)',
  },
  cheer_on: {
    id: 'cheer_on',
    name: 'Cheer-On / Champions',
    badge: 'Loyalty & Milestones',
    description:
      'Celebrates high-performing merchants and active sellers with a personal thank you and cheer from the founder.',
    schedule: 'Bi-weekly (Fridays at 14:00 UTC)',
  },
  onboarding: {
    id: 'onboarding',
    name: 'Stalled Onboarding Nudge',
    badge: 'Activation',
    description:
      'Encourages new signups who haven’t rung up their first sale after 3 days, guiding them to start selling.',
    schedule: 'Twice weekly (Tuesdays & Thursdays)',
  },
};

/**
 * Retrieve current configuration for all marketing automation tracks.
 */
export async function getMarketingAutomationsConfig(): Promise<MarketingAutomationsConfig> {
  const defaultTracks: Record<AutomationTrackId, AutomationTrackMeta> = {
    weekly_performance: {
      ...TRACK_DEFINITIONS.weekly_performance,
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    win_back: {
      ...TRACK_DEFINITIONS.win_back,
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    cheer_on: {
      ...TRACK_DEFINITIONS.cheer_on,
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    onboarding: {
      ...TRACK_DEFINITIONS.onboarding,
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
  };

  if (!adminFirestore) {
    return { tracks: defaultTracks, lastUpdated: null };
  }

  try {
    const snap = await adminFirestore
      .collection('platform_settings')
      .doc(SETTINGS_DOC)
      .get();
    const data = snap.data();

    // Check legacy doc for backward compatibility
    let legacyEnabled = true;
    let legacyLastRun: string | null = null;
    let legacyTotal = 0;
    try {
      const legSnap = await adminFirestore
        .collection('platform_settings')
        .doc(LEGACY_DOC)
        .get();
      if (legSnap.exists) {
        const ld = legSnap.data() || {};
        legacyEnabled = ld.enabled !== false;
        legacyLastRun = ld.lastRunAt || null;
        legacyTotal = Number(ld.totalSentCount) || 0;
      }
    } catch {
      // ignore
    }

    const savedTracks = data?.tracks || {};

    const tracks: Record<AutomationTrackId, AutomationTrackMeta> = {
      weekly_performance: {
        ...defaultTracks.weekly_performance,
        enabled:
          savedTracks.weekly_performance?.enabled !== undefined
            ? savedTracks.weekly_performance.enabled
            : legacyEnabled,
        lastRunAt: savedTracks.weekly_performance?.lastRunAt || legacyLastRun,
        totalSent:
          savedTracks.weekly_performance?.totalSent || legacyTotal || 0,
      },
      win_back: {
        ...defaultTracks.win_back,
        enabled: savedTracks.win_back?.enabled !== false,
        lastRunAt: savedTracks.win_back?.lastRunAt || null,
        totalSent: savedTracks.win_back?.totalSent || 0,
      },
      cheer_on: {
        ...defaultTracks.cheer_on,
        enabled: savedTracks.cheer_on?.enabled !== false,
        lastRunAt: savedTracks.cheer_on?.lastRunAt || null,
        totalSent: savedTracks.cheer_on?.totalSent || 0,
      },
      onboarding: {
        ...defaultTracks.onboarding,
        enabled: savedTracks.onboarding?.enabled !== false,
        lastRunAt: savedTracks.onboarding?.lastRunAt || null,
        totalSent: savedTracks.onboarding?.totalSent || 0,
      },
    };

    return {
      tracks,
      lastUpdated: data?.lastUpdated || null,
    };
  } catch (err) {
    console.error('[MarketingAutomations] Failed reading config:', err);
    return { tracks: defaultTracks, lastUpdated: null };
  }
}

/**
 * Update enabled state for a specific automation track.
 */
export async function setTrackEnabled(
  trackId: AutomationTrackId,
  enabled: boolean,
): Promise<void> {
  if (!adminFirestore) return;
  const current = await getMarketingAutomationsConfig();
  const updatedTracks = {
    ...current.tracks,
    [trackId]: {
      ...current.tracks[trackId],
      enabled,
    },
  };

  await adminFirestore
    .collection('platform_settings')
    .doc(SETTINGS_DOC)
    .set(
      {
        tracks: updatedTracks,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true },
    );

  // Sync legacy doc if weekly_performance
  if (trackId === 'weekly_performance') {
    await adminFirestore
      .collection('platform_settings')
      .doc(LEGACY_DOC)
      .set({ enabled, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

/**
 * Fetch execution run logs.
 */
export async function getAutomationRunLogs(
  limitCount = 25,
): Promise<AutomationRunLog[]> {
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
        trackId: data.trackId || 'weekly_performance',
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
  } catch (err) {
    console.error('[MarketingAutomations] Failed loading run logs:', err);
    return [];
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to get a realistic sample BehaviorProfile for rendering preview/test emails.
 */
function getSampleProfile(): ReturnType<typeof profileUser> {
  const sampleUser: BehaviorUserLike = {
    id: 'sample_user_id',
    name: 'Emmanuel Adeyemi',
    email: 'emmanuel@example.com',
    businessId: 'sample_store_id',
    role: 'owner',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    totalUsageSeconds: 4200,
    pagesVisited: 28,
    pageViews: {
      sales_pos: 12,
      inventory: 10,
      reports: 6,
    },
  };
  const sampleBiz: BehaviorBusinessLike = {
    id: 'sample_store_id',
    name: 'Apex Supermarket (Sample Store)',
    plan: 'starter',
  };
  return profileUser(sampleUser, sampleBiz);
}

/**
 * Render preview HTML for a specific automation track.
 */
export function renderTrackPreview(
  trackId: AutomationTrackId,
  isLocalPreview = true,
): { subject: string; html: string } {
  if (trackId === 'weekly_performance') {
    const stats = getSampleWeeklyStats();
    return renderWeeklyPerformanceEmail(stats, { isLocalPreview });
  }

  const sampleProfile = getSampleProfile();
  const tokens = mergeTokensFor(sampleProfile);

  let draft = CAMPAIGN_DRAFTS.invested_then_left;
  if (trackId === 'win_back') {
    draft = CAMPAIGN_DRAFTS.invested_then_left;
  } else if (trackId === 'cheer_on') {
    draft = CAMPAIGN_DRAFTS.champion;
  } else if (trackId === 'onboarding') {
    draft = CAMPAIGN_DRAFTS.onboarding_stalled;
  }

  const subject = draft.subject.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => tokens[key] || '');
  const html = renderCampaignEmail(draft, tokens, { isLocalPreview });

  return { subject, html };
}

/**
 * Send a test email for any automation track directly to an admin's Gmail.
 */
export async function sendTrackTestEmail(
  trackId: AutomationTrackId,
  targetEmail: string,
): Promise<{ ok: boolean; messageId?: string; subject: string }> {
  const { subject, html } = renderTrackPreview(trackId, false);
  const testSubject = `[TEST PREVIEW] ${subject}`;

  // Prepend an admin preview explanation banner so recipients know live emails are 100% dynamic
  const testNotice = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
  <tr>
    <td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#92400e;line-height:1.5;">
      <strong>⚠️ Admin Test Delivery:</strong> This is a layout & font verification email sent to <strong>${targetEmail}</strong>.<br />
      In live automated production runs, all tokens (such as store name <em>{{businessName}}</em>, owner name, sales performance, and behavior telemetry) are 100% dynamically merged from each merchant's real business profile.
    </td>
  </tr>
</table>`;

  const closingBody = html.lastIndexOf('</body>');
  let testHtml = html;
  if (html.includes('<table class="card"')) {
    testHtml = html.replace('<table class="card"', `${testNotice}<table class="card"`);
  } else if (closingBody !== -1) {
    testHtml = html.replace(/<body[^>]*>/, `$&${testNotice}`);
  } else {
    testHtml = testNotice + html;
  }

  const trackIdRes = await sendEmail({
    to: targetEmail,
    name: 'Admin Preview Tester',
    subject: testSubject,
    body: testHtml,
    type: `${trackId}_test`,
    wrap: false,
    segment: trackId,
  });

  return { ok: true, messageId: trackIdRes, subject: testSubject };
}

/**
 * Dispatches a batch run for the specified track.
 */
export async function runAutomationTrack(
  trackId: AutomationTrackId,
  options: { trigger: 'cron' | 'manual'; forced?: boolean },
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  const config = await getMarketingAutomationsConfig();
  const track = config.tracks[trackId];

  if (!track?.enabled && options.trigger === 'cron' && !options.forced) {
    return {
      success: true,
      skipped: true,
      reason: `Automation track "${trackId}" is currently disabled by admin.`,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      durationMs: 0,
    };
  }

  if (!adminFirestore) throw new Error('Firestore admin is not initialized');

  const runRef = adminFirestore.collection('weekly_performance_runs').doc();
  const startedAt = new Date().toISOString();
  await runRef.set({
    startedAt,
    trackId,
    trigger: options.trigger,
    status: 'running',
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    const [bizSnap, usersSnap] = await Promise.all([
      adminFirestore.collection('businessInstances').get(),
      adminFirestore.collection('users').get(),
    ]);

    const businesses = bizSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const bizMap = new Map<string, any>();
    businesses.forEach((b: any) => bizMap.set(b.id, b));

    const emailDedupe = new Set<string>();
    const businessDedupe = new Set<string>();
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data() as BehaviorUserLike & {
        lastMarketingSentAt?: Record<string, string>;
        lastMarketingEmailSentAt?: string;
      };
      const email = u.email;

      // 1. Basic Email Validation & Deduplication
      if (!email || !email.includes('@') || emailDedupe.has(email.toLowerCase())) {
        continue;
      }

      // 2. Do not mail system super-admins or developer accounts
      if (u.role === 'super-admin' || email.toLowerCase() === 'belloimam431@gmail.com') {
        continue;
      }

      // 3. Respect explicit marketing opt-out
      if (u.marketingOptOut === true) {
        skippedCount++;
        continue;
      }

      // 4. Drop suspended or deleted users
      if (u.status === 'deleted' || u.status === 'suspended') {
        continue;
      }

      // 5. Cashiers and staff do NOT make software buying/retention decisions
      // Only store owners, managers, and admins receive store performance and marketing automations
      if (u.role === 'cashier') {
        skippedCount++;
        continue;
      }

      const biz = u.businessId ? bizMap.get(u.businessId) : undefined;
      if (biz && (biz.status === 'deleted' || biz.status === 'suspended')) {
        continue;
      }

      // 6. Anti-fatigue cooldown check (prevent over-emailing active users)
      const lastTrackSentStr = u.lastMarketingSentAt?.[trackId];
      if (lastTrackSentStr && options.trigger === 'cron' && !options.forced) {
        const lastTrackSentMs = new Date(lastTrackSentStr).getTime();
        const cooldownMs = trackId === 'win_back' ? FOURTEEN_DAYS_MS : SEVEN_DAYS_MS;
        if (!isNaN(lastTrackSentMs) && now - lastTrackSentMs < cooldownMs) {
          skippedCount++;
          continue;
        }
      }

      // 7. Compute full Behavioral Intelligence Profile
      const profile = profileUser(u, biz, now);

      // Track-specific qualification filter:
      let shouldSend = false;
      let emailPayload: { subject: string; html: string } | null = null;

      if (trackId === 'weekly_performance') {
        // Must have an associated business and be owner/admin/manager
        const isOwnerOrAdmin =
          !u.businessId ||
          !biz?.ownerId ||
          biz.ownerId === u.id ||
          u.role === 'admin' ||
          u.role === 'owner' ||
          u.role === 'manager';

        if (u.businessId && isOwnerOrAdmin) {
          // Send at most one digest per business instance
          if (businessDedupe.has(u.businessId)) {
            continue;
          }
          businessDedupe.add(u.businessId);

          const stats = await calculateWeeklyPerformanceStats(u.businessId);
          // Only send if the business has recorded sales, products, or active POS activity
          if (stats && (stats.hasSales || stats.topProducts.length > 0 || profile.usageSeconds > 300)) {
            shouldSend = true;
            emailPayload = renderWeeklyPerformanceEmail(stats);
          }
        }
      } else if (trackId === 'win_back') {
        // High-precision win-back targeting:
        // Must be in 'invested_then_left' or 'slipping'
        // 'invested_then_left': put in real setup work (inventory, catalog, usage) but inactive for 4-45 days.
        // 'slipping': past active user who hasn't opened app in 7-30 days.
        // HARD EXCLUSION: If seen within last 3 days, DO NOT send win-back (they haven't left!).
        const isSeenRecently = profile.daysSinceSeen !== null && profile.daysSinceSeen < 4;
        if (!isSeenRecently) {
          if (
            profile.segment === 'invested_then_left' ||
            profile.segment === 'slipping' ||
            (profile.usageSeconds >= 1200 &&
              profile.daysSinceSeen !== null &&
              profile.daysSinceSeen >= 5 &&
              profile.daysSinceSeen <= 45)
          ) {
            shouldSend = true;
            const tokens = mergeTokensFor(profile);
            const draft = CAMPAIGN_DRAFTS.invested_then_left;
            emailPayload = {
              subject: draft.subject.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => tokens[key] || ''),
              html: renderCampaignEmail(draft, tokens),
            };
          }
        }
      } else if (trackId === 'cheer_on') {
        // High-performing champions celebration:
        // Must be recently active (within 7 days) and a deep user
        const isRecent = profile.daysSinceSeen !== null && profile.daysSinceSeen <= 7;
        if (isRecent && (profile.segment === 'champion' || profile.usageSeconds > 3600)) {
          shouldSend = true;
          const tokens = mergeTokensFor(profile);
          const draft = CAMPAIGN_DRAFTS.champion;
          emailPayload = {
            subject: draft.subject.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => tokens[key] || ''),
            html: renderCampaignEmail(draft, tokens),
          };
        }
      } else if (trackId === 'onboarding') {
        // Stalled onboarding nudge:
        // Must have signed up at least 3 days ago, but has not completed sales / stalled setup
        const hasSignedUpAtLeast3Days = profile.daysSinceSignup !== null && profile.daysSinceSignup >= 3;
        const hasNotSold = (profile.familyMix.find((m) => m.family === 'selling')?.views ?? 0) === 0;

        if (
          hasSignedUpAtLeast3Days &&
          hasNotSold &&
          (profile.segment === 'onboarding_stalled' ||
            profile.segment === 'never_activated' ||
            profile.usageSeconds < 600)
        ) {
          shouldSend = true;
          const tokens = mergeTokensFor(profile);
          const draft = CAMPAIGN_DRAFTS.onboarding_stalled;
          emailPayload = {
            subject: draft.subject.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => tokens[key] || ''),
            html: renderCampaignEmail(draft, tokens),
          };
        }
      }

      if (!shouldSend || !emailPayload) {
        continue;
      }

      emailDedupe.add(email.toLowerCase());

      try {
        await sendEmail({
          to: email,
          name: u.name || profile.firstName,
          subject: emailPayload.subject,
          body: emailPayload.html,
          businessId: u.businessId || undefined,
          type: `${trackId}_automation`,
          wrap: false,
          segment: trackId,
        });

        // Record cooldown timestamp on user document
        if (uDoc.id) {
          await adminFirestore
            .collection('users')
            .doc(uDoc.id)
            .set(
              {
                lastMarketingSentAt: {
                  [trackId]: new Date().toISOString(),
                },
                lastMarketingEmailSentAt: new Date().toISOString(),
              },
              { merge: true },
            )
            .catch(() => {});
        }

        sentCount++;
        await sleep(600); // 600ms rate-limit gap
      } catch (err: any) {
        if (err instanceof MarketingOptOutError) {
          skippedCount++;
        } else {
          console.error(`[MarketingAutomations] Error dispatching ${trackId} to ${email}:`, err);
          failedCount++;
        }
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    await runRef.update({
      completedAt,
      status: 'completed',
      sentCount,
      failedCount,
      skippedCount,
      durationMs,
    });

    // Update track stats in Firestore
    const updatedTrackTotal = (track?.totalSent || 0) + sentCount;
    await adminFirestore
      .collection('platform_settings')
      .doc(SETTINGS_DOC)
      .set(
        {
          tracks: {
            [trackId]: {
              lastRunAt: completedAt,
              totalSent: updatedTrackTotal,
            },
          },
        },
        { merge: true },
      );

    return {
      success: true,
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

// Backwards compatibility aliases
export const getWeeklyAutomationConfig = async () => {
  const cfg = await getMarketingAutomationsConfig();
  const w = cfg.tracks.weekly_performance;
  return {
    enabled: w.enabled,
    schedule: w.schedule,
    lastRunAt: w.lastRunAt,
    totalSentCount: w.totalSent,
  };
};

export const setWeeklyAutomationConfig = async (updates: { enabled?: boolean }) => {
  if (updates.enabled !== undefined) {
    await setTrackEnabled('weekly_performance', updates.enabled);
  }
};

export const getWeeklyPerformanceRunLogs = getAutomationRunLogs;
export const sendWeeklyPerformanceTestEmail = (email: string) =>
  sendTrackTestEmail('weekly_performance', email);
export const runWeeklyPerformanceBatch = (options: { trigger: 'cron' | 'manual'; forced?: boolean }) =>
  runAutomationTrack('weekly_performance', options);
