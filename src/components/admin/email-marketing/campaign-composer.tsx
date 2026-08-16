'use client';

/**
 * Campaign composer.
 *
 * Picks a draft for the segment being mailed, lets the operator edit the prose,
 * previews the *exact* HTML that will be sent, then sends it one recipient at a
 * time with each message personalised from that recipient's own behaviour.
 *
 * Two things it deliberately does not do:
 *
 * - **It never edits raw HTML.** The body is prose with a two-mark markdown
 *   subset; the markup comes from `renderCampaignEmail`. Handing an operator a
 *   textarea full of table tags is how a malformed campaign reaches customers.
 * - **It never sends in parallel.** These are real emails to real merchants, and
 *   Resend's default ceiling is around two requests a second. Sequential with a
 *   gap, plus progress and a working Stop, beats a fast run that trips a rate
 *   limit halfway and leaves the operator guessing who got what.
 */

import * as React from 'react';
import { getAuth } from 'firebase/auth';
import {
  AlertCircle,
  BanIcon,
  Eye,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiBase } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/components/admin/user-detail/user-primitives';
import {
  BEHAVIOR_SEGMENT_META,
  BEHAVIOR_SEGMENT_ORDER,
  FAMILY_META,
  type BehaviorProfile,
  type BehaviorSegment,
} from '@/lib/behavior-segments';
import {
  CAMPAIGN_FROM,
  CAMPAIGN_REPLY_TO,
  mergeTokensFor,
  renderForProfile,
  unknownTokensIn,
  type EmailDraft,
} from '@/lib/email-templates';
import { TONE_CLASSES } from './segment-styles';

/**
 * Gap between sends. Resend's default limit is ~2 requests/second; 600 ms keeps a
 * comfortable margin without making a 50-person campaign feel stalled.
 */
const SEND_GAP_MS = 600;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * The one-line summary archived on each `follow_up_logs` row.
 *
 * This is what the audit table's "Intel" chip shows, and it is the record of *why*
 * this person was mailed — six months from now the open rate is meaningless
 * without it.
 */
function behaviorContextFor(profile: BehaviorProfile): string {
  const parts: string[] = [BEHAVIOR_SEGMENT_META[profile.segment].label];
  if (profile.topFeature) {
    parts.push(
      `${Math.round(profile.topFeatureShare * 100)}% ${FAMILY_META[profile.topFeature].label}`,
    );
  }
  parts.push(formatDuration(profile.usageSeconds));
  parts.push(`${profile.pageViews.toLocaleString()} views`);
  if (profile.daysSinceSeen !== null) parts.push(`seen ${profile.daysSinceSeen}d ago`);
  return parts.join(' · ');
}

type SendOutcome = { sent: number; skipped: number; failed: number };

interface CampaignComposerProps {
  /** Everyone ticked in the audience tab, contactable or not. */
  recipients: BehaviorProfile[];
  /**
   * The draft, owned by the page.
   *
   * Deliberately not local state: Radix unmounts the inactive `TabsContent`, so a
   * draft held here would be thrown away the moment the operator flipped to the
   * Audience tab to check something and came back.
   */
  draft: EmailDraft;
  onDraftChange: (draft: EmailDraft) => void;
  /** Which template the draft came from — drives the selected chip. */
  templateSegment: BehaviorSegment;
  onPickTemplate: (segment: BehaviorSegment) => void;
  onSent: () => void;
}

export default function CampaignComposer({
  recipients,
  draft,
  onDraftChange,
  templateSegment,
  onPickTemplate,
  onSent,
}: CampaignComposerProps) {
  const { toast } = useToast();

  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [isSending, setIsSending] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const abortRef = React.useRef(false);

  // Excluded here rather than mid-loop, so the count the operator confirms is the
  // count that actually gets mailed.
  const mailable = React.useMemo(() => recipients.filter(r => r.contactable), [recipients]);
  const excluded = recipients.length - mailable.length;

  const previewProfile = mailable[previewIndex] ?? mailable[0] ?? null;

  React.useEffect(() => {
    // Keep the preview pointer inside the list when the selection shrinks.
    if (previewIndex >= mailable.length) setPreviewIndex(0);
  }, [mailable.length, previewIndex]);

  /**
   * Edit one field. Written as an assignment rather than a computed-key spread
   * (`{ ...draft, [field]: value }`) because every field of `EmailDraft` is a
   * string, which makes this form exactly as safe and unambiguous to the compiler.
   */
  const patch = (field: keyof EmailDraft) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const next: EmailDraft = { ...draft };
    next[field] = e.target.value;
    onDraftChange(next);
  };

  const preview = React.useMemo(() => {
    if (!previewProfile) return null;
    // A dead href in the preview: the real one needs the tracking id, which only
    // exists once `sendEmail` has minted it.
    return renderForProfile(draft, previewProfile, { unsubscribeUrl: '#' });
  }, [draft, previewProfile]);

  /** Tokens the operator has typed that nothing will fill. */
  const strayTokens = React.useMemo(() => {
    if (!previewProfile) return [];
    const tokens = mergeTokensFor(previewProfile);
    const fields = [draft.subject, draft.heading, draft.eyebrow, draft.body, draft.callout, draft.ctaLabel, draft.ctaPath];
    return [...new Set(fields.flatMap(f => unknownTokensIn(f, tokens)))];
  }, [draft, previewProfile]);

  async function handleSend() {
    if (!mailable.length) return;

    setIsSending(true);
    abortRef.current = false;
    setProgress({ done: 0, total: mailable.length });

    const outcome: SendOutcome = { sent: 0, skipped: 0, failed: 0 };

    try {
      const token = await getAuth().currentUser?.getIdToken();

      for (let i = 0; i < mailable.length; i++) {
        if (abortRef.current) break;
        const profile = mailable[i];

        try {
          // Rendered per recipient: same draft, different numbers, different name.
          const { subject, html } = renderForProfile(draft, profile);

          const response = await fetch(`${apiBase()}/api/admin/send-follow-up`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              to: profile.email,
              name: profile.name || profile.firstName,
              subject,
              html,
              businessId: profile.businessId,
              type: 'marketing',
              from: CAMPAIGN_FROM,
              replyTo: CAMPAIGN_REPLY_TO,
              // The campaign templates render a whole document, so the
              // transactional wrapper must stay off.
              wrap: false,
              segment: profile.segment,
              behaviorContext: behaviorContextFor(profile),
            }),
          });

          const result = await response.json();
          if (result.success) outcome.sent++;
          else if (result.skipped) outcome.skipped++;
          else outcome.failed++;
        } catch {
          outcome.failed++;
        }

        setProgress({ done: i + 1, total: mailable.length });
        if (i < mailable.length - 1 && !abortRef.current) await sleep(SEND_GAP_MS);
      }

      const stopped = abortRef.current;
      const notAttempted = mailable.length - outcome.sent - outcome.skipped - outcome.failed;

      toast({
        variant: outcome.failed === 0 && !stopped ? 'success' : 'destructive',
        title: stopped ? 'Campaign stopped' : 'Campaign complete',
        description: [
          `${outcome.sent} sent`,
          outcome.skipped ? `${outcome.skipped} skipped (unsubscribed)` : null,
          outcome.failed ? `${outcome.failed} failed` : null,
          stopped && notAttempted > 0 ? `${notAttempted} not attempted` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      });

      onSent();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not send', description: error.message });
    } finally {
      setIsSending(false);
      setProgress(null);
      abortRef.current = false;
    }
  }

  if (recipients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nobody selected yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Go to the Audience tab, pick a behaviour segment, and tick the people you
            want to write to. The template and the numbers in it follow from what
            they actually do in the app.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ---------------- Left: the draft ---------------- */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Template
            </CardTitle>
            <CardDescription className="text-xs">
              Each one is written for a behaviour, not a plan. Picking one replaces
              the draft below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {BEHAVIOR_SEGMENT_ORDER.map(segment => (
              <button
                key={segment}
                type="button"
                onClick={() => onPickTemplate(segment)}
                title={BEHAVIOR_SEGMENT_META[segment].blurb}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                  templateSegment === segment
                    ? 'border-primary bg-primary text-primary-foreground'
                    : cn(TONE_CLASSES[BEHAVIOR_SEGMENT_META[segment].tone], 'hover:opacity-80'),
                )}
              >
                {BEHAVIOR_SEGMENT_META[segment].label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Copy</CardTitle>
            <CardDescription className="text-xs">
              Write prose, not HTML. <code className="font-mono">**bold**</code> and{' '}
              <code className="font-mono">[label](url)</code> work; a blank line starts
              a new paragraph.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Subject</Label>
              <Input value={draft.subject} onChange={patch('subject')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Inbox preview line</Label>
              <Input value={draft.preheader} onChange={patch('preheader')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Kicker</Label>
                <Input value={draft.eyebrow} onChange={patch('eyebrow')} placeholder="optional" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Button label</Label>
                <Input value={draft.ctaLabel} onChange={patch('ctaLabel')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Headline</Label>
              <Input value={draft.heading} onChange={patch('heading')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea value={draft.body} onChange={patch('body')} rows={12} className="text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Highlighted panel — their real numbers{' '}
                <span className="font-normal text-muted-foreground">(empty hides it)</span>
              </Label>
              <Textarea value={draft.callout} onChange={patch('callout')} rows={3} className="text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Button link</Label>
              <Input value={draft.ctaPath} onChange={patch('ctaPath')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Merge tokens</CardTitle>
            <CardDescription className="text-xs">
              Filled per recipient at send time, so every email carries that
              person&apos;s own figures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {previewProfile
                && Object.entries(mergeTokensFor(previewProfile)).map(([key, value]) => (
                  <span
                    key={key}
                    title={`${previewProfile.firstName}: ${value}`}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {`{{${key}}}`}
                  </span>
                ))}
            </div>
            {strayTokens.length > 0 && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Nothing will fill {strayTokens.map(t => `{{${t}}}`).join(', ')} — it will
                  send as an empty space. Check the spelling.
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Right: preview + send ---------------- */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4 shrink-0 text-primary" />
                  Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  Exactly what will be sent — same renderer, same bytes.
                </CardDescription>
              </div>
              {mailable.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                    disabled={previewIndex === 0}
                  >
                    Prev
                  </Button>
                  <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
                    {previewIndex + 1}/{mailable.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewIndex(i => Math.min(mailable.length - 1, i + 1))}
                    disabled={previewIndex >= mailable.length - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
            {previewProfile && (
              <p className="min-w-0 break-words pt-1 text-[11px] text-muted-foreground">
                As seen by <strong>{previewProfile.name || previewProfile.firstName}</strong>{' '}
                ({previewProfile.email}) · {behaviorContextFor(previewProfile)}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {preview ? (
              <>
                <div className="border-y bg-muted/40 px-4 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</p>
                  <p className="break-words text-sm font-semibold">{preview.subject}</p>
                </div>
                {/*
                  Fully sandboxed iframe, matching the audit dialog in
                  follow-up-center.tsx: this markup contains merchant-supplied
                  names, and it renders on the super-admin origin — the one session
                  firestore.rules grants platform-wide write. `sandbox=""` applies
                  every restriction, so nothing in here can run. It is also a
                  truer preview than injected HTML, since the email's own styles
                  are isolated from the admin page's.
                */}
                <iframe
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={preview.html}
                  title="Campaign email preview"
                  className="h-[60vh] min-h-[360px] w-full border-0 bg-white"
                />
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Nobody mailable in this selection.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-primary" />
              Send
            </CardTitle>
            <CardDescription className="text-xs">
              From {CAMPAIGN_FROM} · replies come straight back to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {mailable.length} recipient{mailable.length === 1 ? '' : 's'}
              </Badge>
              {excluded > 0 && (
                <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
                  <BanIcon className="h-3 w-3" />
                  {excluded} excluded (unsubscribed or no email)
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Sent one at a time with a short gap, so a large run cannot trip
              Resend&apos;s rate limit. Anyone who unsubscribes mid-run is skipped by
              the server, not just by this list.
            </p>

            {progress ? (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {progress.done}/{progress.total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    abortRef.current = true;
                  }}
                >
                  Stop
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSend}
                disabled={isSending || mailable.length === 0 || !draft.subject.trim()}
                className="gap-2"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to {mailable.length} {mailable.length === 1 ? 'person' : 'people'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
