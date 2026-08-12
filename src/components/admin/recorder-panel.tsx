'use client';

import * as React from 'react';
import {
  Loader2, Play, Square, Download, AlertTriangle, Info, RefreshCw, Terminal,
  Sun, Moon, Monitor, Smartphone, Music, KeyRound, CheckCircle2, Video, Trash2,
  Eye, EyeOff, Mic,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { adminApiFetch, AdminApiError, adminApiBase } from '@/lib/admin-api';
import { RecorderLive } from '@/components/admin/recorder-live';
import { RecorderRecipe } from '@/components/admin/recorder-recipe';
import { FlowTitleCards } from '@/components/admin/recorder-cards';
import { RecorderTrim } from '@/components/admin/recorder-trim';
import {
  FLOWS, DEVICES, FLOW_IDS, DEVICE_IDS, THEME_IDS, FPS_RANGE, QUALITY_RANGE,
  VOICE_IDS, VOICES, VOICE_STYLE_MAX, DEFAULT_RECORD_URL,
  cleanRecordUrl, defaultRequest, takeCount, estimateSeconds, durationLabel,
  type Recipe, type RecorderRequest, type RecorderStatus, type RecorderTake,
  type FlowId, type DeviceId, type ThemeId, type VoiceId,
} from '@/lib/marketing/recorder';

/**
 * Control panel for the recorder bot.
 *
 * The work happens in `scripts/record/`, which drives a real Chrome against the
 * running app. This is the trigger and the viewer: pick the takes, start the
 * run, watch the log, play back what came out.
 *
 * It polls while a job runs rather than streaming, because the run is minutes
 * long and a dropped socket mid-take would leave the panel looking hung when
 * the recording is in fact fine. Polling re-reads the truth every time.
 */

const POLL_MS = 1500;

/** Toggle one value in a multi-select, refusing to empty it. */
function toggle<T>(list: T[], value: T, allowEmpty = false): T[] {
  if (list.includes(value)) {
    return list.length === 1 && !allowEmpty ? list : list.filter((v) => v !== value);
  }
  return [...list, value];
}

function bytesLabel(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}

/** Pull a take out of the admin API as a blob — these URLs need a bearer token. */
async function fetchTake(name: string): Promise<Blob> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('You are not signed in.');
  const token = await user.getIdToken();
  const res = await fetch(`${adminApiBase()}/api/admin/record/file/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Could not load ${name} (${res.status}).`);
  return res.blob();
}

export function RecorderPanel() {
  const { toast } = useToast();

  const [status, setStatus] = React.useState<RecorderStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [starting, setStarting] = React.useState(false);
  const [req, setReq] = React.useState<RecorderRequest>(defaultRequest);
  const [showLog, setShowLog] = React.useState(false);

  const [preview, setPreview] = React.useState<{ name: string; url: string } | null>(null);
  const [busyTake, setBusyTake] = React.useState<string | null>(null);
  const previewRef = React.useRef<string | null>(null);

  // The password field is write-only: it is never populated from the server, so
  // it starts empty every time even when an account is already saved.
  const [creds, setCreds] = React.useState({ email: '', password: '' });
  const [editingCreds, setEditingCreds] = React.useState(false);
  const [savingCreds, setSavingCreds] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const running = status?.job?.state === 'running';

  const refresh = React.useCallback(async () => {
    try {
      setStatus(await adminApiFetch<RecorderStatus>('/api/admin/record'));
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        setStatus(null);
      }
      // A failed poll is not worth a toast — the next one is 1.5s away.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  // Poll only while something is running. An idle panel makes no requests.
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(id);
  }, [running, refresh]);

  // Object URLs outlive the component unless they are revoked; a few 40 MB
  // videos held by a forgotten URL is a real leak in a long admin session.
  React.useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const lastJob = status?.job ?? null;
  const wasJustDone = lastJob && lastJob.state === 'done' && lastJob.takes.length > 0;

  const start = async () => {
    setStarting(true);
    try {
      await adminApiFetch('/api/admin/record', { body: req });
      setShowLog(true);
      await refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not start',
        description: (err as Error)?.message ?? 'Something went wrong.',
      });
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    try {
      await adminApiFetch('/api/admin/record', { method: 'DELETE' });
      await refresh();
    } catch {
      toast({ variant: 'destructive', title: 'Could not stop the run.' });
    }
  };

  const saveCreds = async () => {
    const email = creds.email.trim();
    if (!email || !creds.password) return;
    setSavingCreds(true);
    try {
      await adminApiFetch('/api/admin/record', {
        method: 'PUT',
        body: { email, password: creds.password },
      });
      // Drop the password from component state the moment it is saved — it
      // lives in .env.recorder now, and nothing here needs it again.
      setCreds({ email: '', password: '' });
      setShowPassword(false);
      setEditingCreds(false);
      await refresh();
      toast({ title: 'Account saved', description: `The bot will sign in as ${email}.` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save the account',
        description: (err as Error)?.message ?? 'Something went wrong.',
      });
    } finally {
      setSavingCreds(false);
    }
  };

  const openPreview = async (take: RecorderTake) => {
    setBusyTake(take.name);
    try {
      const blob = await fetchTake(take.name);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPreview({ name: take.name, url });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not open', description: (err as Error).message });
    } finally {
      setBusyTake(null);
    }
  };

  const saveTake = async (take: RecorderTake) => {
    setBusyTake(take.name);
    try {
      const blob = await fetchTake(take.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = take.name;
      a.click();
      // Revoke on the next tick — immediately can cancel the download in Safari.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not download', description: (err as Error).message });
    } finally {
      setBusyTake(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking the recorder…
      </div>
    );
  }

  const blocked = status && !status.available;
  const noCreds = status?.credentials.configured === false;
  const noFfmpeg = status?.ffmpeg === false;
  const count = takeCount(req);
  const eta = estimateSeconds(req);

  // The target, judged by the same function the route will judge it with. A typo
  // is caught here so it costs a keystroke rather than a rejected run; the route
  // still re-checks, because the panel is not the only thing that can post.
  const target = req.url === null ? DEFAULT_RECORD_URL : cleanRecordUrl(req.url);
  const badUrl = req.url !== null && target === null;
  const remote = target !== null && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(target);

  return (
    <div className="space-y-6">
      {/* Blockers first — everything below is unusable until these are cleared */}
      {blocked && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">
              The recorder can&apos;t run here
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{status?.reason}</p>
          </div>
        </div>
      )}

      {!blocked && noFfmpeg && (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-destructive">ffmpeg is not installed</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The frames are captured by Chrome but stitched into a video by ffmpeg, so there is
              no recording without it.
            </p>
            <code className="block rounded bg-background/80 px-2 py-1.5 font-mono text-[10px]">
              winget install ffmpeg
            </code>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ account */}
      {!blocked && (
        <Card className={cn(noCreds && 'border-destructive/40')}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4" />
                  Recorder account
                </CardTitle>
                <CardDescription>
                  The bot signs in like a person, so it needs an account to use.
                </CardDescription>
              </div>
              {status?.credentials.configured && !editingCreds && (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ready
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    disabled={running}
                    onClick={() => {
                      setCreds({ email: status.credentials.email ?? '', password: '' });
                      setEditingCreds(true);
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.credentials.configured && !editingCreds ? (
              <>
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 text-xs text-muted-foreground">
                    Recording as{' '}
                    <span className="font-mono text-foreground">{status.credentials.email}</span>
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Whatever this account can see ends up in the footage, and every take costs real
                  Firestore reads — point it at a{' '}
                  <strong className="text-foreground">demo business</strong>, not the live one.
                </p>
              </>
            ) : (
              <>
                {noCreds && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Enter the login the bot should use. It is written to{' '}
                    <code className="font-mono text-[11px]">.env.recorder</code>, which is
                    gitignored, so it stays on this machine and never reaches the repo.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="rec-email">Email</Label>
                    <Input
                      id="rec-email"
                      type="email"
                      autoComplete="off"
                      placeholder="demo@yourbusiness.com"
                      value={creds.email}
                      disabled={running || savingCreds}
                      onChange={(e) => setCreds((c) => ({ ...c, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rec-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="rec-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={creds.password}
                        disabled={running || savingCreds}
                        onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') void saveCreds(); }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={running || savingCreds || !creds.email.trim() || !creds.password}
                    onClick={() => void saveCreds()}
                  >
                    {savingCreds
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="h-4 w-4" />}
                    Save account
                  </Button>
                  {status?.credentials.configured && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={savingCreds}
                      onClick={() => {
                        setEditingCreds(false);
                        setCreds({ email: '', password: '' });
                        setShowPassword(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use a <strong className="text-foreground">demo business</strong>, not the live
                  one — whatever this account can see ends up in the video.
                </p>
              </>
            )}

            {status?.credentials.source === 'env' && (
              <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This account comes from an environment variable, which the recorder reads{' '}
                  <strong className="text-foreground">before</strong> the file. Saving here will
                  not change which account it uses until{' '}
                  <code className="font-mono text-[11px]">ZENEVA_RECORD_EMAIL</code> is unset in
                  the shell that started the dev server.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ live view

          Above the grid rather than inside a column, because it is the thing to
          look at while a take runs and a 340px sidebar cannot show a 1920px
          browser. It stays mounted when nothing is recording: it costs one small
          poll a second, and having the panel already there is what makes the
          first frame appear instantly rather than after a layout shift. */}
      <RecorderLive onFinished={refresh} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------------------------ what to record */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Flows</CardTitle>
              <CardDescription>What the bot does on camera. Pick one or several.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {FLOW_IDS.map((id) => {
                  const on = req.flows.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={running}
                      onClick={() => setReq((r) => ({
                        // A recipe is a subject too, so the last flow may be
                        // deselected when one is present — "record only my
                        // custom page" has to be expressible.
                        ...r,
                        flows: toggle(r.flows, id, !!r.recipe) as FlowId[],
                      }))}
                      aria-pressed={on}
                      className={cn(
                        'group rounded-xl border p-4 text-left shadow-sm transition-all duration-300',
                        'hover:-translate-y-1 hover:shadow-md disabled:pointer-events-none disabled:opacity-50',
                        on
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-headline text-sm font-bold">{FLOWS[id].title}</h4>
                        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                          ~{FLOWS[id].seconds}s
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {FLOWS[id].blurb}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* The first and last thing a viewer sees of every take. These
                  default to the recorder's own copy, and only a rewrite is sent
                  — a run that changes nothing carries no card overrides. */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Title screens</Label>
                <FlowTitleCards
                  cards={req.cards}
                  disabled={running}
                  hasKey={!!status?.narration}
                  onChange={(cards) => setReq((r) => ({ ...r, cards }))}
                />
              </div>

              {/* Anything else the bot should record, described rather than coded. */}
              <RecorderRecipe
                recipe={req.recipe}
                disabled={running}
                hasKey={!!status?.narration}
                onChange={(recipe: Recipe | null) => setReq((r) => ({ ...r, recipe }))}
              />

              {!req.flows.length && !req.recipe && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
                  Nothing selected — pick a flow above, or add a custom recording.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Device</CardTitle>
                <CardDescription>Mobile records the app&apos;s real mobile layout.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {DEVICE_IDS.map((id) => {
                  const on = req.devices.includes(id);
                  const Icon = id === 'mobile' ? Smartphone : Monitor;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={running}
                      onClick={() => setReq((r) => ({ ...r, devices: toggle(r.devices, id) as DeviceId[] }))}
                      aria-pressed={on}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 text-center transition-all',
                        'disabled:pointer-events-none disabled:opacity-50',
                        on
                          ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className={cn('text-sm font-medium', on ? 'text-primary' : 'text-foreground')}>
                        {DEVICES[id].label}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {DEVICES[id].note}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Theme</CardTitle>
                <CardDescription>Set before first paint — no flash of the wrong one.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {THEME_IDS.map((id) => {
                  const on = req.themes.includes(id);
                  const Icon = id === 'dark' ? Moon : Sun;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={running}
                      onClick={() => setReq((r) => ({ ...r, themes: toggle(r.themes, id) as ThemeId[] }))}
                      aria-pressed={on}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 text-center capitalize transition-all',
                        'disabled:pointer-events-none disabled:opacity-50',
                        on
                          ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className={cn('text-sm font-medium', on ? 'text-primary' : 'text-foreground')}>
                        {id}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {id === 'dark' ? 'Dark UI · dark chrome' : 'Light UI · white chrome'}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ------------------------------------------------ audio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="h-4 w-4" /> Audio
              </CardTitle>
              <CardDescription>
                Clicks and keystrokes are synthesised, and so is the voice. A music bed is
                the one file you supply — drop tracks in{' '}
                <code className="font-mono text-[11px]">marketing-music/</code> and they
                appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && status.music.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Music bed</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => setReq((r) => ({ ...r, music: null }))}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                        req.music === null
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground',
                      )}
                    >
                      No music
                    </button>
                    {status.music.map((track) => (
                      <button
                        key={track}
                        type="button"
                        disabled={running}
                        onClick={() => setReq((r) => ({ ...r, music: track }))}
                        className={cn(
                          'max-w-[220px] truncate rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                          req.music === track
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground',
                        )}
                        title={track}
                      >
                        {track}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 rounded-lg border border-dashed border-border p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No music yet. Create <code className="font-mono">marketing-music/</code> in the
                    project root and drop <code className="font-mono">.mp3</code> files in it —
                    ideally named after a flow (<code className="font-mono">pos.mp3</code>) so each
                    demo gets its own bed. Use a track you have the rights to; these go out as
                    marketing.
                  </p>
                </div>
              )}

              {req.music && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Music level</Label>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round(req.musicVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[req.musicVolume * 100]}
                    onValueChange={([v]) => setReq((r) => ({ ...r, musicVolume: v / 100 }))}
                    min={5}
                    max={80}
                    step={1}
                    disabled={running}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="rec-click" className="text-sm font-normal">
                  Click sounds
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    A tick on every click, on the exact frame
                  </span>
                </Label>
                <Switch
                  id="rec-click"
                  checked={req.clickSfx}
                  disabled={running}
                  onCheckedChange={(v) => setReq((r) => ({ ...r, clickSfx: v }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="rec-type" className="text-sm font-normal">
                  Typing sounds
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Quieter and shorter than clicks
                  </span>
                </Label>
                <Switch
                  id="rec-type"
                  checked={req.typingSfx}
                  disabled={running}
                  onCheckedChange={(v) => setReq((r) => ({ ...r, typingSfx: v }))}
                />
              </div>

              {/* ---------------------------------------------- narration */}
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="rec-narrate" className="text-sm font-normal">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Mic className="h-3.5 w-3.5 text-primary" /> Speak the captions
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      Every caption becomes a spoken line, landing on the frame it was
                      written for. The music ducks under the voice on its own.
                    </span>
                  </Label>
                  <Switch
                    id="rec-narrate"
                    checked={req.narrate}
                    disabled={running || status?.narration === false}
                    onCheckedChange={(v) => setReq((r) => ({ ...r, narrate: v }))}
                  />
                </div>

                {/* The recorder fails soft without a key — it logs a line and produces
                    an unnarrated take. That is indistinguishable from broken narration
                    from in here, so the studio says it up front instead. */}
                {status && !status.narration && (
                  <div className="flex gap-2.5 rounded-md border border-dashed border-border p-2.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      No <code className="font-mono">GEMINI_API_KEY</code> on this machine, so
                      there is no voice to use. Add it to{' '}
                      <code className="font-mono">.env.recorder</code> or your shell and refresh —
                      everything else records exactly as it does now.
                    </p>
                  </div>
                )}

                {req.narrate && status?.narration && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Voice</Label>
                      <div className="flex flex-wrap gap-2">
                        {VOICE_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            disabled={running}
                            onClick={() => setReq((r) => ({ ...r, voice: id as VoiceId }))}
                            title={VOICES[id].note}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-left transition-colors disabled:opacity-50',
                              req.voice === id
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground',
                            )}
                          >
                            <span className="block text-xs font-medium">{id}</span>
                            <span className="block text-[10px] leading-tight opacity-80">
                              {VOICES[id].note}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="rec-style" className="text-xs text-muted-foreground">
                        How to read it <span className="opacity-70">(optional)</span>
                      </Label>
                      <Input
                        id="rec-style"
                        value={req.voiceStyle ?? ''}
                        disabled={running}
                        maxLength={VOICE_STYLE_MAX}
                        placeholder="Calm and warm, like a colleague explaining something useful"
                        onChange={(e) =>
                          setReq((r) => ({ ...r, voiceStyle: e.target.value || null }))
                        }
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Leave this empty and the recorder uses its own direction, which is
                        tuned for restraint — TTS on marketing copy drifts into an
                        infomercial voice unless you ask it not to.
                      </p>
                    </div>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      One synthesis request per caption, so this is the one option that costs
                      money. Lines are cached per take — re-scoring the same footage does not
                      pay twice.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------ log */}
          {(running || lastJob) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Terminal className="h-4 w-4" />
                    {running ? 'Recording…' : lastJob?.state === 'done' ? 'Last run' : 'Last run failed'}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLog((s) => !s)}>
                    {showLog ? 'Hide' : 'Show'} log
                  </Button>
                </div>
              </CardHeader>
              {showLog && (
                <CardContent>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                    {lastJob?.log.length ? lastJob.log.join('\n') : 'Starting…'}
                  </pre>
                  {lastJob?.error && (
                    <p className="mt-2 text-xs text-destructive">{lastJob.error}</p>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* ------------------------------------------------ run panel */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Record</CardTitle>
              <CardDescription>
                {count} video{count === 1 ? '' : 's'} · about {durationLabel(eta)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border px-2.5 py-2">
                  <span className="block text-muted-foreground">Videos</span>
                  <span className="font-mono text-sm text-foreground">{count}</span>
                </div>
                <div className="rounded-lg border border-border px-2.5 py-2">
                  <span className="block text-muted-foreground">Est. time</span>
                  <span className="font-mono text-sm text-foreground">{durationLabel(eta)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Frame rate</Label>
                  <span className="font-mono text-xs text-muted-foreground">{req.fps}</span>
                </div>
                <Slider
                  value={[req.fps]}
                  onValueChange={([v]) => setReq((r) => ({ ...r, fps: v }))}
                  min={FPS_RANGE.min}
                  max={FPS_RANGE.max}
                  step={1}
                  disabled={running}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Capture quality</Label>
                  <span className="font-mono text-xs text-muted-foreground">{req.quality}</span>
                </div>
                <Slider
                  value={[req.quality]}
                  onValueChange={([v]) => setReq((r) => ({ ...r, quality: v }))}
                  min={QUALITY_RANGE.min}
                  max={QUALITY_RANGE.max}
                  step={1}
                  disabled={running}
                />
              </div>

              <div className="flex gap-2">
                {(['mp4', 'webm'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={running}
                    onClick={() => setReq((r) => ({ ...r, format: f }))}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-medium uppercase transition-colors disabled:opacity-50',
                      req.format === f
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor="rec-url" className="text-xs text-muted-foreground">
                  App to record
                </Label>
                <Input
                  id="rec-url"
                  value={req.url ?? ''}
                  disabled={running}
                  spellCheck={false}
                  placeholder={DEFAULT_RECORD_URL}
                  className="h-8 font-mono text-xs"
                  // Empty means "the default", not "an empty URL" — so the field
                  // can be cleared back to localhost without retyping it.
                  onChange={(e) => setReq((r) => ({ ...r, url: e.target.value.trim() || null }))}
                />
                {badUrl ? (
                  <p className="text-[11px] leading-relaxed text-destructive">
                    Needs to start with http:// or https://, with no username or password in it.
                  </p>
                ) : remote ? (
                  <p className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
                    Recording a hosted site: no dev-mode indicator in shot and no route to
                    compile, so the footage is cleaner — but the bot signs the recorder account
                    into that site for real. Keep &ldquo;let it save&rdquo; off unless you mean it.
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Leave it for the local dev server. A hosted URL records the product as
                    customers see it — nothing to compile, and no dev indicator to hide.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="rec-headed" className="text-xs font-normal">
                    Show the browser
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Watch it work, for debugging
                    </span>
                  </Label>
                  <Switch
                    id="rec-headed"
                    checked={req.headed}
                    disabled={running}
                    onCheckedChange={(v) => setReq((r) => ({ ...r, headed: v }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="rec-commit" className="text-xs font-normal">
                    Let it save for real
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Rings up the sale, writes the stock count
                    </span>
                  </Label>
                  <Switch
                    id="rec-commit"
                    checked={req.commit}
                    disabled={running}
                    onCheckedChange={(v) => setReq((r) => ({ ...r, commit: v }))}
                  />
                </div>
                {req.commit && (
                  <p className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
                    This run will write to the recorder account&apos;s real data. Off by default for
                    that reason — the captions change to match, so read-only footage never claims a
                    sale went through.
                  </p>
                )}
              </div>

              {running ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">
                      {lastJob?.log.at(-1)?.trim() || 'Launching the browser…'}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full gap-2 text-destructive" onClick={stop}>
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!!blocked || noCreds || noFfmpeg || badUrl || starting}
                  onClick={start}
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Record {count} video{count === 1 ? '' : 's'}
                </Button>
              )}

              {wasJustDone && !running && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {lastJob!.takes.length} video{lastJob!.takes.length === 1 ? '' : 's'} ready below
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted bg-muted/30">
            <CardContent className="flex gap-2.5 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  This drives the <strong className="text-foreground">real app</strong> in a real
                  Chrome — the pixels are the product&apos;s own. Change the POS page tomorrow and
                  the video changes with it.
                </p>
                <p>
                  Needs the app running locally at{' '}
                  <code className="font-mono text-[10px]">localhost:9007</code>. Each take is a real
                  login and real page loads, so it costs real Firestore reads.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------ library */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4" /> Recordings
              </CardTitle>
              <CardDescription>
                Everything in <code className="font-mono text-[11px]">marketing-out/</code>
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => void refresh()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!status?.takes.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {status.takes.map((take) => (
                <div
                  key={take.name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{take.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {bytesLabel(take.bytes)} · {new Date(take.modified).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      disabled={busyTake === take.name}
                      onClick={() => void openPreview(take)}
                    >
                      {busyTake === take.name
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Play className="h-3.5 w-3.5" />}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={busyTake === take.name}
                      onClick={() => void saveTake(take)}
                    >
                      <Download className="h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="mt-4 space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-mono text-xs text-muted-foreground">{preview.name}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
                    previewRef.current = null;
                    setPreview(null);
                  }}
                >
                  <Trash2 className="h-3 w-3" /> Close
                </Button>
              </div>
              {/* The player lives inside the trimmer: watching a take and deciding
                  where to cut it are the same act, so they are the same control. */}
              <RecorderTrim
                name={preview.name}
                url={preview.url}
                onCut={(result) => {
                  // Show the cut, not the take it came from — the next thing anyone
                  // does is check whether the cut is right before saving it.
                  void refresh();
                  void openPreview(result.take);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
