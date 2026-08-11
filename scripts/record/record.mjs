#!/usr/bin/env node
/**
 * Zeneva marketing recorder.
 *
 * Logs into the real running app with a real account, drives a coded flow with
 * real mouse and keyboard events, draws a presentation cursor over the top, and
 * writes an H.264 MP4.
 *
 *   npm run record -- --flow pos
 *   npm run record -- --flow zen --theme dark
 *   npm run record -- --flow inventory --device mobile
 *   npm run record -- --flow all --device both
 *
 * Nothing in `src/` is touched, no dependency is added, and no `data-testid`
 * exists anywhere — every target is resolved from text a person can read on
 * screen. Deleting `scripts/record/` removes the feature completely.
 *
 * Credentials come from `.env.recorder` (already covered by the `.env*` line in
 * .gitignore) or the environment, never from the command line, and are never
 * printed. Login happens *before* the capture starts, so no credential is ever
 * on camera.
 *
 * Point this at a demo business, not your live one: whatever data the account
 * holds is what ends up in the footage, and every take costs real Firestore
 * reads.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Cdp } from './cdp.mjs';
import { launch } from './browser.mjs';
import { Page, sleep } from './page.mjs';
import { Recorder, hasFfmpeg, probe } from './capture.mjs';
import { mixAudio, resolveMusic, synthBed } from './audio.mjs';
import { synthNarration, DEFAULT_VOICE, VOICES } from './narrate.mjs';
import { FLOWS, FLOW_ROUTES, FLOW_CARDS } from './flows.mjs';
import { parseRecipe, recipeToFlow, recipeRoutes, parseCardOverrides } from './recipe.mjs';
import { readControl, resetLive, writeJson } from './control.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

// ------------------------------------------------------------------ config

/**
 * Capture geometry, and why these numbers.
 *
 * `width`/`height` are CSS pixels — the viewport the *app lays out in* — and
 * `dpr` is the scale Chrome renders that at. Multiply them to get the captured
 * surface, which is why both matter and neither can be picked alone.
 *
 * Desktop used to be 1280x720 at dpr 1.5. It reached 1920x1080, but 1280x720 CSS
 * px is a viewport no one actually has: every element is drawn 1.5x, which reads
 * on screen as a browser stuck at 150% zoom, and 720 CSS px of height is roughly
 * 230px shorter than a real 1080p window — so the bottom of every Zeneva page sat
 * below the fold and never made it into the footage. 1600x900 at dpr 1.2 lands on
 * the same 1920x1080 surface from a viewport people genuinely use: the app hits
 * its wide breakpoints, the full page height fits, and 1.2 is gentle enough that
 * nothing looks magnified.
 *
 * A note for `--headed`: the surface is bounded by the *window*, and a 1920x1080
 * window does not fit on a 1920x1080 screen once the title bar is counted, so
 * watching a take costs resolution. Headless has no screen to fit inside and is
 * the default for exactly that reason — use the studio's live view to watch.
 */
const DEVICES = {
  desktop: {
    id: 'desktop',
    width: 1600, height: 900, dpr: 1.2,
    outW: 1920, outH: 1080,
    mobile: false,
  },
  mobile: {
    id: 'mobile',
    // 390x844 is the iPhone 14/15 viewport and within a few px of a Pixel 8 —
    // the shape the app's own mobile breakpoints were designed against. The old
    // 360x640 was a 16:9 body from 2015: short enough that the bottom of every
    // page fell outside the frame, which is exactly what the footage showed.
    width: 390, height: 844, dpr: 3,
    outW: 1080, outH: 1920,
    mobile: true,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
};

function parseArgs(argv) {
  const out = {
    flow: 'pos', flowSet: false, device: 'desktop', theme: 'light',
    url: process.env.ZENEVA_RECORD_URL || 'http://localhost:9007',
    outDir: path.join(ROOT, 'marketing-out'),
    /*
     * 85, not 92.
     *
     * Chrome will not paint frame N+1 until frame N is acked, so JPEG encode
     * time inside the browser *is* the capture rate. Measured on a text-heavy
     * page at 1920x1080: q92 painted 19-31 fps depending on the run, q85 33.3,
     * q78 35.1, q70 37.4. Anything under the 30 the sampler asks for means some
     * emitted frames are repeats, which is judder. And the difference is free:
     * these frames are re-encoded to h264 at crf 18 regardless, so quality above
     * "visually lossless as an intermediate" is bytes the encoder throws away.
     */
    fps: 30, quality: 85, headed: false, keepFrames: false, browser: null,
    port: 9333, format: 'mp4', commit: false, recipe: null, cards: null,
    music: process.env.ZENEVA_RECORD_MUSIC || null,
    /*
     * A synthesised bed plays when no `--music` file is given, and it is on by
     * default because the alternative shipped worse: with no track, a scored take
     * was forty disembodied clicks over pure silence, which reads as a broken
     * export rather than as restraint. `--no-bed` for a genuinely silent one.
     */
    bed: true,
    musicVolume: 0.28, musicVolumeSet: false, clickSfx: true, typingSfx: true,
    // Narration is opt-in because it costs API calls against a real key. The
    // take is identical without it, so nothing silently starts spending.
    narrate: false, voice: DEFAULT_VOICE, voiceStyle: null,
    timings: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--flow': out.flow = next(); out.flowSet = true; break;
      case '--recipe': out.recipe = next(); break;
      case '--cards': out.cards = next(); break;
      case '--device': out.device = next(); break;
      case '--theme': out.theme = next(); break;
      case '--url': out.url = next(); break;
      case '--out': out.outDir = path.resolve(next()); break;
      case '--fps': out.fps = Number(next()); break;
      case '--quality': out.quality = Number(next()); break;
      case '--browser': out.browser = next(); break;
      case '--port': out.port = Number(next()); break;
      case '--format': out.format = next(); break;
      case '--music': out.music = next(); break;
      case '--music-volume': out.musicVolume = Number(next()); out.musicVolumeSet = true; break;
      case '--narrate': out.narrate = true; break;
      case '--voice': out.voice = next(); out.narrate = true; break;
      case '--voice-style': out.voiceStyle = next(); out.narrate = true; break;
      // Keeps its documented meaning — "skip the bed, keep the ticks" — which now
      // has to turn off the synthesised one too, or the flag would stop working.
      case '--no-music': out.music = null; out.bed = false; break;
      case '--no-bed': out.bed = false; break;
      case '--no-click-sfx': out.clickSfx = false; break;
      case '--no-typing-sfx': out.typingSfx = false; break;
      case '--silent': out.music = null; out.bed = false; out.clickSfx = false; out.typingSfx = false; break;
      case '--headed': out.headed = true; break;
      case '--commit': out.commit = true; break;
      case '--keep-frames': out.keepFrames = true; break;
      case '--timings': out.timings = true; break;
      case '-h': case '--help': out.help = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    }
  }
  return out;
}

const HELP = `
Zeneva marketing recorder

  npm run record -- [options]

  --flow      pos | inventory | zen | all        (default: pos)
  --device    desktop | mobile | both            (default: desktop)
  --theme     light | dark | both                (default: light)

  Those three also take a comma-separated list, so you can ask for exactly the
  takes you want:  --flow pos,zen --theme light,dark  is four videos.

  --recipe    a JSON file describing any page to record, so a new video does not
              need a new script. The recipe's own "id" becomes a flow name, and
              --flow defaults to it:

                { "id": "dashboard", "title": "Dashboard",
                  "route": "/dashboard",
                  "steps": [ { "caption": "Today, live." },
                             { "scroll": 500 }, { "hold": 1500 } ] }

              Steps: goto, caption, card, click, clickTo, fill, press, scroll,
              hold, hover. Validated up front, so a typo fails before Chrome
              launches rather than halfway through a take.

  --cards     a JSON file rewriting the opening and closing screen of any flow,
              so new ad copy is not a code change:

                { "pos": { "open": { "title": "Black Friday.",
                                     "subtitle": "Queue's gone." },
                           "end":  { "cta": "Get Zeneva free" } } }

              Merged key by key over the authored defaults in flows.mjs, so an
              override may name just the one line it changes. A card set to null
              removes the card entirely.

  --url       app to record                      (default: http://localhost:9007)
  --out       output directory                   (default: ./marketing-out)
  --fps       output frame rate                  (default: 30)
  --quality   capture JPEG quality 1-100         (default: 85)
              Raising this lowers the frame rate the page can paint, because
              Chrome waits for each frame to be acked before painting the next.
  --format    mp4 | webm                         (default: mp4)
  --commit    let the flow actually save (rings up the sale, writes the stock
              count). Off by default: a take is read-only unless you ask.
  --headed    show the browser while recording
  --keep-frames  keep the raw JPEG sequence
  --timings   print wall-clock per stage (launch · login · warm · flow · encode)
  --browser   path to chrome.exe / msedge.exe

Audio:
  --music <path>        music bed — a file, or a folder to pick from. A folder is
                        searched for <flow>.mp3 first (pos.mp3, zen.mp3), so one
                        folder can score every take with no further flags.
  --music-volume 0-1    bed level under the ticks       (default: 0.28)
  --no-bed              drop the ambient bed, keep the ticks
  --no-music            same thing
  --no-click-sfx        skip click ticks
  --no-typing-sfx       skip keystroke ticks
  --silent              no audio at all

Narration (speaks the captions — needs GEMINI_API_KEY):
  --narrate             speak every caption the take shows, each line landing on
                        the frame it was written for. Off by default: it is the
                        one option that spends money, one request per caption.
  --voice <name>        Charon | Kore | Puck | Aoede | Fenrir | Leda
                        (default: Charon — warm and measured.) Implies --narrate.
  --voice-style "..."   how to read it: "slower, and a little drier". Gemini TTS
                        takes direction in the prompt, not as a parameter, so this
                        is prepended to each line. Implies --narrate.

  The captions are already the script, so narration adds no writing — it speaks
  the sentences the flow was going to put on screen anyway. With music, the bed
  ducks under the voice automatically and lifts again in the gaps. Lines are
  cached per take, so re-scoring the same footage does not pay for TTS twice.

  With no key, the take records and scores exactly as it would have; the recorder
  logs one line saying narration was skipped. A missing key costs you a voice
  track, not a video.

  Everything is synthesised — nothing to download, nothing to license. With no
  --music, takes get a quiet ambient pad, because clicks over pure silence sound
  like a broken export rather than like restraint. A music file replaces it; use
  a track you have the rights to, since these videos are going out as marketing.

  Already recorded something? Re-score it without re-shooting:
    node scripts/record/add-audio.mjs marketing-out/zeneva-pos-desktop-light.mp4 \
      --music assets/beds/upbeat.mp3

Credentials (never passed as flags, never printed):
  .env.recorder  ->  ZENEVA_RECORD_EMAIL=...
                     ZENEVA_RECORD_PASSWORD=...
`;

/** Read KEY=VALUE from .env.recorder. Values may be quoted. */
function loadEnvFile() {
  const file = path.join(ROOT, '.env.recorder');
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/** b***@example.com — enough to confirm the right account, not enough to leak it. */
function maskEmail(e) {
  const [user, domain] = String(e).split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}${'*'.repeat(Math.max(2, user.length - 1))}@${domain}`;
}

const log = (...a) => console.log('  ', ...a);

// ------------------------------------------------------------------ login

async function login(page, creds) {
  log(`signing in as ${maskEmail(creds.email)}`);
  await page.goto('/login');

  await page.find({ css: '#email' }, { timeoutMs: 30_000 });
  // Set the fields through real key events so React's onChange fires; the
  // overlay cursor is hidden for this because the capture has not started yet.
  await page.click({ css: '#email' }, { settle: 120, dur: 260 });
  await page.type(creds.email, { delay: 8 });
  await page.click({ css: '#password' }, { settle: 120, dur: 260 });
  await page.type(creds.password, { delay: 8 });
  await page.click({ text: 'Login', tag: 'button', exact: true }, { settle: 400 });

  await page.waitUntil(
    async () => {
      const p = await page.eval('location.pathname');
      if (p && p !== '/login') return true;
      // Surface the app's own failure text rather than just timing out.
      const bad = await page.eval(
        `(document.body.innerText||'').includes('Invalid email or password')`,
      );
      if (bad) throw new Error('the app rejected those credentials');
      return false;
    },
    45_000,
    'login never navigated away from /login',
  );

  await page.waitForSettled();
  log(`signed in — landed on ${await page.eval('location.pathname')}`);
}

// ------------------------------------------------------------------ one take

/**
 * The pause gate, and the live status the studio reads.
 *
 * Polls the control file rather than being pushed to, because the writer is a
 * different process and this needs no port, no permission and no cleanup. 250ms
 * is imperceptible on a button press and costs one `existsSync` plus a small
 * `readFileSync` per tick.
 *
 * `abort` is honoured here too: a stop from the studio kills the child anyway, but
 * a run started from a terminal has no one to kill it, and reaching a checkpoint
 * is the one moment it is safe to stop without leaving a half-finished take.
 */
function makeGate(live, state) {
  const publish = () => writeJson(live.status, { ...state, at: Date.now() });
  return {
    publish,
    setStep(label) {
      state.step = label;
      publish();
    },
    async gate() {
      const first = readControl(live.control);
      if (first.abort) throw new Error('stopped from the studio');
      if (!first.paused) return;

      state.paused = true;
      publish();
      state.onPause?.();
      for (;;) {
        await sleep(250);
        const c = readControl(live.control);
        if (c.abort) throw new Error('stopped from the studio');
        if (!c.paused) break;
      }
      state.paused = false;
      publish();
      state.onResume?.();
    },
  };
}

/**
 * Every flow this run can shoot: the three coded ones, plus a recipe if `--recipe`
 * named a file.
 *
 * A recipe is registered under its own id and is otherwise indistinguishable from
 * a coded flow from here on — same lookup, same warmup, same capture path — which
 * is the point. The runner should not have two ways to record something.
 */
const registry = {
  flows: { ...FLOWS },
  routes: { ...FLOW_ROUTES },
  /**
   * The opening and closing screen of each flow, played by `record()` rather than
   * by the flow itself.
   *
   * Kept out here because the cards are the part most likely to be rewritten and
   * the part least likely to need code: a coded flow's click path encodes real
   * knowledge about the app, but "Sell anywhere. Even offline." is ad copy. With
   * both kinds of recording playing their cards from this one table, the studio
   * can edit the first and last thing a viewer sees without a flow opting in and
   * without a redeploy.
   */
  cards: JSON.parse(JSON.stringify(FLOW_CARDS)),
};

/**
 * Merge per-flow card overrides over the authored defaults.
 *
 * Per key, not per flow: a request that only renames the closing CTA should not
 * have to restate the opening card to keep it. An explicit `null` is how you turn
 * a card off, which is why presence is tested with `in` rather than truthiness —
 * "not mentioned" and "deliberately removed" are different answers.
 */
function applyCards(overrides) {
  for (const [id, cards] of Object.entries(overrides)) {
    const base = registry.cards[id] ?? (registry.cards[id] = { open: null, end: null });
    if ('open' in cards) base.open = cards.open;
    if ('end' in cards) base.end = cards.end;
  }
}

/** Load and validate a card-override file, as written by the studio. */
function loadCards(file) {
  const abs = path.resolve(ROOT, file);
  if (!existsSync(abs)) throw new Error(`cards file not found: ${abs}`);
  let parsed;
  try {
    parsed = parseCardOverrides(JSON.parse(readFileSync(abs, 'utf8')));
  } catch (err) {
    throw new Error(`cards ${path.basename(abs)}: ${err.message}`);
  }
  applyCards(parsed);
  return Object.keys(parsed);
}

/** Load and validate a recipe file, registering it as a runnable flow. */
function loadRecipe(file) {
  const abs = path.resolve(ROOT, file);
  if (!existsSync(abs)) throw new Error(`recipe not found: ${abs}`);
  let parsed;
  try {
    parsed = parseRecipe(JSON.parse(readFileSync(abs, 'utf8')));
  } catch (err) {
    throw new Error(`recipe ${path.basename(abs)}: ${err.message}`);
  }
  registry.flows[parsed.id] = recipeToFlow(parsed);
  registry.routes[parsed.id] = recipeRoutes(parsed);
  registry.cards[parsed.id] = { open: parsed.open, end: parsed.end };
  return parsed;
}

/**
 * Turn the flow's camera intents into the absolute segments the filter wants.
 *
 * Each mark says only where the camera should end up. `capture.encode` builds a
 * piecewise expression, so every segment also needs where it *started* — which
 * is the previous mark's destination, threaded here in the order the marks were
 * actually taken.
 *
 * Marks that change nothing are dropped rather than emitted as zero-length
 * moves: each one costs a nested `if()` in three ffmpeg expressions evaluated
 * per output frame, and a flow that releases a camera which is already wide
 * would otherwise pay for a move nobody can see.
 */
function buildZooms(marks, toVideoTime) {
  const out = [];
  let z = 1;
  let px = 0.5;
  let py = 0.5;
  for (const m of marks) {
    const same = Math.abs(m.to - z) < 1e-3
      && Math.abs(m.px - px) < 1e-3
      && Math.abs(m.py - py) < 1e-3;
    if (same) continue;
    out.push({
      at: toVideoTime(m.at),
      // Floored, because a zero-length segment divides by zero in the easing.
      dur: Math.max(0.15, (m.ms ?? 760) / 1000),
      from: z, to: m.to,
      fromPx: px, px: m.px,
      fromPy: py, py: m.py,
    });
    z = m.to; px = m.px; py = m.py;
  }
  return out;
}

/**
 * Wall-clock spent in each stage of a take, printed with `--timings`.
 *
 * Speed work on this thing has been wrong twice from reasoning about which part
 * "must" be slow — the JPEG quality lever was found by measuring, not by
 * thinking about it. So the stages are timed rather than estimated: launch,
 * login, warm, the flow itself, encode and score. Only the flow's own duration
 * is a creative decision; everything else is overhead and fair game to cut.
 */
/**
 * Routes already compiled by the dev server during this run.
 *
 * Module-level, not per-take: the compile it saves happens in the server
 * process, so a route stays warm for every later take regardless of which
 * browser asked for it. See the call site in `record()`.
 */
const warmed = new Set();

/** A dev server compiles on demand; a built one does not need warming. */
function isLocal(url) {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

function stopwatch() {
  const marks = [];
  let last = performance.now();
  return {
    lap(label) {
      const now = performance.now();
      marks.push([label, (now - last) / 1000]);
      last = now;
    },
    report() {
      const total = marks.reduce((s, [, v]) => s + v, 0);
      return marks
        .map(([l, v]) => `${l} ${v.toFixed(1)}s`)
        .concat(`total ${total.toFixed(1)}s`)
        .join(' · ');
    },
  };
}

async function record(opts, flowId, device, theme, creds, live) {
  const dev = DEVICES[device];
  const stamp = `${flowId}-${dev.id}-${theme}`;
  const clock = stopwatch();
  log('');
  log(`── ${stamp} ─────────────────────────────────`);

  const browser = await launch({
    // The device's own dpr, not 1: the page still lays out at `width` CSS px,
    // but Chrome renders it at that scale, so the screencast surface is
    // 1280x720 * 1.5 = a true 1920x1080. Launching at dpr 1 captures 1280x720
    // and there is no upscale later — the encode never resizes — so the take
    // ships at two thirds of the intended resolution.
    width: dev.width, height: dev.height, dpr: dev.dpr,
    headless: !opts.headed, port: opts.port, browserPath: opts.browser, log,
  });

  let cdp;
  let recorder;
  const state = {
    stamp, flow: flowId, device: dev.id, theme,
    phase: 'launching', step: 'starting the browser', paused: false,
    width: dev.outW, height: dev.outH,
  };
  const ctl = makeGate(live, state);
  ctl.publish();
  try {
    cdp = await Cdp.attach(browser.page.webSocketDebuggerUrl);
    const page = new Page(cdp, {
      device: dev, theme, baseUrl: opts.url, log,
      gate: () => ctl.gate(),
      onStep: (s) => ctl.setStep(s),
    });
    await page.prepare();

    // No gate during login: the credential screen must never be paused on, since
    // pausing there parks a filled-in password on screen for the live view.
    state.phase = 'signing in';
    ctl.publish();
    clock.lap('launch');
    await login(page, creds);
    clock.lap('login');

    // Compile every route this flow touches before the camera rolls. In dev,
    // Next.js builds a route on first request, which is seconds of empty shell —
    // recorded mid-flow it looks like the app hanging. Warming pays the same cost
    // off camera. Harmless in production, where the routes are already built.
    /*
     * …but only once per run, and never against a built server.
     *
     * What warming actually defeats is the *dev server's* on-demand compile, and
     * that cache lives in the server process — not in this browser. So every take
     * after the first was re-proving a compile that was already done, once per
     * device and theme. Measured on a two-take pos batch: warm was 5.9s on take
     * one and 0.0s on take two, which is the whole of the saving.
     * `warmed` is module-level for exactly that reason.
     *
     * A production URL never needs it at all, since the routes are prebuilt.
     *
     * The cost of being wrong here is small and self-correcting: if the dev
     * server restarted mid-batch, the first navigation of the flow eats one
     * compile. That is a slower take, not a broken one.
     */
    const routes = (registry.routes[flowId] ?? []).filter((r) => !warmed.has(r));
    if (routes.length && isLocal(opts.url)) {
      state.phase = 'warming';
      ctl.setStep(`compiling ${routes.length} route(s)`);
      log(`warming ${routes.length} route(s)…`);
      await page.warm(routes);
      for (const r of routes) warmed.add(r);
    }
    clock.lap('warm');

    // Cursor + capture only start once we are past the credential screen.
    await page.zen(`mode(${JSON.stringify(dev.mobile ? 'touch' : 'desktop')})`);
    await page.zen('show(true)');
    await page.zen(`place(${Math.round(dev.width * 0.62)},${Math.round(dev.height * 0.78)})`);
    // No in-page device frame: the phone chassis is composited at encode time so
    // it *contains* the screen instead of covering its edges. See capture.encode.

    recorder = new Recorder(cdp, {
      dir: path.join(opts.outDir, '.frames', stamp),
      fps: opts.fps,
      quality: opts.quality,
      maxWidth: dev.outW,
      maxHeight: dev.outH,
      preview: live.frame,
    });
    // The capture and the flow have to pause together, or the paused span is
    // recorded as a freeze — see Recorder.pause.
    state.onPause = () => recorder?.pause();
    state.onResume = () => recorder?.resume();
    /*
     * What the flow says must not be filmed — a hard navigation, with its white
     * flash and its boot loader and, in dev, the compile of an unwarmed route.
     *
     * Held rather than paused: they have the same effect on the file and
     * different owners, so sharing one flag would let a route load resume a take
     * the operator had paused. `finally` rather than a plain release, and
     * `held` rather than an unconditional unblind, so a flow that throws
     * mid-navigation cannot leave the camera off for the rest of the take.
     */
    page.offCamera = async (label, fn) => {
      const held = recorder?.blind(label) === true;
      try {
        return await fn();
      } finally {
        if (held) recorder.unblind();
      }
    };
    await recorder.start();
    state.phase = 'recording';
    ctl.setStep('rolling');
    clock.lap('capture start');
    log('capturing…');

    const flow = registry.flows[flowId];
    const cards = registry.cards[flowId] ?? {};

    // The opening card is captured, so it plays here rather than in the flow —
    // one path for coded flows and recipes alike. See registry.cards.
    if (cards.open) {
      ctl.setStep('opening card');
      await page.card(cards.open.title, cards.open.subtitle, cards.open.cta, cards.open.ms);
      await page.clearCard();
    }

    await flow(page, { commit: opts.commit });

    await page.zen('show(false)');
    // A camera left punched in would crop the closing card, which is full-bleed.
    // Unlike the release on navigation — which overlaps a route load and so is
    // free — this one has nothing to hide behind, so it is waited out.
    const released = await page.releaseCamera();
    if (released) await sleep(released.ms + 120);
    if (cards.end) {
      ctl.setStep('closing card');
      await page.card(cards.end.title, cards.end.subtitle, cards.end.cta, cards.end.ms);
    }
    await sleep(500);

    const stats = await recorder.stop();
    state.phase = 'encoding';
    ctl.setStep('encoding video');
    clock.lap('flow');
    // Painted vs written is the number worth watching: they used to differ by
    // 4x, which is what the stutter was. Any large gap here means the page
    // genuinely is not painting, not that the recorder is dropping frames.
    log(`captured ${stats.count} frames over ${recorder.seconds.toFixed(1)}s `
      + `(${recorder.paintedFps.toFixed(0)} fps painted → ${opts.fps} written)`
      + (stats.dropped ? ` — ${stats.dropped} dropped` : ''));
    // Worth a line: this is the difference between the take's wall clock and its
    // running time, and if it ever reads as most of the take then something is
    // navigating that should be clicking.
    if (recorder.blinds.length) {
      log(`hidden: ${recorder.blinds.length} page load(s), `
        + `${recorder.blindSeconds.toFixed(1)}s kept out of the film`);
    }

    const outFile = path.join(opts.outDir, `zeneva-${stamp}.${opts.format}`);
    log('encoding…');
    const silentFile = path.join(opts.outDir, `.silent-${stamp}.${opts.format}`);

    // Ticks and camera moves are placed on the *encoded* timeline, not
    // wall-clock. The two are very close now that frames are emitted at a
    // constant rate, but they still separate across a pause and across a stall,
    // so the conversion stays.
    const toVideoTime = (t) => recorder.videoTimeFor(t);

    /*
     * Marks from before the first frame are dropped, not placed.
     *
     * `page.marks` starts filling the moment the page exists, which is a login
     * form: an email, a password and three clicks, all before capture starts.
     * `videoTimeFor` clamps anything that early to 0, so those 25 marks used to
     * arrive as one splat of ticks on frame zero of every take. The flow's own
     * marks are all inside the window, so this drops exactly the ones that were
     * never filmed.
     */
    const filmed = (t) => recorder.captured(t);
    const clicks = page.marks.clicks.filter(filmed);
    const keys = page.marks.keys.filter(filmed);
    const spoken = page.marks.narration.filter((n) => filmed(n.at));
    const unfilmed = (page.marks.clicks.length - clicks.length)
      + (page.marks.keys.length - keys.length);
    if (unfilmed) log(`marks: ${unfilmed} from before the first frame (login) dropped`);

    /*
     * Camera moves, resolved into what the filter needs.
     *
     * The flow records only where it wants the camera to *go*; each move's
     * starting point is wherever the previous one left it, which is a chain the
     * flow has no way to know — a punch that never resolved its anchor leaves no
     * mark, so "the one before this" is not "the previous line of the script".
     * Resolving it here, once, in the order the marks were actually taken, is
     * the only place that is true.
     */
    const zooms = buildZooms(page.marks.zooms, toVideoTime);
    if (zooms.length) log(`camera: ${zooms.length} move(s)`);

    await recorder.encode(silentFile, {
      // Mobile only. A chassis around a 1920x1080 desktop take would be a TV
      // bezel, which is a different idea and not one anybody asked for.
      phone: dev.mobile ? {
        theme,
        // The simulated phone's own shape, so the screen cut-out matches the
        // footage exactly and nothing is stretched.
        aspect: dev.width / dev.height,
        dir: path.join(opts.outDir, '.frames'),
      } : null,
      zooms,
    });
    clock.lap('encode');

    /*
     * A supplied track wins; otherwise the synth stands in.
     *
     * Cached beside the phone chassis in `.frames`, which survives
     * `recorder.cleanup()` — that only removes the take's own stamped subfolder —
     * so a batch of six takes synthesises it once and the other five read it.
     */
    const synth = !opts.music && opts.bed;
    const bedFile = opts.music
      ? resolveMusic(opts.music, flowId)
      : (synth ? await synthBed(path.join(opts.outDir, '.frames')) : null);

    /**
     * The voice-over, synthesised from the captions this take actually showed.
     *
     * After the bed is resolved and before the mix, because it is the slow step:
     * one network round trip per line. It is also the step allowed to fail — a
     * missing key or a dead API returns null and the take is scored exactly as it
     * was before narration existed.
     */
    const narrationFile = opts.narrate
      ? await synthNarration({
          lines: spoken.map((n) => ({ text: n.text, at: toVideoTime(n.at) })),
          dir: opts.outDir,
          stamp,
          voice: opts.voice,
          style: opts.voiceStyle,
          duration: recorder.videoSeconds,
          log,
        })
      : null;

    const scored = await mixAudio({
      videoPath: silentFile,
      outPath: outFile,
      duration: recorder.videoSeconds,
      music: bedFile,
      // The synth bed sits lower than a track at the same peak would. It is
      // unbroken — no gaps, no transients, nothing that stops — so it reads
      // louder than music of equal level, and its job is to not be silence
      // rather than to be noticed. An explicit --music-volume overrides this.
      musicVolume: synth && !opts.musicVolumeSet ? 0.22 : opts.musicVolume,
      clicks: opts.clickSfx ? clicks.map(toVideoTime) : [],
      keys: opts.typingSfx ? keys.map(toVideoTime) : [],
      narration: narrationFile,
    });

    if (scored.scored) {
      rmSync(silentFile, { force: true });
      log(`scored — ${scored.clicks} click${scored.clicks === 1 ? '' : 's'}, `
        + `${scored.keys} keystroke${scored.keys === 1 ? '' : 's'}`
        + (scored.narrated ? ', narrated' : '')
        + (synth ? ', ambient bed' : scored.music ? `, bed: ${scored.music}` : ', no music bed'));
    } else {
      // Silent take: the encode already wrote the finished video, just name it.
      renameSync(silentFile, outFile);
    }
    clock.lap('score');

    const info = await probe(outFile).catch(() => null);

    // Sidecar so add-audio.mjs can re-score this file later with the ticks
    // landing on exactly the same frames — the timings are unrecoverable once
    // the frame sequence is gone.
    writeFileSync(
      `${outFile}.marks.json`,
      JSON.stringify({
        flow: flowId, device: dev.id, theme,
        duration: recorder.videoSeconds,
        clicks: clicks.map(toVideoTime),
        keys: keys.map(toVideoTime),
        // The spoken script, with the instant each line landed. This is what
        // lets a re-score re-narrate without re-shooting — the caption timings
        // die with the frame sequence otherwise.
        narration: spoken.map((n) => ({ text: n.text, at: toVideoTime(n.at) })),
        // Not read back by add-audio — recorded so a re-score can see where the
        // camera was, since a beat that lands mid-punch reads differently from
        // one on a static frame.
        zooms,
      }, null, 2),
      'utf8',
    );

    if (!opts.keepFrames) recorder.cleanup();

    log(`✓ ${path.relative(ROOT, outFile)}`);
    if (info) {
      log(`  ${info.width}×${info.height} · ${info.seconds.toFixed(1)}s · `
        + `${info.frames} frames @ ${info.fps} · ${(info.bytes / 1e6).toFixed(1)} MB`);
    }
    if (opts.timings) log(`  ${clock.report()}`);
    state.phase = 'done';
    ctl.setStep('finished');
    return { ok: true, file: outFile, info };
  } catch (err) {
    if (recorder) {
      try { await recorder.stop(); } catch { /* already stopped */ }
    }
    state.phase = 'failed';
    state.paused = false;
    ctl.setStep(err.message);
    log(`✗ ${stamp}: ${err.message}`);
    return { ok: false, error: err.message, stamp };
  } finally {
    try { cdp?.close(); } catch { /* socket already gone */ }
    browser.cleanup();
    await sleep(600);
  }
}

// ------------------------------------------------------------------ main

/**
 * Expand a `--flow`/`--device`/`--theme` value into the list of takes it means.
 *
 * Accepts `all` / `both`, a comma-separated list, or a single id. The list form
 * is what the admin studio sends, since a run there is usually several specific
 * flows rather than one or everything.
 */
function expand(value, all, { alias = [] } = {}) {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'all' || alias.includes(raw)) return [...all];
  const picked = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!picked.length) throw new Error(`empty selection — try: ${all.join(', ')}`);
  for (const p of picked) {
    if (!all.includes(p)) throw new Error(`unknown "${p}" — try: ${all.join(', ')}, all`);
  }
  return [...new Set(picked)];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return 0;
  }

  const fileEnv = loadEnvFile();
  const creds = {
    email: process.env.ZENEVA_RECORD_EMAIL || fileEnv.ZENEVA_RECORD_EMAIL,
    password: process.env.ZENEVA_RECORD_PASSWORD || fileEnv.ZENEVA_RECORD_PASSWORD,
  };
  if (!creds.email || !creds.password) {
    console.error(
      '\n  Missing credentials.\n\n' +
      '  Create .env.recorder in the project root (it is gitignored):\n\n' +
      '    ZENEVA_RECORD_EMAIL=demo@yourbusiness.com\n' +
      '    ZENEVA_RECORD_PASSWORD=...\n\n' +
      '  Use a demo business, not your live account — whatever data it holds\n' +
      '  is what ends up in the video.\n',
    );
    return 1;
  }

  if (!(await hasFfmpeg())) {
    console.error('\n  ffmpeg is not on PATH. Install it (winget install ffmpeg) and retry.\n');
    return 1;
  }

  // Before anything expensive: a recipe is validated completely at load, so a
  // typo in step 9 is a one-line error here rather than a Chrome launch, a real
  // login and half a recording spent finding out.
  if (opts.recipe) {
    const parsed = loadRecipe(opts.recipe);
    // `--recipe` on its own means "record this" — asking for `--flow <id>` as
    // well would be a second place to spell the same name, and getting it wrong
    // would silently shoot the POS flow instead. An explicit `--flow` still
    // wins, so `--recipe x.json --flow pos,dashboard` records both.
    if (!opts.flowSet) opts.flow = parsed.id;
    log(`recipe: ${parsed.title} → ${parsed.route} (${parsed.steps.length} step(s), id "${parsed.id}")`);
  }

  // After the recipe, so a `--cards` entry can also override a recipe's own
  // opening and closing screen rather than being silently replaced by it.
  if (opts.cards) {
    // Logged as the resolved copy rather than as a list of ids: the operator is
    // rewriting ad copy and the thing they want confirmed is the wording that
    // will actually play, which is the merge's output and not its input.
    for (const id of loadCards(opts.cards)) {
      const c = registry.cards[id] ?? {};
      const show = (slot) => (c[slot] ? `“${c[slot].title}”` : 'none');
      log(`cards: ${id} — open ${show('open')}, end ${show('end')}`);
    }
  }

  const flows = expand(opts.flow, Object.keys(registry.flows));
  const devices = expand(opts.device, Object.keys(DEVICES), { alias: ['both'] });
  const themes = expand(opts.theme, ['light', 'dark'], { alias: ['both'] });

  // Checked here rather than at the synthesis call, for the same reason a recipe
  // is validated before Chrome launches: a mistyped voice would otherwise record
  // the whole take and then fail once per caption, and the operator would read
  // six identical API errors instead of "there is no voice called that".
  if (opts.narrate && !VOICES.some((v) => v.id === opts.voice)) {
    throw new Error(`unknown voice "${opts.voice}" — try: ${VOICES.map((v) => v.id).join(', ')}`);
  }

  mkdirSync(opts.outDir, { recursive: true });
  // Clear last run's pause flag and stale frame before anything can read them.
  const live = resetLive(opts.outDir);

  console.log(`\nZeneva recorder → ${opts.url}`);
  log(`${flows.length * devices.length * themes.length} take(s) → ${path.relative(ROOT, opts.outDir)}`);

  const results = [];
  for (const f of flows) {
    for (const d of devices) {
      for (const t of themes) {
        results.push(await record(opts, f, d, t, creds, live));
      }
    }
  }

  const bad = results.filter((r) => !r.ok);
  console.log('');
  console.log(`  ${results.length - bad.length}/${results.length} take(s) written to ${path.relative(ROOT, opts.outDir)}`);
  for (const b of bad) console.log(`  ✗ ${b.stamp}: ${b.error}`);
  return bad.length ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`\n  ${err.message}\n`);
    process.exit(1);
  });
