import io

p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

# The benchmark footnote carries an optional ", as of <date>" clause. Two whole keys rather
# than one key plus an interpolated fragment: rule 1 of the extraction — a clause spliced in
# by the caller cannot be moved by a translator, and half the eleven put the date first.
if 'pcFootnoteAsOf' not in s:
    anchor = ("    pcFootnote:\n"
              "      'Median of {shops} Zeneva shops with {sales}+ sales in the last {days} days. Shops are never named and no shop can see yours.',\n").replace('\n', NL)
    assert s.count(anchor) == 1, 'pcFootnote anchor'
    s = s.replace(anchor, anchor + (
        "    pcFootnoteAsOf:\n"
        "      'Median of {shops} Zeneva shops with {sales}+ sales in the last {days} days, as of {asOf}. Shops are never named and no shop can see yours.',\n"
    ).replace('\n', NL))
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('pcFootnoteAsOf added')


def wire(path, edits, n_import_after):
    s = io.open(path, encoding='utf-8', newline='').read()
    NL = '\r\n' if '\r\n' in s else '\n'
    def sub(old, new, n=1):
        nonlocal s
        o = old.replace('\n', NL); w = new.replace('\n', NL)
        c = s.count(o)
        assert c == n, '%s: expected %d got %d for: %r' % (path, n, c, old[:90])
        s = s.replace(o, w)
    if "from '@/context/i18n-context'" not in s:
        sub(n_import_after, n_import_after + "\nimport { useI18n } from '@/context/i18n-context';")
    for e in edits:
        sub(*e)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('wired', path)

R = 'src/components/reports/'

# ── How you compare ───────────────────────────────────────────────────────────
wire(R + 'peer-compare.tsx', [
    ("  const reduce = useReducedMotion();",
     "  const { t } = useI18n();\n  const reduce = useReducedMotion();"),
    ('          <p className="text-sm font-semibold text-foreground">No comparison available yet</p>',
     "          <p className=\"text-sm font-semibold text-foreground\">{t('reports.pcEmptyTitle')}</p>"),
    ('            Zeneva compares you against the median shop once enough shops have traded to make the figure\n'
     '            meaningful. Nothing here is ever estimated.',
     "            {t('reports.pcEmptyBody')}"),
    ('          How you compare', "          {t('reports.pcTitle')}"),
    ('<span className="text-xs font-medium text-muted-foreground">vs median shop</span>',
     "<span className=\"text-xs font-medium text-muted-foreground\">{t('reports.pcVsMedianShop')}</span>"),
    ("        Median of {benchmark.cohort} Zeneva shops with {benchmark.minSales}+ sales in the last{' '}\n"
     "        {benchmark.windowDays} days\n"
     "        {benchmarkDate ? `, as of ${benchmarkDate}` : ''}. Shops are never named and no shop can see yours.",
     "        {benchmarkDate\n"
     "          ? t('reports.pcFootnoteAsOf', {\n"
     "              shops: benchmark.cohort,\n"
     "              sales: benchmark.minSales,\n"
     "              days: benchmark.windowDays,\n"
     "              asOf: benchmarkDate,\n"
     "            })\n"
     "          : t('reports.pcFootnote', {\n"
     "              shops: benchmark.cohort,\n"
     "              sales: benchmark.minSales,\n"
     "              days: benchmark.windowDays,\n"
     "            })}"),
], "import { cn } from '@/lib/utils';")

# ── Revenue Forecast ──────────────────────────────────────────────────────────
wire(R + 'revenue-forecast-card.tsx', [
    ("export default function RevenueForecastCard({ receipts, currencySymbol }: RevenueForecastCardProps) {",
     "export default function RevenueForecastCard({ receipts, currencySymbol }: RevenueForecastCardProps) {\n    const { t } = useI18n();"),
    ('                <p>Not enough data to generate a forecast.</p>',
     "                <p>{t('reports.rfNotEnough')}</p>"),
    ('                    <Sparkles className="h-5 w-5 text-indigo-500" /> Revenue Forecast',
     "                    <Sparkles className=\"h-5 w-5 text-indigo-500\" /> {t('reports.rfTitle')}"),
    ('<CardDescription>AI-powered 30-day projection based on your current run rate.</CardDescription>',
     "<CardDescription>{t('reports.rfSubtitle')}</CardDescription>"),
    ('tracking-wider">30-Day Projection</p>', "tracking-wider\">{t('reports.rfProjection')}</p>"),
    ('<span>{Math.abs(trendPercent).toFixed(1)}% vs previous 7 days</span>',
     "<span>{t('reports.rfVsPrevious7', { pct: Math.abs(trendPercent).toFixed(1) })}</span>"),
    ('<p className="text-xs text-muted-foreground">Current Daily Run Rate</p>',
     "<p className=\"text-xs text-muted-foreground\">{t('reports.rfRunRate')}</p>"),
    ("{dailyRunRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} / day</p>",
     "{dailyRunRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t('reports.rfPerDay')}</p>"),
    ('                            historical: { label: "Historical", color: "hsl(var(--primary))" },\n'
     '                            projected: { label: "Forecast", color: "hsl(var(--chart-3))" }',
     "                            historical: { label: t('reports.rfHistorical'), color: \"hsl(var(--primary))\" },\n"
     "                            projected: { label: t('reports.rfForecast'), color: \"hsl(var(--chart-3))\" }"),
], "import { safeToDate } from '@/lib/utils';")

print('group C part 1 done')
