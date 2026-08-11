/**
 * Narration: turn the caption track into a spoken voice-over.
 *
 * A caption is already the script. Every flow and every recipe says what it is
 * doing in words on screen, timestamped by `page.caption()`, so a voice-over is
 * not new writing — it is the same sentences, spoken, landing on the frames they
 * were written for. Keeping one source is the whole design: a separate narration
 * script would drift from the captions the first time anyone edited one of them.
 *
 * ## How the voice is made
 *
 * Google's Gemini TTS models return **raw signed 16-bit little-endian PCM at
 * 24kHz, mono** — not a WAV, not an MP3. There is no RIFF header on it, so it is
 * written here with one prepended; ffmpeg would otherwise read the first 44 bytes
 * of speech as a header and produce a click plus a wrong duration.
 *
 * Each line is synthesised separately rather than as one long take. That costs
 * more requests, but it is what makes the timing exact: line *n* is delayed to
 * the instant caption *n* appeared, so a slow selector lookup mid-flow moves the
 * voice with it. One long file would desynchronise from the first hesitation
 * onward and there would be nothing to nudge.
 *
 * ## What happens without an API key
 *
 * Nothing breaks. `synthNarration` returns `null`, the recorder logs one line
 * saying narration was skipped, and the take is scored exactly as it was before
 * this file existed. Narration is an enhancement to an already-working pipeline
 * and is wired to fail that way on purpose — a missing key at 2am should cost you
 * a voice track, not the video.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Gemini's TTS output format. Fixed by the API, not a preference. */
const PCM_RATE = 24_000;
const PCM_CHANNELS = 1;
const PCM_BITS = 16;

/**
 * Prebuilt Gemini voices, chosen for narration rather than listed exhaustively.
 *
 * The API offers around thirty; most are characterful in a way that fights a
 * product demo. These six read as a person explaining something they know well,
 * which is the register marketing footage wants.
 */
export const VOICES = [
  { id: 'Charon', label: 'Charon', note: 'Warm, measured. The default.' },
  { id: 'Kore', label: 'Kore', note: 'Bright and direct.' },
  { id: 'Puck', label: 'Puck', note: 'Upbeat, quicker.' },
  { id: 'Aoede', label: 'Aoede', note: 'Soft, unhurried.' },
  { id: 'Fenrir', label: 'Fenrir', note: 'Deeper, steady.' },
  { id: 'Leda', label: 'Leda', note: 'Youthful, clear.' },
];

export const DEFAULT_VOICE = 'Charon';

/** The model that speaks. Flash is enough for narration and far cheaper. */
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
}

/**
 * How the model should read the line.
 *
 * Gemini TTS takes direction in the prompt itself — there is no separate style
 * parameter — so the instruction is prepended to the text. It is deliberately
 * about *restraint*: the failure mode of TTS on marketing copy is an infomercial
 * voice, and a product demo needs someone who already believes the product works.
 */
function directed(text, style) {
  const tone = style?.trim()
    || 'Read this calmly and warmly, like a knowledgeable colleague explaining '
     + 'something useful. Natural pace, no salesy emphasis, no rising sing-song.';
  return `${tone}\n\n${text}`;
}

/** Wrap raw PCM in a RIFF header so ffmpeg reads it as audio and not as noise. */
function wavHeader(bytes) {
  const blockAlign = (PCM_CHANNELS * PCM_BITS) / 8;
  const byteRate = PCM_RATE * blockAlign;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + bytes, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);          // PCM chunk size
  h.writeUInt16LE(1, 20);           // format: PCM
  h.writeUInt16LE(PCM_CHANNELS, 22);
  h.writeUInt32LE(PCM_RATE, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(PCM_BITS, 34);
  h.write('data', 36);
  h.writeUInt32LE(bytes, 40);
  return h;
}

/**
 * Speak one line. Returns a WAV buffer, or throws with the API's own message.
 *
 * The 60s timeout is per line, and lines are one or two sentences — anything
 * slower than that is the API being unavailable rather than busy, and a recorder
 * that hangs on a network call is worse than one that says narration failed.
 */
async function speak(text, voice, style, signal) {
  const key = apiKey();
  if (!key) throw new Error('no GEMINI_API_KEY');

  const res = await fetch(`${API_ROOT}/${TTS_MODEL}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: directed(text, style) }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || DEFAULT_VOICE } },
        },
      },
    }),
  });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      detail = body?.error?.message || detail;
    } catch { /* the status alone is the message */ }
    throw new Error(detail);
  }

  const body = await res.json();
  const b64 = body?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('the model returned no audio');

  const pcm = Buffer.from(b64, 'base64');
  return Buffer.concat([wavHeader(pcm.length), pcm]);
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `ffmpeg exited ${code}`))));
  });
}

/**
 * Where a spoken line is cached, addressed by what it sounds like.
 *
 * The key is the whole request — model, voice, tone direction, text — and **not**
 * the line's position in the take. Keying by index was the first version and it
 * was wrong in a way that would have been maddening to debug: re-recording
 * `pos-desktop-light` with `--voice Kore` would have found `line-03.wav` from the
 * Charon run sitting there and reused it, so the flag would have appeared to do
 * nothing at all.
 *
 * Content-addressing also makes the cache shared rather than per-take, which is
 * where the money is. `--device both --theme both` is four takes of identical
 * captions; the first pays for the voice and the other three read it off disk.
 * Same for re-scoring a take from last week in a voice you have already used.
 */
function cachePath(dir, text, voice, style) {
  // JSON rather than joining on a separator: a caption is arbitrary text, and any
  // separator it might contain would let two different requests hash alike.
  const key = createHash('sha1')
    .update(JSON.stringify([TTS_MODEL, voice || DEFAULT_VOICE, style || '', text]))
    .digest('hex')
    .slice(0, 16);
  return path.join(dir, `${key}.wav`);
}

/**
 * Synthesise a narration track for a take.
 *
 * `lines` is `page.marks.narration` already converted to **video time** — the
 * conversion belongs to the caller, which owns the frame timeline. Each line is
 * delayed to its own instant with `adelay` and the whole set mixed down to one
 * track the length of the video.
 *
 * Returns the path to a WAV, or `null` when narration is off, unavailable, or
 * produced nothing usable. Never throws for a reason the operator cannot fix.
 */
export async function synthNarration({ lines, dir, stamp, voice, style, duration, log = () => {}, signal }) {
  if (!lines?.length) return null;
  if (!apiKey()) {
    log('narration: skipped — no GEMINI_API_KEY');
    return null;
  }

  // Two directories, because they have different lifetimes: the mixdown belongs
  // to this take and is overwritten by the next run of it, while a spoken line
  // belongs to whoever asks for that text in that voice again.
  const takeDir = path.join(dir, '.narration', stamp);
  const cacheDir = path.join(dir, '.narration', 'voices');
  mkdirSync(takeDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  const spoken = [];
  let paid = 0;
  for (const [i, line] of lines.entries()) {
    const text = String(line.text ?? '').trim();
    if (!text) continue;
    const file = cachePath(cacheDir, text, voice, style);
    try {
      if (!existsSync(file)) {
        writeFileSync(file, await speak(text, voice, style, signal));
        paid++;
      }
      spoken.push({ file, at: Math.max(0, Number(line.at) || 0) });
    } catch (err) {
      // One failed line loses one sentence, not the narration. Reported so the
      // gap in the voice-over has a stated cause rather than looking like a bug.
      log(`narration: line ${i + 1} failed (${err.message}) — continuing`);
    }
  }

  if (!spoken.length) {
    log('narration: no lines were synthesised');
    return null;
  }

  const out = path.join(takeDir, 'narration.wav');
  const inputs = spoken.flatMap((s) => ['-i', s.file]);
  const delays = spoken
    .map((s, i) => `[${i}:a]adelay=${Math.round(s.at * 1000)}:all=1[d${i}]`)
    .join(';');
  const mixIn = spoken.map((_, i) => `[d${i}]`).join('');

  // `amix` normalises by input count, which would make a ten-line narration a
  // third the level of a three-line one. `normalize=0` keeps every line at the
  // level it was spoken; they do not overlap, so nothing sums into clipping.
  const filter = `${delays};${mixIn}amix=inputs=${spoken.length}:normalize=0:dropout_transition=0[n]`;

  try {
    await ffmpeg([
      ...inputs,
      '-filter_complex', filter,
      '-map', '[n]',
      '-t', String(duration),
      '-ar', String(PCM_RATE),
      '-ac', '1',
      out,
    ]);
  } catch (err) {
    log(`narration: mixdown failed (${err.message}) — continuing without it`);
    return null;
  }

  // The cached count is worth printing: it is the difference between a re-score
  // that costs nothing and one that quietly re-buys every line.
  const reused = spoken.length - paid;
  log(`narration: ${spoken.length}/${lines.length} line(s) in ${voice || DEFAULT_VOICE}`
    + (reused ? ` (${reused} from cache)` : ''));
  return out;
}
