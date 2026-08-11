/**
 * Shared contract between the recorder control panel and the route that runs it.
 *
 * Deliberately no `'use client'` and no imports: the UI reads these lists to draw
 * its controls, and `/api/admin/record` reads the *same* lists to validate what
 * arrives. One definition means a flow the UI can offer is exactly a flow the
 * route will accept — a second copy would eventually drift, and the failure mode
 * of that drift is an allow-list with a hole in it.
 *
 * The recorder itself (`scripts/record/`) is a standalone Node CLI and does not
 * import this file. It has its own `FLOWS` map, which is the real source of
 * truth; `FLOWS` here must be kept in step with it. Nothing in `src/` is on the
 * recorder's code path, which is what keeps the CLI deletable.
 */

export const FLOW_IDS = ['pos', 'inventory', 'zen'] as const;
export const DEVICE_IDS = ['desktop', 'mobile'] as const;
export const THEME_IDS = ['light', 'dark'] as const;
export const FORMAT_IDS = ['mp4', 'webm'] as const;

export type FlowId = (typeof FLOW_IDS)[number];
export type DeviceId = (typeof DEVICE_IDS)[number];
export type ThemeId = (typeof THEME_IDS)[number];
export type FormatId = (typeof FORMAT_IDS)[number];

// ------------------------------------------------------------------ recipes

/**
 * A recording described as data, for any page that does not have a coded flow.
 *
 * These mirror `scripts/record/recipe.mjs`, which is the real parser — the same
 * relationship `FLOWS` below has with the CLI's own map. The types here exist so
 * the studio's builder can be type-checked; they are **not** the validation.
 * Everything a recipe contains is checked by `parseRecipe` inside the recorder,
 * on the recorder's side of the process boundary, because that is the only place
 * a check cannot be skipped by talking to the API differently.
 */
export const STEP_KINDS = [
  'caption', 'hold', 'click', 'clickTo', 'hover', 'scroll', 'fill', 'press', 'goto', 'card',
] as const;

export type StepKind = (typeof STEP_KINDS)[number];

/** How an element is named. `text` is what a person reads on screen. */
export type TargetSpec = {
  text?: string;
  css?: string;
  placeholder?: string;
  tag?: string;
  nth?: number;
  exact?: boolean;
};

export type RecipeStep =
  | { kind: 'caption'; text: string; ms?: number }
  | { kind: 'hold'; ms: number }
  | { kind: 'click'; spec: TargetSpec; ms?: number }
  | { kind: 'clickTo'; spec: TargetSpec; path: string; ms?: number }
  | { kind: 'hover'; spec: TargetSpec; ms?: number }
  | { kind: 'scroll'; dy: number }
  | { kind: 'fill'; spec: TargetSpec; text: string; enter?: boolean; clear?: boolean; ms?: number }
  | { kind: 'press'; key: 'Enter' | 'Escape' | 'Tab' | 'Backspace' | 'Delete' }
  | { kind: 'goto'; route: string; ms?: number }
  | { kind: 'card'; title: string; subtitle?: string; cta?: string; ms?: number };

export type TitleCard = {
  title: string;
  subtitle?: string;
  cta?: string;
  ms?: number;
};

export type Recipe = {
  title: string;
  route: string;
  open?: TitleCard | null;
  end?: TitleCard | null;
  steps: RecipeStep[];
};

/**
 * The flow id a recipe records under — derived from its title, never typed.
 *
 * Two properties matter here and neither is cosmetic:
 *
 * 1. **`custom-` prefix.** The recorder registers a recipe in the *same* map as
 *    the coded flows, so a recipe called "POS" would silently replace the real
 *    POS flow for that run and the operator would never know why the footage was
 *    wrong. The prefix puts recipes in their own namespace.
 * 2. **Same normalisation as the CLI.** `parseRecipe` reduces an id with
 *    `replace(/[^a-z0-9-]/gi, '-').toLowerCase()`; the output of this function is
 *    already a fixed point of that, so what the route predicts for `takesExpected`
 *    and the filename is exactly what the recorder registers.
 */
export function recipeId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/, '');
  return `custom-${slug || 'recording'}`;
}

/**
 * Convert the builder's tagged steps into the shape `parseRecipe` reads.
 *
 * The studio models a step as `{ kind: 'click', spec }` because a discriminated
 * union is what makes the editor type-check. The CLI's recipe format predates it
 * and is hand-writable — `{ "click": { "text": "Save" } }` — because a person
 * editing a JSON file should not have to repeat the step name twice.
 *
 * This is the only place those two spellings meet. It is a translation and
 * nothing more: **no validation happens here.** Everything a recipe contains is
 * checked by `parseRecipe` on the recorder's side of the process boundary, which
 * is the only side a request cannot skip by posting different JSON.
 */
export function recipeToWire(r: Recipe): Record<string, unknown> {
  return {
    id: recipeId(r.title),
    title: r.title,
    route: r.route,
    open: r.open ?? null,
    end: r.end ?? null,
    steps: r.steps.map(stepToWire),
  };
}

function stepToWire(s: RecipeStep): Record<string, unknown> {
  switch (s.kind) {
    case 'caption': return { caption: s.text, ms: s.ms };
    case 'hold': return { hold: s.ms };
    case 'click': return { click: s.spec, ms: s.ms };
    case 'clickTo': return { clickTo: { spec: s.spec }, path: s.path, ms: s.ms };
    case 'hover': return { hover: s.spec, ms: s.ms };
    case 'scroll': return { scroll: s.dy };
    case 'fill': return { fill: { spec: s.spec, text: s.text, enter: s.enter, clear: s.clear }, ms: s.ms };
    case 'press': return { press: s.key };
    case 'goto': return { goto: s.route, ms: s.ms };
    case 'card': return { card: { title: s.title, subtitle: s.subtitle, cta: s.cta, ms: s.ms } };
  }
}

/** Human labels for the step palette, so the builder is not a JSON textarea. */
export const STEP_LABELS: Record<StepKind, { label: string; hint: string }> = {
  caption: { label: 'Say something', hint: 'A subtitle across the bottom of the frame.' },
  hold: { label: 'Hold still', hint: 'Let the viewer read the screen.' },
  click: { label: 'Click', hint: 'Click something by its on-screen text.' },
  clickTo: { label: 'Click and go', hint: 'A click that navigates — waits for the new page.' },
  hover: { label: 'Hover', hint: 'Rest the cursor on something to show its hover state.' },
  scroll: { label: 'Scroll', hint: 'Glide down the page. Negative goes back up.' },
  fill: { label: 'Type into', hint: 'Type into a field, character by character.' },
  press: { label: 'Press a key', hint: 'Enter, Escape, Tab, Backspace or Delete.' },
  goto: { label: 'Go to a page', hint: 'Jump straight to another route.' },
  card: { label: 'Title card', hint: 'A full-screen card over the app.' },
};

/** Blank recipe pointed at a route, as the starting point for a new recording. */
export function blankRecipe(route = '/dashboard'): Recipe {
  return {
    title: 'New recording',
    route,
    open: { title: 'Zeneva', subtitle: 'Retail, handled.', ms: 2200 },
    end: { title: 'Zeneva', subtitle: 'Retail, handled.', cta: 'Start free', ms: 2600 },
    steps: [
      { kind: 'caption', text: 'Here is what this page does.', ms: 3400 },
      { kind: 'hold', ms: 1400 },
      { kind: 'scroll', dy: 520 },
      { kind: 'hold', ms: 1600 },
    ],
  };
}

/** What each flow actually does on camera, for the picker. */
export const FLOWS: Record<FlowId, { title: string; blurb: string; seconds: number }> = {
  pos: {
    title: 'Point of sale',
    blurb: 'Builds a cart from the product grid, walks customer and payment, lands on the review screen.',
    seconds: 42,
  },
  inventory: {
    title: 'Inventory',
    blurb: 'Searches the catalogue, opens Inventory Health, drills into low stock and corrects a count.',
    seconds: 38,
  },
  zen: {
    title: 'Zen AI',
    blurb: 'Asks a real question and holds while the tool-call status line and the answer stream in.',
    seconds: 34,
  },
};

export const DEVICES: Record<DeviceId, { label: string; note: string; w: number; h: number }> = {
  desktop: { label: 'Desktop', note: '1920×1080 · landscape', w: 1920, h: 1080 },
  mobile: { label: 'Mobile', note: '1080×1920 · Reels / Shorts / TikTok', w: 1080, h: 1920 },
};

/** Options the panel may send. Everything here is enumerated or clamped. */
export type RecorderRequest = {
  flows: FlowId[];
  devices: DeviceId[];
  themes: ThemeId[];
  format: FormatId;
  fps: number;
  quality: number;
  /** Basename of a track in `marketing-music/`, or null for no bed. */
  music: string | null;
  musicVolume: number;
  clickSfx: boolean;
  typingSfx: boolean;
  /** Let the flow actually save — rings up the sale, writes the stock count. */
  commit: boolean;
  /** Show the browser while it records, for debugging a broken selector. */
  headed: boolean;
  /**
   * A page to record that has no coded flow, or null to record only `flows`.
   *
   * When set, this is written to a scratch file and passed as `--recipe`, and
   * it becomes the only thing recorded unless `flows` also names something —
   * the recipe's `id` joins the flow list rather than replacing the concept.
   */
  recipe: Recipe | null;
  /**
   * Rewritten opening/closing screens, keyed by flow id.
   *
   * Copied from `FLOW_CARDS` in `scripts/record/flows.mjs` when the panel loads,
   * so the editor starts from the authored wording rather than from blank fields
   * — a title card is the first thing a viewer sees and an empty one is worse
   * than a default one. Only flows whose copy actually changed are sent, and the
   * result is written to a scratch file and passed as `--cards`, for the same
   * reason the recipe is: argv is world-readable and a card set is long.
   *
   * `null` for either card means "play no card there", which the CLI
   * distinguishes from the key being absent.
   */
  cards: Record<string, { open?: TitleCard | null; end?: TitleCard | null }>;
};

/**
 * The opening and closing screens each coded flow ships with.
 *
 * A mirror of `FLOW_CARDS` in `scripts/record/flows.mjs`, which is the real
 * source — this copy exists only so the studio can *show* the current wording
 * without shelling out to the recorder to ask. Nothing here is sent unless the
 * operator edits it, so the two drifting costs a stale placeholder in a form
 * field, not a video with the wrong copy: whatever is not overridden is played
 * from the recorder's own table.
 */
export const FLOW_CARD_DEFAULTS: Record<FlowId, { open: TitleCard; end: TitleCard }> = {
  pos: {
    open: { title: 'Sell anywhere.', subtitle: 'Even offline.', ms: 1900 },
    end: { title: 'Sell anywhere. Even offline.', subtitle: 'Zeneva POS', cta: 'Start free', ms: 2600 },
  },
  inventory: {
    open: { title: 'Know what you have.', subtitle: 'Down to the last unit.', ms: 1900 },
    end: { title: 'Counts you can trust, on every device.', subtitle: 'Zeneva Inventory', cta: 'Start free', ms: 2600 },
  },
  zen: {
    open: { title: '41 tools.', subtitle: 'Reads everything. Writes nothing without you.', ms: 2000 },
    end: { title: 'Zen AI', subtitle: 'Reads everything. Writes nothing without you.', cta: 'Try Zen AI', ms: 2600 },
  },
};

export const FPS_RANGE = { min: 24, max: 60, default: 30 } as const;
export const QUALITY_RANGE = { min: 60, max: 100, default: 92 } as const;

export function defaultRequest(): RecorderRequest {
  return {
    flows: ['pos'],
    devices: ['desktop'],
    themes: ['light'],
    format: 'mp4',
    fps: FPS_RANGE.default,
    quality: QUALITY_RANGE.default,
    music: null,
    musicVolume: 0.28,
    clickSfx: true,
    typingSfx: true,
    commit: false,
    headed: false,
    recipe: null,
    cards: {},
  };
}

/** How many videos a request produces, and roughly how long that will take. */
export function takeCount(r: Pick<RecorderRequest, 'flows' | 'devices' | 'themes' | 'recipe'>): number {
  const subjects = r.flows.length + (r.recipe ? 1 : 0);
  return Math.max(1, subjects) * r.devices.length * r.themes.length;
}

/**
 * Rough wall-clock estimate. Each take pays for a cold Chrome launch and a real
 * login on top of the flow itself, plus an encode that scales with the footage.
 * Deliberately pessimistic — a progress hint that runs under is worse than one
 * that runs over.
 */
export function estimateSeconds(r: RecorderRequest): number {
  const coded = r.flows.reduce((sum, f) => sum + FLOWS[f].seconds, 0);
  // A recipe's length is knowable rather than estimated: every step carries its
  // own duration. Summing them beats a per-flow guess, and it means a long
  // recipe is honestly reported as long.
  const custom = r.recipe ? recipeSeconds(r.recipe) : 0;
  const subjects = r.flows.length + (r.recipe ? 1 : 0);
  const perSubject = coded + custom;
  const takes = r.devices.length * r.themes.length;
  const LAUNCH_AND_LOGIN = 22;
  const ENCODE_RATIO = 0.9;
  return Math.round(takes * (perSubject * (1 + ENCODE_RATIO) + LAUNCH_AND_LOGIN * Math.max(1, subjects)));
}

/** Seconds a recipe spends on camera, from its own step timings. */
export function recipeSeconds(r: Recipe): number {
  // Each action costs more than its settle: finding the element, gliding the
  // cursor and blooming the halo are roughly a second before anything settles.
  const ACTION_OVERHEAD = 1.1;
  let ms = (r.open?.ms ?? 0) + (r.end?.ms ?? 0);
  for (const s of r.steps) {
    switch (s.kind) {
      case 'caption': ms += Math.min(s.ms ?? 3600, 1400); break;
      case 'hold': ms += s.ms; break;
      case 'scroll': ms += 900; break;
      case 'press': ms += 300; break;
      case 'card': ms += (s.ms ?? 2200) + 600; break;
      case 'fill': ms += (s.ms ?? 700) + s.text.length * 90 + ACTION_OVERHEAD * 1000; break;
      default: ms += (s.ms ?? 800) + ACTION_OVERHEAD * 1000; break;
    }
  }
  return Math.round(ms / 1000);
}

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

// --------------------------------------------------------------- job status

export type JobState = 'running' | 'done' | 'failed' | 'cancelled';

export type RecorderTake = {
  name: string;
  bytes: number;
  modified: number;
};

export type JobStatus = {
  id: string;
  state: JobState;
  /** Console output, newest last. Trimmed to a bounded tail. */
  log: string[];
  startedAt: number;
  endedAt: number | null;
  takesExpected: number;
  /** Videos this job wrote, resolved when it finishes. */
  takes: RecorderTake[];
  error: string | null;
};

// ------------------------------------------------------------- live view

/**
 * What the running take is doing right now, as the recorder publishes it.
 *
 * Written by the child process to `marketing-out/.live/live.json` and read back
 * by `GET /api/admin/record/live`. Every field is optional-by-absence: the whole
 * object is missing before the first take starts and stale for a moment after
 * one ends, and the studio has to render both of those without flickering.
 */
export type LiveStatus = {
  /** `pos-desktop-light` — which take of the run this is. */
  stamp: string;
  flow: string;
  device: DeviceId;
  theme: ThemeId;
  /** Where in the take we are. `recording` is the only one that produces frames. */
  phase: 'launching' | 'signing in' | 'warming' | 'recording' | 'encoding' | 'done' | 'failed';
  /** A short human line: "click \"Add to cart\"". */
  step: string;
  paused: boolean;
  width: number;
  height: number;
  /** Epoch ms the recorder last wrote this. Stale means the take ended. */
  at: number;
};

/** What `GET /api/admin/record/live` answers. */
export type LiveResponse = {
  /** Null when nothing is running, or when the last take's status has gone stale. */
  live: LiveStatus | null;
  /**
   * Milliseconds since the newest preview frame was written, or null for none.
   *
   * The frame itself is fetched separately as a JPEG — sending it inline as
   * base64 would inflate every poll by a third and make the status request as
   * expensive as the image it describes.
   */
  frameAge: number | null;
  running: boolean;
};

/**
 * How long a live status may go unwritten before the studio stops believing it.
 *
 * The recorder republishes on every checkpoint, so a gap this long means the
 * process is gone — which happens on a crash without any chance to write a
 * final state. Without a staleness rule the studio would show "recording" over
 * a frozen frame indefinitely.
 */
export const LIVE_STALE_MS = 15_000;

/** What `GET /api/admin/record` answers. */
export type RecorderStatus = {
  /** False when the app is not running locally — the recorder needs a real machine. */
  available: boolean;
  reason: string | null;
  /**
   * The account the bot will sign in as.
   *
   * `email` comes back in full because the studio has to be able to show and
   * edit it. The **password never leaves the server** — not here, not anywhere
   * else in this type. `source` says which of the two places it was found in,
   * because an environment variable beats `.env.recorder` inside the CLI, so
   * saving the file has no effect while one is set.
   */
  credentials: {
    configured: boolean;
    email: string | null;
    source: 'env' | 'file' | null;
  };
  ffmpeg: boolean;
  music: string[];
  job: JobStatus | null;
  takes: RecorderTake[];
};
