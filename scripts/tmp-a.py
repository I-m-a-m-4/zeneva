import io, sys

def load(p):
    s = io.open(p, encoding='utf-8', newline='').read()
    return s, ('\r\n' if '\r\n' in s else '\n')

def wire(p, edits, n_import_after):
    s, NL = load(p)
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

# ── Payment Method Reconciliation ─────────────────────────────────────────────
wire(R + 'payment-method-analysis.tsx', [
    ("    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');",
     "    const { t } = useI18n();\n    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');"),
    ("                        <PieChartIcon className=\"h-5 w-5 text-primary\" />\n"
     "                        Payment Method Reconciliation",
     "                        <PieChartIcon className=\"h-5 w-5 text-primary\" />\n"
     "                        {t('reports.pmTitle')}"),
    ('<CardDescription>Breakdown of revenue collection by payment channel.</CardDescription>',
     "<CardDescription>{t('reports.pmSubtitle')}</CardDescription>"),
    ('{item.count} Transactions', "{item.count} {t('reports.pmTransactions')}"),
], "import { cn } from '@/lib/utils';")

# ── Top Customers ─────────────────────────────────────────────────────────────
wire(R + 'top-customers-list.tsx', [
    ("  const [timeframe, setTimeframe] = React.useState<Timeframe>('all');",
     "  const { t } = useI18n();\n  const [timeframe, setTimeframe] = React.useState<Timeframe>('all');"),
    ('<CardTitle>Top Customers</CardTitle>', "<CardTitle>{t('reports.tcTitle')}</CardTitle>"),
    ('<CardDescription>Customers with the highest spending in this period.</CardDescription>',
     "<CardDescription>{t('reports.tcSubtitle')}</CardDescription>"),
    ('<p className="font-medium">No Customer Data</p>',
     "<p className=\"font-medium\">{t('reports.tcEmptyTitle')}</p>"),
    ('<p className="text-sm">Link sales to customers to see this report.</p>',
     "<p className=\"text-sm\">{t('reports.tcEmptyBody')}</p>"),
], "import { safeToDate } from '@/lib/utils';")

# ── Sales Over Time ───────────────────────────────────────────────────────────
# chartConfig held the only module-scope literal in this file, so it moves inside the
# component — `t` cannot be reached at module scope.
wire(R + 'sales-over-time-chart.tsx', [
    ('const chartConfig = {\n'
     '  sales: {\n'
     '    label: "Sales",\n'
     '    color: "hsl(var(--primary))",\n'
     '  },\n'
     '} satisfies ChartConfig;\n\n',
     ''),
    ("    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');",
     "    const { t } = useI18n();\n"
     "    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');\n"
     "    // Inside the component because the label is translated; there is no `t` at module scope.\n"
     "    const chartConfig = {\n"
     "      sales: {\n"
     "        label: t('reports.colSales'),\n"
     "        color: \"hsl(var(--primary))\",\n"
     "      },\n"
     "    } satisfies ChartConfig;"),
    ('<CardTitle>Sales Over Time</CardTitle>', "<CardTitle>{t('reports.sotTitle')}</CardTitle>"),
    ('<CardDescription>Revenue performance trends.</CardDescription>',
     "<CardDescription>{t('reports.sotSubtitle')}</CardDescription>"),
    ('<p>No sales were recorded in this period. Once your first sale is made, this chart will automatically activate.</p>',
     "<p>{t('reports.sotEmpty')}</p>"),
], "import { safeToDate } from '@/lib/utils';")

# ── Dead Stock Analysis ───────────────────────────────────────────────────────
wire(R + 'dead-stock-analysis.tsx', [
    ('                    <PackageX className="h-5 w-5 text-destructive" />\n'
     '                    Dead Stock Analysis',
     '                    <PackageX className="h-5 w-5 text-destructive" />\n'
     "                    {t('reports.dsTitle')}"),
    ('<CardDescription>Items with no sales in 60+ days (Locked Capital).</CardDescription>',
     "<CardDescription>{t('reports.dsSubtitle')}</CardDescription>"),
    ('<span className="text-sm font-semibold">Estimated Locked Capital</span>',
     "<span className=\"text-sm font-semibold\">{t('reports.dsLockedCapital')}</span>"),
    ('{product.stock} units left', "{product.stock} {t('reports.dsUnitsLeft')}"),
    ('>SKU: {product.sku}<', ">{t('reports.dsSku')} {product.sku}<"),
    ('>Value Locked</p>', ">{t('reports.dsValueLocked')}</p>"),
    ('                                View full inventory <ArrowRight className="h-3 w-3" />',
     "                                {t('reports.dsViewInventory')} <ArrowRight className=\"h-3 w-3\" />"),
    ('<p className="text-sm">No significant dead stock detected. Your inventory is moving well!</p>',
     "<p className=\"text-sm\">{t('reports.dsEmpty')}</p>"),
], "import { Badge } from '@/components/ui/badge';")

print('group A done')
