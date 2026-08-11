# Marketing recorder

Records real product demos by **driving the real app**. It signs in with a real
account, clicks through a coded flow with real mouse and keyboard events, draws
a presentation cursor with click ripples over the top, and writes an H.264 MP4
with a music bed and interaction sound.

The pixels in the video are the app's own pixels. Not a mockup, not a canvas
re-drawing — if the POS page changes tomorrow, the video changes with it,
because there is nothing here that describes what the app looks like.

```bash
cp scripts/record/recorder.env.example .env.recorder   # then fill it in
npm run dev                                             # in another terminal
npm run record -- --flow pos
```

Output lands in `marketing-out/` (gitignored).

---

## What it does not touch

Nothing under `src/`. No `data-testid` was added to any component — every target
is found by the text a person reads on screen, a placeholder, an ARIA role, or a
CSS shape that already exists.

No npm dependency either. Node 22 ships a global `WebSocket`, so this speaks the
Chrome DevTools Protocol directly to the Chrome you already have installed. No
Playwright, no ~140 MB browser download, no lockfile churn. `package.json` gains
two `scripts` lines and nothing else.

Deleting `scripts/record/` removes the feature completely.

The only outside requirement is **ffmpeg on PATH** (`winget install ffmpeg`),
which also gives you `ffprobe`.

---

## Options

```
npm run record -- [options]

  --flow      pos | inventory | zen | all        (default: pos)
  --device    desktop | mobile | both            (default: desktop)
  --theme     light | dark | both                (default: light)
  --url       app to record                      (default: $ZENEVA_RECORD_URL)
  --out       output directory                   (default: ./marketing-out)
  --fps       output frame rate                  (default: 30)
  --quality   capture JPEG quality 1-100         (default: 85)
  --format    mp4 | webm                         (default: mp4)
  --commit    let the flow actually save
  --headed    show the browser while recording
  --keep-frames  keep the raw JPEG sequence
  --timings   print wall-clock per stage
  --browser   path to chrome.exe / msedge.exe
```

`--quality` is a frame-rate lever, not just a size one: Chrome will not paint the
next frame until the current one is acked, so the in-browser JPEG encode *is* the
capture rate. Measured at 1920×1080 — q92 painted 19-31fps, q85 33, q70 37. Below
the requested fps some emitted frames are repeats, which is judder. 85 is the
default because these frames are re-encoded to H.264 at crf 18 anyway.

`--flow all --device both --theme both` is twelve takes in one run: three flows
× desktop/mobile × light/dark.

### Devices

| | viewport | DPR | output |
|---|---|---|---|
| `desktop` | 1280×720 | 1.5 | 1920×1080 |
| `mobile` | 360×640 | 3 | 1080×1920 |

Mobile is a real mobile take, not a cropped desktop one: touch emulation is on,
the user agent is a Pixel 8, taps are dispatched as `Input.dispatchTouchEvent`,
the cursor becomes a finger, and a phone frame is drawn around the viewport.
The app therefore renders its own mobile layout, the same one a customer gets.
1080×1920 is what Reels, Shorts and TikTok want.

### Themes

`--theme` seeds `localStorage.theme` before first paint *and* sets the emulated
`prefers-color-scheme`, so the app boots straight into the requested theme with
no flash of the wrong one.

---

## Audio

Ticks for clicks and keystrokes are on by default. A music bed is the one thing
you supply:

```bash
npm run record -- --flow pos --music D:/marketing/beds/upbeat.mp3
npm run record -- --flow all --music D:/marketing/beds        # folder
```

A folder is searched for a track named after the flow — `pos.mp3`, `zen.mp3`,
`inventory.mp3` — and falls back to the first file in it. So one folder can
score every take in a twelve-take run, each flow with its own bed, no extra
flags. Set `ZENEVA_RECORD_MUSIC` in `.env.recorder` to stop typing it at all.

```
  --music <path>        file, or folder to pick from
  --music-volume 0-1    bed level under the ticks       (default: 0.28)
  --no-music            skip the bed, keep the ticks
  --no-click-sfx        skip click ticks
  --no-typing-sfx       skip keystroke ticks
  --silent              no audio at all
```

The ticks are synthesised, not sampled — a click is described to ffmpeg as an
equation (two decaying sine partials: a body and a snap), so there are no binary
audio assets in the repo to license, review or lose. Keystrokes sit much lower
and shorter than clicks; at click level a typed sentence turns into a
machine-gun.

Use a music track you have the rights to. These go out as marketing, which is
exactly the case a content-ID claim is built to catch.

### Re-scoring without re-shooting

Scoring is a second ffmpeg pass that copies the video stream (`-c:v copy`) and
never re-encodes the picture. So you can swap the bed on a take from last week,
or try three beds against the same cut, in a second or two each:

```bash
npm run record:audio -- marketing-out/zeneva-pos-desktop-light.mp4 \
  --music D:/marketing/beds/calm.mp3
```

Every recording gets a `<video>.marks.json` sidecar holding the exact moment of
each click and keystroke. That is what lets the ticks land on the same frames
they did in the original take. Delete the sidecar and you still get the music
bed — the ticks are skipped rather than guessed, because a tick half a beat off
its frame is worse than no tick.

<details>
<summary>Why the marks are needed at all</summary>

A click happens at a wall-clock instant; the sound has to land on a *frame*. The
sampler emits at a constant rate, so video time is just `frameIndex / fps` — but
nothing records which frame index was on screen when the mouse went down, and by
the time the audio is mixed the JPEG sequence has been deleted.

`marks` is the emitted-frame timeline: one wall-clock stamp per frame written.
`videoTimeFor()` binary-searches it and divides by fps, interpolating across the
gap so several ticks between two frames do not collapse onto one instant. The
sidecar stores the already-converted times so a re-score lands identically.

This used to be much harder. Frames were written with per-frame durations and a
`fps=` resample filter, so wall-clock and video time genuinely diverged on any
take where the app stalled, and `videoTimeFor` had to replay that transform
exactly. Constant-rate sampling deleted the problem rather than solving it.

</details>

---

## Writes are opt-in

By default a take is **read-only**. The POS flow builds a cart, walks through
customer and payment, and stops at the review screen without pressing *Complete
Sale*. The inventory flow opens Quick Edit, types the new stock count, and
presses *Cancel*.

`--commit` lets both go through. The captions change to match, so footage from a
read-only take never claims a sale was rung up.

This exists because the recorder holds a real login. A take pointed at the wrong
account, at 1am, should not be able to move someone's stock count.

---

## Flows

Coded in `flows.mjs`, one exported function each. They return the end card's
text, so a flow owns its own closing frame.

**`pos`** — Sales → three products into the cart → Next: Customer → Next:
Payment → Cash → Review & Complete → (`--commit`) Complete Sale.

**`inventory`** — Inventory → search → Inventory Health tab → Low Stock tile →
row ⋯ menu → Quick Edit → new stock count → Save Changes (or Cancel).

**`zen`** — Zen AI → type a real question into the composer → send → hold while
the tool-call status line and the answer stream in.

### Adding one

```js
export async function myFlow(page, ctx = {}) {
  await page.card('Title', 'Subtitle shown over the app');
  await page.goto('/some-page');
  await page.clearCard();

  await page.click({ text: 'Save', tag: 'button' }, { say: 'Caption during the click' });
  await page.fill({ placeholder: 'Search…' }, 'query', { clear: true });

  return { title: 'End card', subtitle: '…', cta: 'zeneva.space' };
}
```

Then add it to the `FLOWS` map at the bottom of the file. `--flow all` picks it
up automatically.

Selector specs, resolved by `overlay.js` in page context:

| spec | matches |
|---|---|
| `{ text: 'Save', tag: 'button', exact: true }` | visible text |
| `{ placeholder: 'Search…' }` | input placeholder |
| `{ label: 'Close' }` | `aria-label` |
| `{ css: 'tbody [aria-haspopup="menu"]', nth: 0 }` | anything else |

Only *visible* elements match — zero-size and `display:none` nodes are skipped,
so a hidden duplicate in a closed sheet cannot steal the click. `find()` polls
until the element appears, which is what makes the flows tolerant of a slow
page instead of racing it.

Prefer text and placeholders over CSS. A CSS selector built from Tailwind
classes breaks the next time someone changes a padding value; the button's
label is what the flow is actually about.

---

## Debugging a broken take

```bash
npm run record -- --flow pos --headed --keep-frames
```

`--headed` shows the browser so you can watch where it went wrong. `--keep-frames`
leaves the capture in `marketing-out/.frames/<take>/frames.mjpg` — one
concatenated MJPEG stream, which any player will open, alongside the
`<video>.marks.json` sidecar listing every click, keystroke and camera move.

**`timed out after 20s: no visible element matched {...}`** — the flow's picture
of the app is out of date. Open the page, find the current text, fix the spec.
This is the failure you want: it stops with a named selector instead of quietly
recording thirty seconds of the wrong screen.

**`the app rejected those credentials`** — the app's own error text, surfaced
rather than left to time out. Check `.env.recorder`.

**`app never finished booting (still showing the loader)`** — dev server not up
at `--url`, or the account has no business attached.

**`ffmpeg is not on PATH`** — `winget install ffmpeg`, then a new terminal.

---

## How a frame becomes a video

1. `Page.startScreencast` streams JPEGs as Chrome paints, each with a timestamp.
2. Every frame is acked immediately — Chrome will not paint frame N+1 until N is
   acked, so anything you do before the ack becomes the capture rate. The JPEG
   encode inside the browser is the reason `--quality` is a frame-rate lever and
   not just a file-size one: at 1920×1080, q92 painted 19–31 fps, q85 33, q70 37.
   The default is 85 because the sampler needs a painted rate above 30.
3. A timer running at `--fps` writes whatever the newest frame is, repeating it if
   the page has not repainted. **Video time is therefore `frameIndex / fps`** —
   the encoded timeline is defined by the sampler, not recovered from timestamps
   afterwards, which is what makes `videoTimeFor()` exact rather than a guess.
4. Frames are appended to a single already-open fd as one MJPEG stream. Not one
   file per frame: on this machine an individual `writeFile` cost 28–38 ms once
   NTFS metadata and Defender had their turn, against 0.1 ms for an append — at
   870 frames that is the difference between half a minute of disk and none.
5. `ffmpeg -f mjpeg -framerate <fps>` reads it back. A constant rate in means no
   `ffconcat` list, no per-frame durations and no resampling pass.
6. Optional `zoompan` camera moves, then the phone chassis if `--device mobile`,
   then `libx264 -crf 18 -preset veryfast`, `+faststart`.
7. A second ffmpeg pass mixes the bed and the ticks in with `-c:v copy`, so
   scoring a take costs a second or two rather than a re-encode.

---

## How long a take takes

```bash
npm run record -- --flow pos --timings
```

```
launch 0.7s · login 8.1s · warm 6.0s · flow 44.9s · encode 10.4s · score 2.0s · total 72.0s
```

`flow` is the video's own length — a creative decision, not overhead. Everything
else is cost, and on a first take it is roughly a third of the run.

**A batch amortises most of it.** Route warming defeats the *dev server's*
on-demand compile, and that cache lives in the server process, so it is done once
per run rather than once per take — the second take of the batch above reported
`warm 0.0s` and finished in 62.9s. A `--url` that is not localhost skips warming
altogether, since the routes are already built.

**Do not bother re-tuning the encoder.** It was benchmarked on a fixed 205MB /
1962-frame capture, and 8.2s of the 18.3s is MJPEG *decode*:

| variant | time |
| --- | --- |
| `libx264 veryfast crf 18` (default) | 18.3s |
| `-threads 8` | 17.9s |
| `-filter_complex_threads 8` | 18.6s |
| `h264_qsv` (hardware) | 19.7s |
| `h264_mf` (hardware) | 20.4s |
| `preset fast crf 19` | 20.4s |
| no camera filter at all | 19.4s |

Every alternative is inside run-to-run noise or worse — including both working
hardware encoders. The stage is decode-bound and already at its floor.

**Compare stages within one run, never across runs.** Machine load moves every
number together: the same take measured 52.1s of flow at 24fps painted on a busy
machine and 44.8s at 43fps on a quiet one. Two consecutive takes in one batch are
a fair A/B; two separate invocations are not.

The browser runs under a throwaway `--user-data-dir` from the system temp
directory, deleted afterwards, so a real login leaves no session token on disk.
Capture starts *after* login lands, so no credential is ever on camera, and the
email is masked in the console output.

---

The recorder drives the real app, so what it records is whatever the app does.
For the app itself: `docs/technology.md` (the stack), `docs/blueprint.md` (the
design language the footage will show), `docs/zen-ai.md` (the `zen` flow's
subject).
