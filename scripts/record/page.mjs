/**
 * The thin "page object" the flow scripts talk to.
 *
 * Every user action here is a *real* CDP input event, not a synthetic DOM event:
 * `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent` enter Chrome at the
 * same place a physical mouse and keyboard do, so the app runs its ordinary
 * handlers, hover states light up, and React's controlled inputs update. The
 * overlay only draws what the camera should see.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OVERLAY_SRC = readFileSync(path.join(HERE, 'overlay.js'), 'utf8');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

/** A spec as a person would say it, for the studio's "currently doing" line. */
export function describe(spec) {
  if (typeof spec === 'string') return spec;
  if (spec?.text) return `"${spec.text}"`;
  if (spec?.placeholder) return `the "${spec.placeholder}" field`;
  if (spec?.css) return spec.css.length > 42 ? `${spec.css.slice(0, 40)}…` : spec.css;
  return JSON.stringify(spec);
}

/**
 * US-layout virtual key code for a character.
 *
 * This is not cosmetic. `windowsVirtualKeyCode` is what Chrome consults to decide
 * whether a key event is an *editing command*, and it checks that before it looks
 * at `text`. The obvious shortcut — `ch.toUpperCase().charCodeAt(0)` — happens to
 * be right for letters and digits and catastrophically wrong for punctuation,
 * because the ASCII codes of `.`, `'`, `(`, `#`, `$`, `%` and `&` collide with
 * VK_DELETE, VK_RIGHT, VK_UP, VK_HOME, VK_END, VK_CLEAR and VK_LEFT.
 *
 * The symptom is not a missing character but a scrambled field: typing an email
 * lost its dot *and* jumped the caret, so `bimex4@gmail.com` arrived as
 * `bimex4@gmailcom` and everything after a stray Home/End landed in the wrong
 * place. Login then failed with "invalid email or password" on a correct one.
 *
 * Shifted characters share a key with their unshifted twin, so both map to the
 * same code. Anything unmapped returns 0, which Chrome treats as "no command,
 * just insert `text`" — the safe default, verified against a plain input.
 */
const VK_OEM = {
  ';': 186, ':': 186,
  '=': 187, '+': 187,
  ',': 188, '<': 188,
  '-': 189, '_': 189,
  '.': 190, '>': 190,
  '/': 191, '?': 191,
  '`': 192, '~': 192,
  '[': 219, '{': 219,
  '\\': 220, '|': 220,
  ']': 221, '}': 221,
  "'": 222, '"': 222,
};
const VK_SHIFTED_DIGIT = {
  '!': 49, '@': 50, '#': 51, $: 52, '%': 53,
  '^': 54, '&': 55, '*': 56, '(': 57, ')': 48,
};

function virtualKeyCode(ch) {
  if (ch === '\n') return 13;
  if (ch === ' ') return 32;
  if (ch >= 'a' && ch <= 'z') return ch.toUpperCase().charCodeAt(0);
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0);
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0);
  return VK_SHIFTED_DIGIT[ch] ?? VK_OEM[ch] ?? 0;
}

export class Page {
  /** @param {import('./cdp.mjs').Cdp} cdp */
  constructor(cdp, { device, theme, baseUrl, log, gate = null, onStep = null }) {
    this.cdp = cdp;
    this.device = device;
    this.theme = theme;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.log = log;
    /**
     * Called before every action, and awaited. This is where a pause takes
     * effect: the gate simply does not resolve until the operator resumes.
     *
     * Between actions rather than mid-action deliberately — pausing halfway
     * through a click would leave the mouse down and the overlay's halo lit, and
     * resuming from there is not a state the app was ever asked to handle.
     */
    this.gate = gate;
    /** Called with a short human label each time the flow starts something. */
    this.onStep = onStep;
    /**
     * Wall-clock instants (epoch seconds) of every click and keystroke, for the
     * audio pass to hang ticks on. Recorded here rather than inferred from the
     * flow script because only this layer knows when the input event was truly
     * dispatched — a caption or a slow selector lookup shifts everything after
     * it, and a sound effect that drifts off its frame is worse than silence.
     */
    /**
     * `narration` is the same idea applied to spoken lines: every caption, with
     * the instant it appeared. The caption track *is* the script — a separate
     * narration script would be a second copy of the same sentences, and the two
     * would disagree the first time someone edited one of them.
     */
    this.marks = { clicks: [], keys: [], zooms: [], narration: [] };
  }

  async prepare() {
    const { cdp, device, theme } = this;
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.dpr,
      mobile: device.mobile,
      screenOrientation: device.mobile
        ? { angle: 0, type: 'portraitPrimary' }
        : { angle: 0, type: 'landscapePrimary' },
    });
    if (device.mobile) {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await cdp.send('Emulation.setUserAgentOverride', { userAgent: device.ua });
    }
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    });

    // next-themes reads `localStorage.theme` before first paint; seeding it here
    // means the app boots in the requested theme with no flash of the other one.
    // Runs on every document, so it survives the login navigation.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source:
        `try{localStorage.setItem('theme',${JSON.stringify(theme)});` +
        `localStorage.removeItem('zeneva_needs_tour');}catch(e){}\n` +
        OVERLAY_SRC,
    });
  }

  // ------------------------------------------------------------- primitives

  /**
   * Yield to the operator before doing anything.
   *
   * Every action funnels through here, so pause is enforced in one place rather
   * than sprinkled through the flow scripts — which matters because the flows are
   * meant to read like a description of what a person does, and a pause check on
   * every other line would bury that.
   */
  async checkpoint(label) {
    if (label && this.onStep) {
      try { this.onStep(label); } catch { /* status reporting never breaks a take */ }
    }
    if (this.gate) await this.gate();
  }

  async eval(expression, { awaitPromise = false } = {}) {
    const res = await this.cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    });
    if (res.exceptionDetails) {
      const msg = res.exceptionDetails.exception?.description
        ?? res.exceptionDetails.text
        ?? 'unknown page error';
      throw new Error(`page eval failed: ${String(msg).split('\n')[0]}`);
    }
    return res.result?.value;
  }

  zen(call, { awaitPromise = false } = {}) {
    return this.eval(`window.__zen && window.__zen.${call}`, { awaitPromise });
  }

  async goto(pathOrUrl, { waitFor = 'settled' } = {}) {
    await this.checkpoint(`open ${pathOrUrl}`);
    await this.releaseCamera();
    const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const loaded = this.cdp.once('Page.loadEventFired');
    await this.cdp.send('Page.navigate', { url });
    await Promise.race([loaded, sleep(30_000)]);
    if (waitFor === 'settled') await this.waitForSettled();
    return url;
  }

  /** Wait until the app has painted real content rather than its boot loader. */
  async waitForSettled(timeoutMs = 45_000) {
    await this.waitUntil(
      async () => (await this.zen('settled()')) === true,
      timeoutMs,
      'app never finished booting (still showing the loader)',
    );
    await sleep(250);
  }

  async waitUntil(fn, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
      try {
        if (await fn()) return true;
      } catch (err) {
        last = err;
      }
      // A dead socket is not a slow page, and waiting out the remaining 59
      // seconds only buys a misleading error: the run that hit this reported
      // "never navigated to /sales/pos/review" when the actual event was the
      // browser disappearing. Stop at the real cause, the moment it is known.
      if (this.cdp.closed) {
        throw new Error(`the browser went away while waiting for ${label} — ${this.cdp.closeReason}`);
      }
      await sleep(180);
    }
    throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s: ${label}${last ? ` (${last.message})` : ''}`);
  }

  /** Resolve a visible-text/role spec to a viewport rect, waiting for it. */
  async find(spec, { timeoutMs = 20_000, required = true } = {}) {
    const src = `window.__zen.find(${JSON.stringify(spec)})`;
    let rect = null;
    try {
      await this.waitUntil(
        async () => {
          rect = await this.eval(src);
          return !!rect;
        },
        timeoutMs,
        `no visible element matched ${JSON.stringify(spec)}`,
      );
    } catch (err) {
      if (required) throw err;
      return null;
    }
    return rect;
  }

  /**
   * Scroll the target into view if it is off-screen.
   *
   * Deliberately only handles the *off-screen* case. An element that is on
   * screen but hidden behind pinned chrome also needs scrolling, but that is not
   * knowable from the rect alone — `inViewport` counts anything that intersects
   * the viewport — so it is handled by `clearBlocker`, which has the hit-test
   * result and can tell a fixed bar from a toast.
   *
   * Twice, because once is not reliably enough. The app's scroller is
   * `main#app-main-content`, not the window — the document is exactly viewport
   * height on every page — and it carries `smooth-scroll`, so a `scrollIntoView`
   * is an animation whose duration the page decides. One fixed sleep either
   * over-waits on every step of the take or lands mid-glide on the one step that
   * had furthest to travel. Re-checking and giving it a second go costs nothing
   * on the common path, where the first check already returns.
   */
  async ensureInView(spec, rect) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // `shifted` means the hit test had to walk the click point off the
      // target's centre to find a spot that reaches it — true on this page after
      // one pass, where the button sits three pixels clear of the bottom nav and
      // only an inset probe lands on it. That click would work, and it is one
      // late-rendering row away from not working, so treat it like a target that
      // is not in view yet and scroll again. The second pass has the final
      // scroll range to clamp against and centres the button properly.
      if (rect?.inView && !rect.shifted) return rect;
      await this.eval(`window.__zen.scrollTo(${JSON.stringify(spec)})`);
      await sleep(700);
      const next = await this.find(spec, { required: false });
      if (!next) return rect;
      rect = next;
    }
    return rect;
  }

  // ------------------------------------------------------------- camera

  /**
   * Punch the camera in on something.
   *
   * This records an intent, in wall-clock, and returns immediately — the move
   * itself happens at encode time, where `zoompan` re-frames every output frame.
   * Nothing is done to the page, which is the point: a CSS transform on the app
   * would change layout, re-trigger every `IntersectionObserver` on the way in,
   * and mean the footage no longer shows the app as a user would see it.
   *
   * Because the move is applied to the *recorded frames*, punching in is an
   * upscale of what was captured, not a re-render at higher resolution. Past
   * about 1.5x on a 1080p take that starts to read as soft, so the flows stay
   * near 1.3x. Capturing supersampled to make punch-ins native-resolution was
   * measured and rejected: at dpr 1.5 the page painted 10-17fps, well under the
   * 30 the sampler needs.
   *
   * The anchor is normalised against the viewport rather than stored in pixels,
   * so the same mark is correct for a 1920x1080 desktop frame and a 887x1920
   * mobile one — Chrome scales the whole surface uniformly into the screencast,
   * so a fraction of the viewport is the same fraction of every captured frame.
   *
   * @param {object|null} spec  what to frame; null holds the current anchor
   * @param {{to?: number, ms?: number, wait?: boolean}} [opts]
   */
  async punch(spec, { to = 1.3, ms = 760, wait = true } = {}) {
    let px = 0.5;
    let py = 0.5;
    if (spec) {
      // Not `find()` with its 20s wait: a camera move is decoration, and a
      // missing anchor should cost the take a punch-in, never the whole run.
      const rect = await this.find(spec, { required: false, timeoutMs: 1500 });
      if (!rect) {
        this.log?.(`  (no punch — nothing matched ${describe(spec)})`);
        return null;
      }
      px = clamp01(rect.x / this.device.width);
      py = clamp01(rect.y / this.device.height);
    }
    return this.#camera(to, px, py, ms, wait);
  }

  /** Pull back to the full frame. */
  async wide({ ms = 820, wait = true } = {}) {
    return this.#camera(1, 0.5, 0.5, ms, wait);
  }

  /**
   * `wait` defaults on because a flow almost always wants the move to land
   * before the next thing happens — a punch-in that is still travelling when the
   * button is clicked shows the click sliding around the frame. The exceptions
   * are the ones that deliberately overlap something slow (a route change), and
   * they say so.
   */
  async #camera(to, px, py, ms, wait) {
    const mark = { at: Date.now() / 1000, to, px, py, ms };
    this.marks.zooms.push(mark);
    if (wait) await sleep(ms + 90);
    return mark;
  }

  /**
   * Release the camera if it is punched in.
   *
   * Called on every navigation, because the camera frames a *place on a page*
   * and that place stops existing the moment the page changes. A flow that
   * punches in on a product card and then navigates would otherwise open the
   * next screen already zoomed into wherever that card used to be. The recorder
   * calls it once more before the closing card, which is full-bleed and would be
   * cropped by a camera left punched in at the end of a flow.
   */
  async releaseCamera() {
    const last = this.marks.zooms[this.marks.zooms.length - 1];
    if (!last || last.to === 1) return null;
    // Overlaps a route load, so the move is never waited on — the camera rides
    // the navigation out.
    return this.#camera(1, 0.5, 0.5, 420, false);
  }

  // ------------------------------------------------------------- gestures

  async mouseTo(x, y) {
    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x, y, button: 'none', buttons: 0,
    });
  }

  /**
   * Clear whatever is over the target, by the means that can actually clear it.
   *
   * Two obstructions, two remedies, and using the wrong one wastes the whole
   * timeout and then fails anyway:
   *
   * - A **toast** expires. The app's live for 3s (`TOAST_REMOVE_DELAY` in
   *   `src/hooks/use-toast.ts`) and stack bottom-right over the POS cart's
   *   primary button, so waiting is the honest fix — aiming somewhere else and
   *   hoping is not.
   * - **Pinned chrome** — `position: fixed` or `sticky` — never expires. A
   *   sticky header, or the POS cart bar across the bottom of a 390px viewport,
   *   will sit over that button for as long as the page is open. Scrolling the
   *   target to the middle of the viewport is what moves it out from under.
   *
   * Returns the latest rect either way; a target still covered when this gives
   * up is reported by the caller rather than clicked blind.
   */
  async clearBlocker(spec, rect, timeoutMs = 6000) {
    if (!rect?.covered) return rect;

    if (rect.coveredByPinned) {
      // Nothing to wait for. Scroll it clear, once, and re-resolve.
      await this.eval(`window.__zen.scrollClear(${JSON.stringify(spec)})`);
      await sleep(750);
      const next = await this.find(spec, { required: false });
      if (next) rect = next;
      if (!rect.covered) return rect;
      // Still covered after scrolling: either a modal, or pinned chrome deep
      // enough to reach the middle of the viewport. Fall through — a toast may
      // also be involved, and waiting is cheap next to losing the take.
    }

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await sleep(250);
      const next = await this.find(spec, { required: false });
      if (!next) continue;
      rect = next;
      if (!rect.covered) return rect;
    }
    return rect;
  }

  /**
   * Glide the drawn cursor to the target, bloom the halo, then fire a real
   * click at exactly that point. The overlay animation and the input event use
   * the same coordinates, so the cursor can never lie about what was clicked.
   */
  async click(spec, { dur, settle = 650, say } = {}) {
    await this.checkpoint(`click ${describe(spec)}`);
    let rect = await this.find(spec);
    rect = await this.ensureInView(spec, rect);
    rect = await this.clearBlocker(spec, rect);
    // A click that lands on a toast leaves the button enabled and the flow
    // stalling on the *next* step, which is a genuinely confusing way to fail —
    // so say what covered it, here, where the cause is still known.
    //
    // Off-screen is reported separately because it is a different bug with a
    // different fix, and the two were conflated once already: a target 171px
    // below the fold was reported as covered by the mobile nav, because the
    // hit-test clamped its probe into the viewport and the bottom of a phone
    // viewport is the nav. If this fires, scrolling did not move the element —
    // look at which node scrolls on the page, not at what is on top of it.
    if (rect.offscreen) {
      throw new Error(
        `${JSON.stringify(spec)} is outside the viewport (top ${Math.round(rect.top)}`
        + `, height ${Math.round(rect.h)}) and scrolling it into view did not work`
        + ` — the click would land somewhere else`,
      );
    }
    if (rect.covered) {
      throw new Error(
        `${JSON.stringify(spec)} is covered by ${rect.coveredBy}`
        + `${rect.coveredByPinned ? ' (pinned, and still covering after scrolling it to centre)' : ''}`
        + ` — the click would not reach it`,
      );
    }
    const { x, y } = rect;

    if (say) await this.caption(say);
    await this.zen(`moveTo(${x},${y}${dur ? `,${dur}` : ''})`, { awaitPromise: true });
    await this.mouseTo(x, y);
    await this.zen(`halo(${JSON.stringify({ left: rect.left, top: rect.top, w: rect.w, h: rect.h })})`);
    await sleep(230);

    await this.zen('press(true)');
    await this.zen(`ripple(${x},${y})`);
    if (this.device.mobile) await this.tap(x, y);
    else await this.mouseClick(x, y);
    await sleep(110);
    await this.zen('press(false)');
    await this.zen('halo(null)');
    if (settle) await sleep(settle);
    return rect;
  }

  /**
   * Click something whose label the app decides at runtime.
   *
   * Two POS buttons have no fixed text: payment reads "Finalize & Print" or
   * "Review & Complete" depending on the business's autoPrint setting, and review
   * reads "Issue Professional Invoice" or "Complete Sale" depending on the
   * payment method. Hardcoding either one produces a flow that works on the
   * account it was written against and hangs on every other. Specs are tried in
   * order and the first one present wins.
   */
  async clickAny(specs, opts = {}) {
    const deadline = Date.now() + (opts.timeoutMs ?? 20_000);
    let seen = null;
    while (Date.now() < deadline) {
      for (const spec of specs) {
        const rect = await this.find(spec, { required: false, timeoutMs: 900 });
        if (rect) return this.click(spec, opts);
        seen = spec;
      }
      await sleep(400);
    }
    void seen;
    throw new Error(`none of these appeared: ${specs.map((s) => JSON.stringify(s)).join(' / ')}`);
  }

  /** Wait until the address bar actually shows `expected`. */
  async waitForPath(expected, timeoutMs = 60_000) {
    // Pull the camera back *while* the route loads rather than after it, so the
    // punch-in costs the take no extra time. Here rather than in `clickTo`
    // because a flow can also navigate by clicking through `clickAny` and then
    // waiting on the path itself, and that route change needs releasing too.
    await this.releaseCamera();
    await this.waitUntil(
      async () => (await this.eval('location.pathname')) === expected,
      timeoutMs,
      `never navigated to ${expected}`,
    );
    await this.waitForSettled();
  }

  /**
   * Click a control that navigates, then wait for the destination to arrive.
   *
   * `settle` is a fixed sleep, and a fixed sleep is the wrong tool for a route
   * change: in dev, Next.js compiles a route the first time it is requested, so
   * the same click that takes 200ms warm takes many seconds cold. Sleeping
   * through it meant every step ran one page behind — the click for step N+1 was
   * dispatched while step N was still on screen, and the flow died a step later
   * on a button that was never missing, just not there yet.
   */
  async clickTo(spec, expectedPath, opts = {}) {
    const rect = await this.click(spec, { ...opts, settle: 0 });
    // The camera release happens inside waitForPath, which every navigating
    // click goes through.
    await this.waitForPath(expectedPath);
    if (opts.settle !== 0) await sleep(opts.settle ?? 900);
    return rect;
  }

  /**
   * Visit each route once so Next.js compiles it before the camera rolls.
   *
   * Without this the first take of a session records the dev server's cold
   * compile — many seconds of an empty shell, mid-flow. Warming costs the same
   * time but spends it before `Recorder.start()`, so it never reaches the file.
   */
  async warm(routes) {
    for (const route of routes) {
      // `goto` already ends in waitForSettled, so the settle this used to do
      // afterwards re-checked a condition that was true before it slept. What is
      // left is a short grace for the fetches settled() does not cover, so the
      // route is warm in the data cache and not only in Next's compiler — those
      // are what the real take reads back. Run with --timings to see the cost;
      // nothing here is on camera.
      await this.goto(route);
      await sleep(300);
    }
  }

  /**
   * Move the cursor onto something and leave it there.
   *
   * Worth having as its own gesture rather than a click with the press removed:
   * a lot of what makes the app look alive is hover state — row highlights, card
   * lifts, tooltips — and none of it appears in footage that only ever clicks.
   */
  async hover(spec, settle = 700) {
    await this.checkpoint(`hover ${describe(spec)}`);
    let rect = await this.find(spec);
    rect = await this.ensureInView(spec, rect);
    await this.zen(`moveTo(${rect.x},${rect.y})`, { awaitPromise: true });
    await this.mouseTo(rect.x, rect.y);
    if (settle) await sleep(settle);
    return rect;
  }

  async mouseClick(x, y) {
    const base = { x, y, button: 'left', clickCount: 1 };
    this.marks.clicks.push(Date.now() / 1000);
    await this.cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', buttons: 1 });
    await sleep(70);
    await this.cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
  }

  async tap(x, y) {
    const pt = [{ x, y, radiusX: 12, radiusY: 12, force: 1 }];
    this.marks.clicks.push(Date.now() / 1000);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
    await sleep(70);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  /** Type character by character so the footage shows the text appearing. */
  async type(text, { delay = 78 } = {}) {
    for (const ch of text) {
      const key = ch === '\n' ? 'Enter' : ch;
      const common = {
        key,
        text: ch === '\n' ? '\r' : ch,
        unmodifiedText: ch === '\n' ? '\r' : ch,
        windowsVirtualKeyCode: virtualKeyCode(ch),
      };
      this.marks.keys.push(Date.now() / 1000);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...common });
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
      await sleep(delay + (ch === ' ' ? 34 : 0));
    }
  }

  async fill(spec, text, opts = {}) {
    await this.checkpoint(`type into ${describe(spec)}`);
    await this.click(spec, { settle: 180, say: opts.say });
    if (opts.clear) {
      await this.eval(
        `(()=>{const a=document.activeElement;if(a&&'value' in a){a.select&&a.select();}return 1})()`,
      );
      await this.press('Delete');
    }
    await this.type(text, opts);
    if (opts.enter) await this.press('Enter');
    if (opts.settle !== 0) await sleep(opts.settle ?? 500);
  }

  async press(key) {
    const map = {
      Enter: { windowsVirtualKeyCode: 13, text: '\r' },
      Tab: { windowsVirtualKeyCode: 9, text: '\t' },
      Escape: { windowsVirtualKeyCode: 27 },
      Delete: { windowsVirtualKeyCode: 46 },
      Backspace: { windowsVirtualKeyCode: 8 },
    };
    const extra = map[key] ?? {};
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, ...extra });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, ...extra });
    await sleep(140);
  }

  /** Eased wheel scroll — a jump cut to a new scroll position reads as a glitch. */
  async scrollBy(dy, { steps = 26 } = {}) {
    const { width, height } = this.device;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const ease = 1 - Math.pow(1 - t, 3);
      const prev = 1 - Math.pow(1 - i / steps, 3);
      await this.cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: Math.round(width / 2),
        y: Math.round(height / 2),
        deltaX: 0,
        deltaY: Math.round(dy * (ease - prev)),
      });
      await sleep(16);
    }
    await sleep(360);
  }

  // ------------------------------------------------------------- narration

  caption(text, ms) {
    // Stamped before the round-trip rather than after: the caption animates in as
    // the evaluate resolves, so the earlier instant is the one that matches what
    // the viewer sees. A voice line entering a beat early reads as anticipation;
    // a beat late reads as a mistake.
    if (text) this.marks.narration.push({ at: Date.now() / 1000, text: String(text), ms: ms ?? null });
    return this.zen(`caption(${JSON.stringify(text ?? '')}${ms ? `,${ms}` : ''})`);
  }

  async card(title, sub, cta, holdMs = 2100) {
    await this.zen(`card(${JSON.stringify(title)},${JSON.stringify(sub ?? '')},${JSON.stringify(cta ?? '')})`);
    await sleep(holdMs);
  }

  async clearCard() {
    await this.zen('clearCard()');
    await sleep(620);
  }

  async hold(ms) {
    await sleep(ms);
  }
}
