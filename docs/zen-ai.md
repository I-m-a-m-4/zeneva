# Zen AI (`/ai-insights`)

The AI copilot. Next.js route `src/app/api/chat/route.ts` streams from Gemini
via the Vercel AI SDK; the client is `src/app/(app)/ai-insights/page.tsx`.

## The 401 that cost a session — read this before touching the chat client

Symptom: every prompt returned `POST /api/chat 401 (Unauthorized)`, with the
browser stack trace pinned to a line number that no longer matched the source.

**Two independent causes stacked, and fixing only the first changes nothing.**

### Cause 1 — `useChat` was still on the v4 API

`package.json` pins `ai@7` + `@ai-sdk/react@4` (these are the matching pair —
`@ai-sdk/react` v4 depends on `ai` v7, the version numbers are *not* meant to
line up). The page was still written for v3/v4:

```js
// BROKEN on ai@7 — both options are silently ignored
useChat({ api: '/api/chat', body: { businessId, userId } })
```

In v7 `ChatInit` accepts **neither `api` nor `body`** (confirmed in
`node_modules/ai/dist/index.d.ts`). They are transport concerns now. The
request still reached `/api/chat` because that is `DefaultChatTransport`'s
default path, but `businessId`/`userId` never left the browser — so the auth
check in `route.ts` rejected every call.

The fix is a transport whose `prepareSendMessagesRequest` re-reads the ids on
every send (a ref, not a closure — `businessId` resolves after first paint):

```js
const transport = useMemo(() => new DefaultChatTransport({
  api: '/api/chat',
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { ...body, messages, ...authRef.current },
  }),
}), []);
useChat({ id: sessionId, transport, onError });
```

Verify the server half with curl — no browser needed:

```bash
# missing ids -> 401
curl -s -XPOST localhost:9007/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"hi"}]}]}'
# with ids -> gets past auth (404 "Business not found" for a fake id is a PASS)
curl -s -XPOST localhost:9007/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[...],"businessId":"x","userId":"y"}'
```

Other v7 renames that bit at the same time, all in the same file:

| v3/v4 | v7 |
|---|---|
| `useChat().append(...)` | `sendMessage({ text })` — `append` no longer exists |
| `message.content` | `message.parts[]` (filter `type === 'text'`) |
| `message.toolInvocations` | `tool-*` parts, read via `isToolUIPart` / `getToolName` |
| `tool.result` | `part.output` |
| `state === 'result'` | `state === 'output-available'` (also `output-error`) |
| `tool({ parameters })` | `tool({ inputSchema })` |
| `maxSteps: 10` | `stopWhen: stepCountIs(10)` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |

### Cause 2 — a stale service worker served the old bundle

This is the one that makes the fix look like it did nothing.

`next.config.ts` sets next-pwa `disable: NODE_ENV === 'development'`, which
stops it *generating* a worker in dev — but Next still **serves any leftover
`public/sw.js` as a static file**. So every `npm run build` plants a production
service worker that then hijacks the dev server on the next visit.

That worker precaches the built chunks, e.g.
`/_next/static/chunks/app/(app)/ai-insights/page-<hash>.js`. The browser kept
serving the *compiled old* page, so source edits had no effect and the stack
trace kept pointing at line numbers from the pre-fix build. A normal refresh
does not help — it goes through the worker.

**The tell:** a stack trace line number that does not match the current source.
If you see that, suspect the service worker before you suspect your edit.

Two guards are now in place:

- `public/sw.js` and `public/workbox-*.js` are gitignored build artifacts; they
  were deleted. They will reappear after any local `npm run build`.
- `src/components/shared/client-initializer.tsx` unregisters non-FCM service
  workers when `NODE_ENV === 'development'`. It deliberately **skips**
  `firebase-messaging-sw.js`, which `src/hooks/use-fcm.ts` registers on purpose
  — a blanket unregister breaks push notifications in dev.

The guard cannot rescue a tab that a worker already controls (an unregistered
worker keeps controlling open pages until reload). To break out once:

```js
navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())))
  .then(() => caches.keys()).then(ks => Promise.all(ks.map(k => caches.delete(k))))
  .then(() => location.reload());
```

## Session persistence

Transcripts are written to Firestore `ai_sessions/{sessionId}`. Sessions saved
by pre-v5 builds hold `{role, content}` and `toolInvocations`; both the client
(`normaliseMessage`) and the server normalise `content` → `parts` on load.
Tool cards from those old sessions do not survive — only their text does.
`convertToModelMessages` is wrapped in a try/catch that returns a friendly
"start a new chat" 400 rather than a 500.

## Quotas

`route.ts` enforces a global daily cap (`platform_stats/ai_usage_global`) and a
per-business daily cap by plan (starter 20 / pro 100 / business + lifetime 500),
falling back to `aiBonusCredits`. Usage increments in `onFinish`, so a failed
turn is not billed.
