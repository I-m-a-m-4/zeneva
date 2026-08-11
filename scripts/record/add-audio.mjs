#!/usr/bin/env node
/**
 * Score a video that already exists.
 *
 *   node scripts/record/add-audio.mjs marketing-out/zeneva-pos-desktop-light.mp4 \
 *     --music assets/beds/upbeat.mp3
 *
 * Swap the music on a take from last week, try three beds against the same cut,
 * or add a bed to a video that was recorded silent — without re-shooting it. The
 * video stream is copied, never re-encoded, so this is near-instant and the
 * picture is bit-for-bit what you already approved.
 *
 * If the recorder wrote a `<video>.marks.json` sidecar next to the file, the
 * click and keystroke ticks land on exactly the frames they did in the original
 * take. Without the sidecar you still get the music bed; the ticks are simply
 * skipped, because guessing where the clicks were would put them on the wrong
 * frames and a tick half a beat off is worse than no tick.
 *
 * Writes alongside the input as `<name>-scored.mp4` unless you pass --out.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mixAudio, resolveMusic, synthBed } from './audio.mjs';
import { hasFfmpeg, probe } from './capture.mjs';

const HELP = `
Add music and interaction sound to an existing recording.

  node scripts/record/add-audio.mjs <video> [options]

  --music <path>        music bed: a file, or a folder to pick from
  --music-volume 0-1    bed level                      (default: 0.28)
  --out <path>          destination      (default: <video>-scored.<ext>)
  --no-click-sfx        skip click ticks
  --no-typing-sfx       skip keystroke ticks
  --marks <path>        marks sidecar   (default: <video>.marks.json)

Click/keystroke ticks need the marks sidecar the recorder writes next to each
video. Without it you still get the music bed.
`;

function parseArgs(argv) {
  const out = {
    video: null, music: null, musicVolume: 0.28,
    outPath: null, marks: null, clickSfx: true, typingSfx: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--music': out.music = next(); break;
      case '--music-volume': out.musicVolume = Number(next()); break;
      case '--out': out.outPath = path.resolve(next()); break;
      case '--marks': out.marks = path.resolve(next()); break;
      case '--no-click-sfx': out.clickSfx = false; break;
      case '--no-typing-sfx': out.typingSfx = false; break;
      case '-h': case '--help': out.help = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
        else if (!out.video) out.video = path.resolve(a);
    }
  }
  return out;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || !o.video) {
    console.log(HELP);
    return o.video ? 0 : 1;
  }
  if (!existsSync(o.video)) throw new Error(`no such file: ${o.video}`);
  if (!(await hasFfmpeg())) throw new Error('ffmpeg is not on PATH');

  const ext = path.extname(o.video);
  const outPath = o.outPath
    ?? path.join(path.dirname(o.video), `${path.basename(o.video, ext)}-scored${ext}`);
  if (path.resolve(outPath) === path.resolve(o.video)) {
    // ffmpeg reads the input while writing the output; the same path truncates
    // the source out from under it and you lose the take.
    throw new Error('--out must differ from the input video');
  }

  const info = await probe(o.video);
  const duration = info.seconds;

  const marksPath = o.marks ?? `${o.video}.marks.json`;
  let marks = { clicks: [], keys: [] };
  if (existsSync(marksPath)) {
    marks = JSON.parse(readFileSync(marksPath, 'utf8'));
  } else if (o.clickSfx || o.typingSfx) {
    console.log(`   no marks sidecar at ${path.basename(marksPath)} — music only, no ticks`);
  }

  // Derive the flow name from the recorder's own filename (zeneva-pos-desktop-light)
  // so a --music folder can still pick the matching bed.
  const flowId = path.basename(o.video, ext).replace(/^zeneva-/, '').split('-')[0];

  // Same default as the recorder: a supplied track, else the ambient pad. This
  // script's whole point is a video that was silent, so a re-score without any
  // audio choice should not come out silent again.
  const bedFile = o.music
    ? resolveMusic(o.music, flowId)
    : await synthBed(path.join(path.dirname(outPath), '.frames'));

  const res = await mixAudio({
    videoPath: o.video,
    outPath,
    duration,
    music: bedFile,
    musicVolume: o.musicVolume,
    clicks: o.clickSfx ? (marks.clicks ?? []) : [],
    keys: o.typingSfx ? (marks.keys ?? []) : [],
  });

  if (!res.scored) {
    console.log('\n   Nothing to add — pass --music, or keep the ticks enabled.\n');
    return 1;
  }
  console.log(`\n   ✓ ${outPath}`);
  console.log(`     ${duration.toFixed(1)}s · ${res.clicks} clicks · ${res.keys} keystrokes`
    + (res.music ? ` · bed: ${res.music}` : ' · no bed'));
  console.log('');
  return 0;
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(`\n   ${e.message}\n`);
    process.exit(1);
  });
