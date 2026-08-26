import io

# Two keys the detector never flagged: they live inside a JSX expression ternary, not a text
# node — `{alert.daysRemaining === 0 ? 'Out of Stock' : `Runs out in ...`}`. Found by reading
# the file rather than by scanning it, which is worth remembering about the guard's reach.
p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'
anchor = "    depPerDay: '/day',\n".replace('\n', NL)
assert s.count(anchor) >= 1
s = s if 'depRunsOut_one' in s else s.replace(anchor, anchor + (
    "    depRunsOut_one: 'Runs out in {count} day',\n"
    "    depRunsOut_other: 'Runs out in {count} days',\n").replace('\n', NL))
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('keys added')


def wire(p, edits, n_import_after):
    s = io.open(p, encoding='utf-8', newline='').read()
    NL = '\r\n' if '\r\n' in s else '\n'
    def sub(old, new, n=1):
        nonlocal s
        o = old.replace('\n', NL); w = new.replace('\n', NL)
        c = s.count(o)
        assert c == n, '%s: expected %d got %d for: %r' % (p, n, c, old[:90])
        s = s.replace(o, w)
    if "from '@/context/i18n-context'" not in s:
        sub(n_import_after, n_import_after + "\nimport { useI18n } from '@/context/i18n-context';")
    for e in edits:
        sub(*e)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('wired', p)

R = 'src/components/reports/'

# ── Inventory Depletion Warning (done) ───
_skip = ((R + 'inventory-depletion-card.tsx', [
    ('                    <AlertTriangle className="h-5 w-5" /> Inventory Depletion Warning',
     "                    <AlertTriangle className=\"h-5 w-5\" /> {t('reports.depTitle')}"),
    ('                    Predictive alerts for products likely to run out soon based on their 30-day sales velocity.',
     "                    {t('reports.depSubtitle')}"),
    ('                                        Stock: {alert.currentStock} <ArrowRight className="h-3 w-3 mx-1" /> Selling ~{alert.velocity}/day',
     "                                        {t('reports.depStock')} {alert.currentStock} <ArrowRight className=\"h-3 w-3 mx-1\" /> {t('reports.depSelling')}{alert.velocity}{t('reports.depPerDay')}"),
    ("                                {alert.daysRemaining === 0 ? 'Out of Stock' : `Runs out in ${alert.daysRemaining} ${alert.daysRemaining === 1 ? 'day' : 'days'}`}",
     "                                {alert.daysRemaining === 0\n"
     "                                    ? t('inventory.statusOutOfStock')\n"
     "                                    : t('reports.depRunsOut', { count: alert.daysRemaining })}"),
]), "import { Badge } from '@/components/ui/badge';")

# ── Insight of the day (done) ───
_skip = ((R + 'insight-of-the-day.tsx', [
    ('          {diff > 0 ? `+${diff}` : diff} vs median',
     "          {diff > 0 ? `+${diff}` : diff} {t('reports.iotdVsMedian')}"),
    ('<span className="text-[10px] font-bold uppercase tracking-widest">Insight of the day</span>',
     "<span className=\"text-[10px] font-bold uppercase tracking-widest\">{t('reports.iotdTitle')}</span>"),
    ('                1 of {total} · new one tomorrow',
     "                {t('reports.iotdRotation', { total })}"),
    ('                    At stake', "                    {t('reports.iotdAtStake')}"),
]), "import { cn } from '@/lib/utils';")

# ── Date range presets ────────────────────────────────────────────────────────
wire(R + 'date-range-picker.tsx', [
    ("    const { business } = usePOS();", "    const { business } = usePOS();\n    const { t } = useI18n();"),
    ("{ label: 'Today', range:", "{ label: t('reports.drToday'), range:"),
    ("{ label: 'Yesterday', range:", "{ label: t('reports.drYesterday'), range:"),
    ("{ label: 'Last 7 Days', range:", "{ label: t('reports.drLast7'), range:"),
    ("basePresets.push({ label: 'All Time', range:", "basePresets.push({ label: t('reports.drAllTime'), range:"),
    ("basePresets.push({ label: 'Last 30 Days', range:", "basePresets.push({ label: t('reports.drLast30'), range:"),
    ("{ label: 'This Month', range:", "{ label: t('reports.drThisMonth'), range:"),
    ("{ label: 'Last Month', range:", "{ label: t('reports.drLastMonth'), range:"),
], "import { usePOS } from '@/context/pos-context';")

# ── Profit & Loss chart ───────────────────────────────────────────────────────
wire(R + 'profit-loss-chart.tsx', [
    ('const chartConfig = {\n'
     '  revenue: {\n'
     '    label: "Revenue",\n'
     '    color: "hsl(var(--chart-2))",\n'
     '  },\n'
     '  profit: {\n'
     '    label: "Profit",\n'
     '    color: "hsl(var(--chart-1))",\n'
     '  },\n'
     '  cost: {\n'
     '    label: "Cost",\n'
     '    color: "hsl(var(--chart-5))",\n'
     '  },\n'
     '} satisfies ChartConfig;\n\n',
     ''),
    ("    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');",
     "    const { t } = useI18n();\n"
     "    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');\n"
     "    // Inside the component: the three series labels are translated, and there is no `t`\n"
     "    // at module scope.\n"
     "    const chartConfig = {\n"
     "      revenue: { label: t('reports.colRevenue'), color: \"hsl(var(--chart-2))\" },\n"
     "      profit: { label: t('reports.colProfit'), color: \"hsl(var(--chart-1))\" },\n"
     "      cost: { label: t('reports.colCost'), color: \"hsl(var(--chart-5))\" },\n"
     "    } satisfies ChartConfig;"),
    # The card title is the same two words as the tab that contains it.
    ('<CardTitle>Profit & Loss</CardTitle>', "<CardTitle>{t('reports.tabProfitLoss')}</CardTitle>"),
    ('<CardDescription>Financial health overview.</CardDescription>',
     "<CardDescription>{t('reports.plcSubtitle')}</CardDescription>"),
    ('font-semibold">Total Revenue</p>', "font-semibold\">{t('dashboard.totalRevenue')}</p>"),
    ('font-semibold">Total Cost</p>', "font-semibold\">{t('reports.plcTotalCost')}</p>"),
    ('text-primary">Net Profit</p>', "text-primary\">{t('reports.kpiNetProfit')}</p>"),
    ("<p>No sales recorded in this period. Add 'Cost Prices' to your products to track true profitability.</p>",
     "<p>{t('reports.plcEmpty')}</p>"),
], "import { safeToDate } from '@/lib/utils';")

print('group B done')
