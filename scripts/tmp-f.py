import io

# ── keys ──────────────────────────────────────────────────────────────────────
p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

def rep(old, new, n=1):
    global s
    o = old.replace('\n', NL); w = new.replace('\n', NL)
    c = s.count(o)
    assert c == n, 'en.ts: expected %d got %d for %r' % (n, c, old[:70])
    s = s.replace(o, w)

# Three bare-word keys drafted before the panel was wired, replaced by interpolated ones.
# `'Level'` + a number, `'pts'` after a number and `'days recorded'` after a number all
# assume the English order and leave the translator no way to move the digit — which is
# exactly what Arabic and Japanese need to do. Nothing referenced them yet.
if 'brLevelBadge' not in s:
    rep("    brPts: 'pts',\n", "    brPlusPts: '+{count} pts',\n")
    rep("    brLevel: 'Level',\n",
        "    brLevelBadge: 'Level {index}',\n"
        "    brLevelUp: 'Level {index} — {name}',\n"
        "    brNotRated: 'Not rated yet',\n"
        "    brToNextTier: '{points} to {name}',\n"
        "    brTopTier: 'Top tier held',\n"
        "    brNothingYet: 'Nothing to work with yet.',\n"
        "    brNothingLeft: 'Nothing left on the table. Keep selling.',\n"
        "    brHintWithMedian: '{hint} · platform median {median}',\n"
        "    brClaimPrivate:\n"
        "      'Built from your receipts. Nothing is sent anywhere or shown to anyone else.',\n"
        "    brClaimPriced: 'Every opportunity is priced from your own sales, never a projection.',\n"
        "    brClaimReversible: 'You can switch it off again in Settings at any time.',\n")
    rep("    brDaysRecorded: 'days recorded',\n",
        "    brDaysRecorded_one: '{count} day recorded',\n"
        "    brDaysRecorded_other: '{count} days recorded',\n"
        "    brScoredOnLast: 'scored on the last {days} days of sales',\n")
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('rating keys reshaped')


def wire(path, edits, n_import_after=None):
    s = io.open(path, encoding='utf-8', newline='').read()
    NL = '\r\n' if '\r\n' in s else '\n'
    def sub(old, new, n=1):
        nonlocal s
        o = old.replace('\n', NL); w = new.replace('\n', NL)
        c = s.count(o)
        assert c == n, '%s: expected %d got %d for: %r' % (path, n, c, old[:90])
        s = s.replace(o, w)
    if n_import_after and "from '@/context/i18n-context'" not in s:
        sub(n_import_after, n_import_after + "\nimport { useI18n } from '@/context/i18n-context';")
    for e in edits:
        sub(*e)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('wired', path)

R = 'src/components/reports/'

# ── Margin leaks ──────────────────────────────────────────────────────────────
# The two `${n === 1 ? 'item has' : 'items have'}` sentences collapse into one `t()` each:
# that is what the `_one`/`_other` pairs are for. `mlAcross` keeps the inline
# `<strong>{money}</strong>` beside it rather than becoming one interpolated sentence —
# the bold figure is the point of the line, and `translate` returns a string, so a single
# key would lose it.
wire(R + 'margin-leaks.tsx', [
    ("}: MarginLeaksPanelProps) {\n"
     "  const money = (n: number) =>",
     "}: MarginLeaksPanelProps) {\n"
     "  const { t } = useI18n();\n"
     "  const money = (n: number) =>"),
    ("            <TrendingDown className=\"h-5 w-5 text-primary\" />\n"
     "            Margin leaks\n",
     "            <TrendingDown className=\"h-5 w-5 text-primary\" />\n"
     "            {t('reports.mlTitle')}\n"),
    ("          <CardDescription>\n"
     "            No items sold below cost, no manual price overrides and no discounts in this\n"
     "            period.\n"
     "            {leaks.uncostedItems > 0 && (\n"
     "              <>\n"
     "                {' '}\n"
     "                {leaks.uncostedItems}{' '}\n"
     "                {leaks.uncostedItems === 1 ? 'item has' : 'items have'} no cost price, so\n"
     "                below-cost selling could not be checked for{' '}\n"
     "                {leaks.uncostedItems === 1 ? 'it' : 'them'}.\n"
     "              </>\n"
     "            )}\n"
     "          </CardDescription>",
     "          <CardDescription>\n"
     "            {t('reports.mlCleanBody')}\n"
     "            {leaks.uncostedItems > 0 &&\n"
     "              ` ${t('reports.mlCleanUncosted', { count: leaks.uncostedItems })}`}\n"
     "          </CardDescription>"),
    ("          <TrendingDown className=\"h-5 w-5 text-primary\" />\n"
     "          Margin leaks\n",
     "          <TrendingDown className=\"h-5 w-5 text-primary\" />\n"
     "          {t('reports.mlTitle')}\n"),
    ("        <CardDescription>\n"
     "          Money that left without a decision behind it.\n"
     "          {totalLeak > 0 && (\n"
     "            <>\n"
     "              {' '}\n"
     "              <strong className=\"text-foreground\">{money(totalLeak)}</strong> across\n"
     "              below-cost sales and manual price overrides in this period.\n"
     "            </>\n"
     "          )}\n"
     "        </CardDescription>",
     "        <CardDescription>\n"
     "          {t('reports.mlSubtitle')}\n"
     "          {totalLeak > 0 && (\n"
     "            <>\n"
     "              {' '}\n"
     "              <strong className=\"text-foreground\">{money(totalLeak)}</strong>{' '}\n"
     "              {t('reports.mlAcross')}\n"
     "            </>\n"
     "          )}\n"
     "        </CardDescription>"),
    ("                <AlertTriangle className=\"h-4 w-4 text-destructive\" />\n"
     "                Sold below cost\n",
     "                <AlertTriangle className=\"h-4 w-4 text-destructive\" />\n"
     "                {t('reports.mlSoldBelowCost')}\n"),
    ("                    <TableHead>Item</TableHead>\n"
     "                    <TableHead className=\"text-end\">Units</TableHead>\n"
     "                    <TableHead className=\"text-end\">Sold for</TableHead>\n"
     "                    <TableHead className=\"text-end\">Cost</TableHead>\n"
     "                    <TableHead className=\"text-end\">Lost</TableHead>",
     "                    <TableHead>{t('reports.colItem')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.colUnits')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.mlColSoldFor')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.colCost')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.mlColLost')}</TableHead>"),
    ("                <Tag className=\"h-4 w-4 text-amber-600 dark:text-amber-400\" />\n"
     "                Given away by manual price overrides\n",
     "                <Tag className=\"h-4 w-4 text-amber-600 dark:text-amber-400\" />\n"
     "                {t('reports.mlOverridesTitle')}\n"),
    ("                    <TableHead>Item</TableHead>\n"
     "                    <TableHead className=\"text-end\">Units at a typed price</TableHead>\n"
     "                    <TableHead className=\"text-end\">Below shelf price by</TableHead>",
     "                    <TableHead>{t('reports.colItem')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.mlColUnitsTyped')}</TableHead>\n"
     "                    <TableHead className=\"text-end\">{t('reports.mlColBelowShelf')}</TableHead>"),
    ("              Measured against what the shelf price was at the moment of sale, not\n"
     "              today&apos;s price — so an honest price rise never shows up here. Overrides are\n"
     "              often legitimate; this is the bill for them, not an allegation.",
     "              {t('reports.mlOverridesFootnote')}"),
    ("              <PercentCircle className=\"h-4 w-4 text-muted-foreground\" />\n"
     "              Discounts given\n",
     "              <PercentCircle className=\"h-4 w-4 text-muted-foreground\" />\n"
     "              {t('reports.mlDiscountsTitle')}\n"),
    ("              Across {leaks.discountedSales.toLocaleString()}{' '}\n"
     "              {leaks.discountedSales === 1 ? 'sale' : 'sales'}. Discounts are recorded on\n"
     "              the sale as a whole, with no per-item breakdown, so this figure is\n"
     "              deliberately not split across products — doing so would be guesswork. Who\n"
     "              applied them is in the Team performance panel below.",
     "              {t('reports.mlDiscountsFootnote', {\n"
     "                count: leaks.discountedSales,\n"
     "                formatted: leaks.discountedSales.toLocaleString(),\n"
     "              })}"),
    ("            {leaks.uncostedItems} {leaks.uncostedItems === 1 ? 'item' : 'items'} sold in\n"
     "            this period {leaks.uncostedItems === 1 ? 'has' : 'have'} no cost price, so{' '}\n"
     "            {leaks.uncostedItems === 1 ? 'it was' : 'they were'} left out of the\n"
     "            below-cost check entirely rather than assumed profitable. Adding cost prices\n"
     "            in Inventory is what makes that check complete.",
     "            {t('reports.mlUncostedFootnote', { count: leaks.uncostedItems })}"),
], "import { aggregateItems, findMarginLeaks } from '@/lib/reports-aggregates';")

# ── Business rating panel ─────────────────────────────────────────────────────
# Five of this file's sub-components render copy, so five of them take their own `useI18n()`
# rather than having `t` threaded down as a prop.
#
# NOT translated here, and it is the largest remaining hole in this tab: every pillar label,
# hint and fix label, every opportunity label and detail, and the six tier names all come
# out of `src/lib/business-rating.ts` — a pure module whose English is also what Zen AI's
# `getBusinessRating` tool sends the model. Translating it in place would change what the
# model reads; the fix is the `foldTail`/`BulkSkip.code` pattern (a key alongside the prose),
# across ~50 return sites plus `rating-insights.ts` and four other surfaces. Tracked
# separately, not folded into this batch.
wire(R + 'business-rating-panel.tsx', [
    ("function DeltaChip({ delta }: { delta: number | null }) {\n"
     "  if (delta === null) {\n"
     "    return <span className=\"text-xs font-medium text-muted-foreground\">First reading</span>;",
     "function DeltaChip({ delta }: { delta: number | null }) {\n"
     "  const { t } = useI18n();\n"
     "  if (delta === null) {\n"
     "    return (\n"
     "      <span className=\"text-xs font-medium text-muted-foreground\">\n"
     "        {t('reports.brFirstReading')}\n"
     "      </span>\n"
     "    );"),
    ("  onToggle: () => void;\n"
     "}) {\n"
     "  const t = tone(pillar.score);",
     "  onToggle: () => void;\n"
     "}) {\n"
     "  const { t: translate } = useI18n();\n"
     "  const t = tone(pillar.score);"),
    ("        title={\n"
     "          showMedian\n"
     "            ? `${pillar.hint} · platform median ${median}`\n"
     "            : pillar.hint\n"
     "        }",
     "        title={\n"
     "          showMedian\n"
     "            ? translate('reports.brHintWithMedian', { hint: pillar.hint, median })\n"
     "            : pillar.hint\n"
     "        }"),
    ("            <span className=\"shrink-0 text-[11px] font-bold tabular-nums text-primary\">\n"
     "              +{pillar.headroom} pts\n"
     "            </span>",
     "            <span className=\"shrink-0 text-[11px] font-bold tabular-nums text-primary\">\n"
     "              {translate('reports.brPlusPts', { count: pillar.headroom })}\n"
     "            </span>"),
    ("  onDecline: () => void;\n"
     "}) {\n"
     "  if (!neverAsked) {",
     "  onDecline: () => void;\n"
     "}) {\n"
     "  const { t } = useI18n();\n"
     "  if (!neverAsked) {"),
    ("          <p className=\"text-sm font-semibold text-foreground\">Business rating is off</p>\n"
     "          <p className=\"mx-auto max-w-sm text-xs text-muted-foreground\">\n"
     "            Nothing has been deleted. Turn it back on any time in Settings → General and your\n"
     "            score, streak and history pick up where they left off.\n"
     "          </p>",
     "          <p className=\"text-sm font-semibold text-foreground\">{t('reports.brOffTitle')}</p>\n"
     "          <p className=\"mx-auto max-w-sm text-xs text-muted-foreground\">\n"
     "            {t('reports.brOffBody')}\n"
     "          </p>"),
    ("          <Link href=\"/settings\">Open Settings</Link>",
     "          <Link href=\"/settings\">{t('reports.brOpenSettings')}</Link>"),
    ("          <h3 className=\"text-lg font-bold text-foreground sm:text-xl\">\n"
     "            Want to see where your money is leaking?\n"
     "          </h3>\n"
     "          <p className=\"mx-auto max-w-md text-sm leading-relaxed text-muted-foreground\">\n"
     "            Business rating reads your own sales and scores the four things that multiply\n"
     "            revenue — your margin, your average basket, how often buyers come back, and your\n"
     "            momentum. Then it names the single biggest opportunity you are missing, in{' '}\n"
     "            {/* Currency, not points. Same promise the panel itself keeps. */}\n"
     "            money.\n"
     "          </p>",
     "          <h3 className=\"text-lg font-bold text-foreground sm:text-xl\">\n"
     "            {t('reports.brPitchTitle')}\n"
     "          </h3>\n"
     "          {/* Ends on \"in money\" on purpose — currency, not points. The note lives on\n"
     "              `brPitchBody` in en.ts so a translator sees it. */}\n"
     "          <p className=\"mx-auto max-w-md text-sm leading-relaxed text-muted-foreground\">\n"
     "            {t('reports.brPitchBody')}\n"
     "          </p>"),
    ("          {[\n"
     "            'Built from your receipts. Nothing is sent anywhere or shown to anyone else.',\n"
     "            'Every opportunity is priced from your own sales, never a projection.',\n"
     "            'You can switch it off again in Settings at any time.',\n"
     "          ].map((line) => (",
     "          {[\n"
     "            t('reports.brClaimPrivate'),\n"
     "            t('reports.brClaimPriced'),\n"
     "            t('reports.brClaimReversible'),\n"
     "          ].map((line) => ("),
    ("            {isSaving ? <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" /> : null}\n"
     "            Turn on business rating\n"
     "          </Button>",
     "            {isSaving ? <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" /> : null}\n"
     "            {t('reports.brTurnOn')}\n"
     "          </Button>"),
    ("            No thanks\n          </Button>", "            {t('reports.brNoThanks')}\n          </Button>"),
    ("export default function BusinessRatingPanel() {\n"
     "  const { currencySymbol, triggerConfetti, business } = usePOS();",
     "export default function BusinessRatingPanel() {\n"
     "  const { t } = useI18n();\n"
     "  const { currencySymbol, triggerConfetti, business } = usePOS();"),
    ("            <p className=\"text-sm font-bold text-foreground\">\n"
     "              Level {leveledUpTo.index} — {leveledUpTo.name}\n"
     "            </p>\n"
     "            <p className=\"text-xs text-muted-foreground\">A tier you have never held before. Well done.</p>",
     "            <p className=\"text-sm font-bold text-foreground\">\n"
     "              {t('reports.brLevelUp', { index: leveledUpTo.index, name: leveledUpTo.name })}\n"
     "            </p>\n"
     "            <p className=\"text-xs text-muted-foreground\">{t('reports.brNewTier')}</p>"),
    ("              {score === null ? 'Not rated yet' : tier.name}",
     "              {score === null ? t('reports.brNotRated') : tier.name}"),
    ("                Level {tier.index}\n              </span>",
     "                {t('reports.brLevelBadge', { index: tier.index })}\n              </span>"),
    ("                <Sparkles className=\"h-3 w-3\" />\n"
     "                New best\n",
     "                <Sparkles className=\"h-3 w-3\" />\n"
     "                {t('reports.brNewBest')}\n"),
    ("            <p className=\"text-sm text-muted-foreground\">Record your first sale to get a rating.</p>",
     "            <p className=\"text-sm text-muted-foreground\">{t('reports.brNeedFirstSale')}</p>"),
    ("                {tier.next ? `${toNextTier} to ${tier.next.name}` : 'Top tier held'}",
     "                {tier.next\n"
     "                  ? t('reports.brToNextTier', { points: toNextTier, name: tier.next.name })\n"
     "                  : t('reports.brTopTier')}"),
    ("              On the table\n            </span>", "              {t('reports.brOnTheTable')}\n            </span>"),
    ("              {score === null ? 'Nothing to work with yet.' : 'Nothing left on the table. Keep selling.'}",
     "              {score === null ? t('reports.brNothingYet') : t('reports.brNothingLeft')}"),
    ("<span className=\"text-[11px] font-bold uppercase tracking-widest text-muted-foreground\">Your best</span>",
     "<span className=\"text-[11px] font-bold uppercase tracking-widest text-muted-foreground\">\n"
     "            {t('reports.brYourBest')}\n"
     "          </span>"),
    ("                {history.length} days recorded\n"
     "                {facts.truncated && ` · scored on the last ${facts.coveredDays} days of sales`}",
     "                {t('reports.brDaysRecorded', { count: history.length })}\n"
     "                {facts.truncated &&\n"
     "                  ` · ${t('reports.brScoredOnLast', { days: facts.coveredDays })}`}"),
    ("            <p className=\"text-xs text-muted-foreground\">Check back tomorrow to see the trend.</p>",
     "            <p className=\"text-xs text-muted-foreground\">{t('reports.brCheckBack')}</p>"),
    ("          Badges\n          <ArrowUpRight", "          {t('reports.brBadges')}\n          <ArrowUpRight"),
], "import { cn } from '@/lib/utils';")

print('group E done')
