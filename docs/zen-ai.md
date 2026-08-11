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

### `convertToModelMessages` is async — the missing `await` is invisible

Its signature is `Promise<ModelMessage[]>`, not `ModelMessage[]`. Drop the
`await` and nothing complains at the call site: `streamText` accepts the Promise,
carries it two layers down, and the provider dies on

```
TypeError: messages.some is not a function
```

The trace points at the `streamText({...})` call — the line *after* the real
mistake — and because `toUIMessageStreamResponse`'s `onError` turns a stream
failure into assistant text, the owner sees `messages.some is not a function`
rendered as Zen's reply in the chat bubble. It looks like a provider or model
problem. It is a missing keyword.

`typescript.ignoreBuildErrors: true` in `next.config.ts` means the build will not
catch this either. Both routes now `await` it; keep it that way when adding a
third.

## Quotas

`route.ts` enforces a global daily cap (`platform_stats/ai_usage_global`) and a
per-business daily cap by plan (starter 20 / pro 100 / business + lifetime 500),
falling back to `aiBonusCredits`. Usage increments in `onFinish`, so a failed
turn is not billed.

## Usage analytics — what is recorded, and what must never be

The admin board at `/admin-imamshaffy/ai-usage` reads two things:

- **`platform_stats/ai_usage_global/daily/{YYYY-MM-DD}`** — one platform-wide
  rollup per UTC day, written by `route.ts`. Everything time-based on the board
  comes from here.
- **`businessInstances.aiToolUsageCounts`** — per-tenant *lifetime* tool counts,
  which is also what the `uses` figure on `/ai-insights/use-cases` reads.

The shared vocabulary — intent rules, keyword allow-list, tool grouping — lives
in `src/lib/ai-analytics.ts`, which is imported by **both** the route and the
admin page. That module must stay free of `firebase-admin`; importing the Admin
SDK into it breaks the admin page's client bundle.

**Prompt text is never stored, and this is not an oversight to correct.** The
board is platform-wide, so an archive of raw prompts would put every tenant's
customer names, phone numbers and order details under the platform owner's eye
with no way for them to know. What gets written instead is derived and lossy:
one intent label per turn, plus matches against the fixed `KEYWORD_VOCAB`.

That allow-list direction is the whole safety property. A stop-word *filter*
would have to anticipate every word worth suppressing and leaks whatever it
failed to think of; an allow-list can only ever emit retail vocabulary decided
in advance, so a customer's surname has no path into the rollup even when it is
typed into the chat. Adding raw prompt samples is a policy decision to take
deliberately, not a line to slip into `onFinish`.

Three things that will bite:

- **The day rollup is written with nested maps, not the dotted keys used on
  `businessRef` in the same batch.** `update()` reads `'tools.queryProducts'` as
  a field path; `set()` does not, and would create a field *literally named*
  `tools.queryProducts` that nothing reads. The day document does not exist
  until the first turn of the day, so it has to be `set(..., {merge: true})` —
  which means nested maps are the only correct form there.
- **`latencyMsTotal` is a sum, not an average.** Divide by `count` at read time.
  Averages cannot be added, so storing one per day makes the multi-day figure
  wrong in a way that looks plausible.
- **History starts the day the recorder shipped.** Earlier days have no document
  rather than a zero, and the board says so instead of drawing a flat line —
  a flat line reads as "nobody used it", which is a different conclusion.

Blocked turns (`plan_limit`, `global_limit`, `injection`, `bad_history`) are
recorded on the same document *before* the model is reached, and never awaited:
analytics must not be able to turn a clean 429 into a 500. They are the most
useful numbers on the board — a day where a tenth of turns hit `plan_limit` is a
pricing signal, and repeated `injection` hits are a security one — and they are
invisible in the success count by design, because a blocked turn deliberately
never increments it.

Adding a signal to the rollup means adding it to `AiDailyStats` in
`ai-analytics.ts` too, or the admin page cannot see a field the route is
faithfully writing.

## The toolkit lives in `tools.ts`, not `route.ts`

`src/app/api/chat/tools.ts` exports `createZenTools({ db, businessId, currency })`
and returns all 41 tools. `route.ts` is now only auth, quotas, the system prompt
and streaming. Add tools there, not in the route.

`route.ts` passes the whole toolkit through with no whitelist, so a tool added to
`tools.ts` is live on the next request. The three places that still need a manual
entry are `TOOL_LINES` in `zen-status.tsx`, a `case` in `tool-renderer.tsx` if it
returns a new `type`, and the system prompt if the model needs telling *when* to
reach for it.

### That no-whitelist pass-through is also a security boundary

Because the toolkit goes to the model unfiltered, **every tool in `tools.ts` is
callable by every merchant on the platform.** The context it closes over is a
single `businessId`, so anything a tool reads outside that tenant's data is a
cross-tenant leak by construction.

This is why Zeneva's own cap table has a **separate route and toolkit**:

- `src/app/api/admin/chat/route.ts` — gated by `requireSuperAdmin(req)` from
  `../_guard`, exactly like the other `api/admin/*` routes.
- `src/app/api/admin/chat/cap-table-tools.ts` — read-only tools over the
  `cap_table` collection, computed through `src/lib/equity/engine.ts` so the
  assistant and the page cannot disagree about a number.

Putting a cap table tool in `tools.ts` instead would let any shop owner ask Zen
AI who owns Zeneva, what it is valued at, and what each investor paid. There is
no per-tool gate to add it behind — the whitelist does not exist.

The admin assistant has **no write tools at all**, not even `propose*`. Equity is
edited through the forms on `/admin-imamshaffy/investors`, which validate and
write to the append-only `cap_table_events` audit trail.

Its client is `src/components/admin/equity/cap-table-assistant.tsx`, which reuses
`ToolResult`, `Markdown` and `ZenMark` from `src/components/ai-insights/`. It
follows the same `ai@7` transport rule as the merchant page — `useChat` accepts
neither `api` nor `body` — except the credential is a Bearer ID token rather than
`businessId`/`userId` in the body.

Two Firestore constraints shape how these tools query — both cost real debugging
time, so do not "clean them up" into idiomatic queries:

- **`receipts` has no `(businessId, status, createdAt)` composite index.** Any
  tool that needs completed receipts over a date range filters `status` **in
  memory** after the range query. Adding `.where('status', ...)` alongside the
  `createdAt` range makes the tool throw at runtime, not at build time.
- **`auditLogs` has no `(businessId, createdAt)` composite index** — only
  single-field overrides. `getAuditTrail` fetches by `businessId`, then sorts
  and slices in memory.

Check `firestore.indexes.json` before adding a query with more than one
constraint. A missing index fails only when the tool is actually called, which
looks like the model malfunctioning rather than a query problem.

### "How do I…" answers come from `WORKFLOWS`, never from the model

`explainHowTo` returns one of ten hand-written walkthroughs (`bulkImport`,
`recordSale`, `addProduct`, `lowStockThreshold`, `addBranch`, `refund`,
`addStaff`, `invoice`, `stocktake`, `loyalty`) as a numbered `WALKTHROUGH` card.
The model picks a topic; it never writes the steps.

That split is the whole point. Asked to teach bulk import, the model first
answered "you'll find the import function on the Inventory page, look for an
Import or Bulk Upload option" — a shrug dressed as help — and then leaked two
copies of `linkToPage`'s rejection string into the reply. Steps it invents are
worse than none, because an owner hunting for a button that isn't on the screen
concludes the app is broken.

So the walkthroughs are written from the real UI. `bulkImport`'s CSV headers are
copied from `HEADER_MAPPINGS` in
`src/components/inventory/import-dialog.tsx` — **update both together**, or the
card documents a column the importer will not accept.

The topic list is a `z.enum`, and an unknown topic returns an error string
rather than a card. Adding a workflow means adding it in both places; the keys
and the enum must stay in step:

```bash
# both lists should match, and note the keys are camelCase — a [a-z_]+ pattern
# silently matches only 4 of the 10 and the check passes vacuously
grep -oE "^  [a-zA-Z]+: \{" src/app/api/chat/tools.ts   # WORKFLOWS keys
```

## The chat UI

Four components in `src/components/ai-insights/`. The page composes them; none
of them fetch.

### `zen-mark.tsx` — the brand glyph, animatable

The ring and crescent from `AppConfig.logoIconUrl`. The `d` attributes and the
`#ff9933 → #cc5200` gradient are copied verbatim from that data-URI, because a
data-URI `<img>` cannot be animated per-path — which is the whole point. If the
brand mark changes, re-decode `logoIconUrl` and copy the paths again rather than
redrawing by hand.

`viewBox` is `42 47 116 116`, not the logo's `0 0 200 200`. The glyph only
occupies x 60–140, y 55–154 inside the original box; at 32px avatar size that
padding shrinks the mark to a third of the space. The crop is centred on the
glyph's centroid and the paths are untouched.

`animated` sweeps a silver sheen across the mark — a narrow white band on a
horizontal gradient, painted over the orange fill and clipped to the glyph, so
it reads as light travelling *through* the mark rather than a rectangle sliding
past it.

**Gradient ids are per-instance** (`zen-mark-1`, `zen-mark-2`, …). SVG ids are
document-global; a shared id makes every mark after the first render wrong.

**Reduced motion is handled in JS, not CSS.** The sheen is SMIL
(`<animateTransform>`), which ignores `prefers-reduced-motion`, so `ZenMark`
reads `useReducedMotion()` and drops the sheen element entirely. The CSS
animations in `globals.css` are separately guarded by a media query.

### `zen-status.tsx` — what "working" says

"Thinking…" says nothing about a retail system. Before the first tool call the
status rotates through POS vocabulary every 2.4s ("Reading the shelves",
"Pulling the day book", "Reconciling the till"). Once a tool is actually running
the rotation freezes and the exact action shows instead ("Scanning inventory",
"Totalling the takings", "Ranking best sellers").

`TOOL_LINES` must have an entry per tool — its keys are matched against the tool
names in `tools.ts`, and an unlisted tool falls back to its raw camelCase name,
which looks unfinished. Both lists are currently 41 and in sync; if you add a
tool, add its line. To check:

```bash
grep -oE "^    [a-zA-Z]+: tool\(" src/app/api/chat/tools.ts | sed 's/[ :]//g;s/tool(//' | sort > /tmp/a
grep -oE "^  [a-zA-Z]+: '" src/components/ai-insights/zen-status.tsx | sed "s/[ :']//g" | sort > /tmp/b
comm -3 /tmp/a /tmp/b   # empty means in sync
```

### `markdown.tsx` — why replies were showing raw `**bold**`

The model emits `**bold**`, `-` bullets and occasional tables. The old page
rendered message text in a `whitespace-pre-wrap` div, so all of that markup
showed literally — that is the unformatted output the revamp was for.

Text now goes through `react-markdown` + `remark-gfm`. Element styles are
written out rather than using `@tailwindcss/typography`'s `prose`: prose imposes
its own font sizes and vertical rhythm, which fights the narrow chat column.

### `tool-renderer.tsx` — generative UI

`ToolResult` dispatches on `output.type`, so a tool controls its own rendering
by what it returns:

| `type` | renders |
|---|---|
| `PRODUCT_LIST` | product card grid, with totals when the tool supplies them |
| `PRODUCT_DETAIL` | one product large, with its photo at a size worth looking at |
| `PRODUCT_PICKER` | "Which one did you mean?" — cards with a % match badge |
| `METRICS` | stat tiles |
| `TABLE` | scrollable table |
| `CHART` | line / bar / pie, plus highlight tiles, a note and deep-links |
| `LINK` | a single tap-through button into an app page, with the walk-up `note` |
| `CUSTOMER_LIST` | customer cards — initials, spend, loyalty points, last-seen |
| `WALKTHROUGH` | numbered steps for a screen, tips, and the page link at the end |
| `PROPOSAL` | approve / reject card |
| anything else | nothing — the model summarises it in prose |

That last row is the failure mode to watch. A tool that returns a bare object
with no `type` renders as **nothing at all** — the model paraphrases it and the
owner sees prose where a card belongs. `queryCustomer` shipped that way. Every
tool now emits a type; check it stays that way:

```bash
grep -oE "type: '[A-Z_]+'" src/app/api/chat/tools.ts | sort -u        # emitted
grep -oE "case '[A-Z_]+':" src/components/ai-insights/tool-renderer.tsx | sort -u
```

The same silent-discard trap applies one level down, to *fields*: a tool can
send `sellingAtALoss` or `lifetimeValue` and the card will drop it without a
word if there is no line rendering it. Three separate fields were being
discarded that way. When you add a summary field to a tool, add the line that
shows it.

A negative number in a `TABLE` renders red. That is load-bearing rather than
decorative — an item selling below cost is exactly what "which products are
quietly losing me money" is asking for, and it used to render in the same grey
as everything else. It also means percent and money columns must be sent as
**numbers**, not pre-formatted `"${n}%"` strings; `getMarginAnalysis` sent
`Margin` as a string and its losses could not be highlighted.

`ChartCard` is one component for every chart: the **tool** owns the shape via
`chartKind`, `xKey` and a `series[]` of numeric keys with labels and formats.
That is why sales trends, peak hours, category splits and the daily report all
render from one place. Its optional `highlights`, `note` and `links` fields are
what make `getDailyReport` a report rather than just a bar chart — its takings,
profit and debt figures ride in `highlights`, so dropping that block silently
loses the numbers the owner asked for.

`ProductCard` mirrors the POS product card: same 96px contained image area,
`Package` placeholder, tinted stock badges, price bottom-left and stock
bottom-right. It adds a **Negative stock** badge, because the AI surfaces
oversold items that the POS grid never shows.

Cards render extra per-tool facts (`daysOfCover`, `capitalTiedUp`,
`daysRemaining`) only when the tool attached them, so one card component serves
valuation, coverage and expiry results without branching per tool.

## The injection filter has to survive a Nigerian product catalogue

`INJECTION_PATTERNS` in `route.ts` scans the latest user message and returns a
hard 400 on a match. There is no soft path — a false positive accuses a
shopkeeper of hacking mid-sale and gives them no way round it. So every pattern
has to be checked in **both** directions, and two shipped wrong:

- `/DAN/` — unanchored and case-sensitive, so it blocked every owner stocking
  **DANGOTE** cement, sugar, flour or salt. That is not an edge case in this
  market; it is the biggest FMCG brand in the country. Now `/\bDAN\s+mode\b/i`.
- `/ignore (all |previous |above |prior )?instructions/` — the alternation
  permitted exactly **one** adjective, so "ignore all previous instructions",
  the single most common injection string there is, sailed straight through.
  Adjectives stack; the pattern now allows a bounded run of them.

Also fixed: `/forget (what|everything|all|your|the)/` matched "forget the
discount, record it as cash" — ordinary POS correction phrasing.

Before changing a pattern, run it against both lists — brand names and real
correction phrasing on one side, actual attack strings on the other. Extract the
patterns from the file rather than retyping them, or the test proves nothing
about what ships:

```bash
node -e "
const src=require('fs').readFileSync('src/app/api/chat/route.ts','utf8');
const body=src.match(/const INJECTION_PATTERNS = \[([\s\S]*?)\n\];/)[1];
const P=body.split('\n').map(l=>l.trim())
  .filter(l=>l.startsWith('/') && !l.startsWith('//') && l.endsWith(','))
  .map(l=>l.replace(/,\$/,''))
  .map(s=>{const i=s.lastIndexOf('/');return new RegExp(s.slice(1,i),s.slice(i+1));});
console.log('patterns:',P.length);   // sanity-check this is ~13, not 0
"
```

That count check matters: a comment line starting with `//` parses as a regex
with junk flags, and a filter that silently extracts zero patterns passes every
test.

## Writes: why the server never writes

Zen AI has no write path on the server. A `propose*` tool returns a `PROPOSAL`
card and nothing else; the write happens on the client, through
`addToQueue`, only after the owner taps Approve.

That is deliberate. `addToQueue` in `pos-context.tsx` is the **single** write
path in the app, and it is the only thing that enforces RBAC, injects
`activeBranchId`, survives offline, and keeps the SQLite mirror in step. A
direct `updateDoc` from the chat page — which is what was there before — skips
all four. If you are tempted to have a tool write directly, that is the reason
not to.

### `proposal-guard.ts` — the model's output is untrusted input

Every proposal is re-validated on the client at the moment Approve is tapped,
against live POS-context records. The system prompt is a request, not a
constraint; an injected instruction inside a product name or a hallucinated
`productId` produces a card that looks perfectly ordinary.

Two things this catches that the server cannot:

- **Staleness.** The model read stock a minute ago; a cashier has sold three
  since. Approving "set stock to 12" on stale data silently reverses that sale.
  Drift tolerance is **zero** — a mismatch is refused with the live figure named,
  not quietly applied.
- **Existence.** A hallucinated id is refused rather than written.

`buildSaleFromProposal` mirrors `sales/pos/review/page.tsx` rather than trusting
the model's arithmetic. **Prices, tax and totals are all recomputed from the
master product records** — the model's figures decide *what* to sell, never *for
how much*. It also re-checks stock per line (overselling is refused), validates
the payment method against the same four the POS page accepts, and enforces
operating hours: `preventSalesOutsideHours` is a hard stop for non-admins, and
otherwise the receipt carries `flagged` so the sale still surfaces in reports.

Two traps worth naming, because both fail silently rather than loudly:

- **`businessId` must be passed in separately.** `businessData` comes from
  `docSnap.data()`, which carries no `id`. Reading `business.id` writes the
  receipt with `businessId: undefined`, and it then vanishes from every list
  that filters on it.
- **The queue payload keys are not uniform.** `update-customer` reads
  `payload.id`; `update-product` reads `payload.productId` and `payload.values`.
  Getting this wrong throws at *sync* time, not at approval time, so the card
  says it worked.

Anything refused returns plain-language text that goes straight into a toast, so
the owner learns why rather than watching a silent no-op.

## Deep links are allow-listed server-side

`linkToPage` refuses anything not starting with a single `/` (so no `//host`
protocol-relative escape and no external URLs) and then checks the path against
`APP_ROUTES` — a 29-entry table of the real pages under `src/app/(app)`. The
model supplies the label; it does not get to supply an arbitrary destination.

`/onboarding` is deliberately **not** in the table. It exists, but it is a
pre-setup flow, not somewhere to send an owner who is already trading.

**A near miss walks up rather than failing.** The model will hallucinate routes
that sound right — `/inventory/import` is the one that shipped broken — so an
unknown path drops its last segment until it finds a real page, and returns
`{ href, note, redirectedFrom }`. The `note` explains the swap ("bulk import is
a dialog on Inventory, not its own page") and `LinkCard` renders it. It used to
return an error string, which the model then read out loud, twice, and followed
with a working button — the whole answer read as a malfunction.

If you add a page under `src/app/(app)`, add it to `APP_ROUTES` or the model
cannot link to it. To find gaps:

```bash
find "src/app/(app)" -name page.tsx | sed 's|src/app/(app)||;s|/page.tsx||' \
  | grep -v '\[' | sort -u    # compare against the APP_ROUTES Set
```

`/ai-insights?q=...` opens the chat with that question already asked — the
use-cases page links its examples that way. The param is stripped with
`router.replace` immediately after sending, or a refresh re-asks the question
and burns another quota unit.

## The use-cases page

`/ai-insights/use-cases` is grouped by the question the owner has ("what am I
about to run out of?"), not by tool name — a list of 41 camelCase identifiers
tells nobody what to type. Every example is a link into `/ai-insights?q=…`, so
it asks for real.

The "uses" tile reads `aiToolUsageCounts` on the business document, which
`onFinish` in `route.ts` increments per tool call via dotted field paths. Tool
names are matched against `/^[A-Za-z]+$/` first — a dot in a key would write a
nested field instead of the counter.

Keep the page honest. A capability listed there that no tool backs is worse than
one left out: the owner asks, Zen AI cannot, and they stop trusting the rest of
the page.

## Disambiguation is a UI loop, not a prompt trick

The system prompt tells the model to call `findSimilarProducts` when it is not
certain which product the owner means, and **not** to guess between similar
names. That tool returns `PRODUCT_PICKER`, the page renders tappable cards, and
`handlePick` auto-submits `I mean "<name>" (SKU <sku>).` on the owner's behalf.

The SKU matters — it is what makes the model's next lookup exact instead of
another fuzzy match. Do not drop it to make the message read more naturally.

## Message layout

- **User prompts**: right-aligned, warm gray bubble (`bg-stone-100`, stone
  border), `text-sm`, no avatar. Deliberately smaller than the reply.
- **Replies**: left-aligned, no bubble, markdown-rendered, with the `ZenMark`
  avatar in a white circle.
- The mark animates **only on the reply currently streaming** — `streaming` is
  `isLoading && !isUser && i === messages.length - 1`. Animating every mark in
  the transcript makes the whole thread look busy.
- A `.zen-caret` block sits at the end of streaming text.

The system prompt tells the model **not to re-list rows that a tool already
rendered** — the cards are on screen, so repeating them as prose duplicates
everything. It should interpret instead: what stands out, what to do about it.
If replies start echoing table contents, that instruction is what regressed.
