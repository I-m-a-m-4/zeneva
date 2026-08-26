import io

# ── en.ts touch-ups ───────────────────────────────────────────────────────────
p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

# `hhSalesLower` was drafted for "{day} — {n} sales" before `hhPeakLine` carried the whole
# line. A key nothing reads still costs ten translations, so it goes.
dead = "    hhSalesLower: 'sales',\n".replace('\n', NL)
if dead in s:
    s = s.replace(dead, '')
    print('removed dead hhSalesLower')

if 'caAnonymousBuyer' not in s:
    a = "    caTitle: 'Customer Intelligence',\n".replace('\n', NL)
    assert s.count(a) == 1
    s = s.replace(a, a + "    caAnonymousBuyer: 'Anonymous Buyer',\n".replace('\n', NL))
    print('added caAnonymousBuyer')

io.open(p, 'w', encoding='utf-8', newline='').write(s)


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

# ── Market Basket Analysis ────────────────────────────────────────────────────
wire(R + 'basket-analysis.tsx', [
    ("    const [searchTerm, setSearchTerm] = React.useState('');",
     "    const { t } = useI18n();\n    const [searchTerm, setSearchTerm] = React.useState('');"),
    ('                        <ShoppingBag className="h-5 w-5 text-primary" />\n'
     '                        Market Basket Analysis',
     '                        <ShoppingBag className="h-5 w-5 text-primary" />\n'
     "                        {t('reports.baTitle')}"),
    ('<CardDescription>Discover which products are frequently bought together.</CardDescription>',
     "<CardDescription>{t('reports.baSubtitle')}</CardDescription>"),
    ('                            placeholder="Search products..."',
     "                            placeholder={t('inventory.searchProducts')}"),
    ('                                Use these insights to create **bundle deals** or optimize your store layout for cross-selling.',
     "                                {t('reports.baHint')}"),
    ('uppercase font-semibold mt-1">Joint Sales</p>',
     "uppercase font-semibold mt-1\">{t('reports.baJointSales')}</p>"),
    # Both arms are string literals inside a JSX expression, so the guard's text-node scan
    # never saw them. Found by reading the file; noted in scripts/check-i18n.ts.
    ('                            {searchTerm \n'
     '                                ? "No product pairings found matching your search." \n'
     '                                : "Not enough multi-item sales yet to detect significant product pairings."\n'
     '                            }',
     "                            {searchTerm\n"
     "                                ? t('reports.baEmptySearch')\n"
     "                                : t('reports.baEmptyNoPairs')}"),
    ('<p className="text-xs mt-1">Only sets with more than 1 joint sale are shown.</p>',
     "<p className=\"text-xs mt-1\">{t('reports.baFootnote')}</p>"),
], "import { Input } from '@/components/ui/input';")

# ── Business Traffic Insights ─────────────────────────────────────────────────
# `DAYS` was a module-scope English array feeding both the peak-day sentence and the chart's
# X axis, where `.substring(0, 3)` abbreviated it. Slicing three characters off a Japanese or
# Arabic day name cuts it mid-word, so the axis now reads its own short keys and the category
# axis keys on the numeric day index — which stays unique whatever the translation says.
wire(R + 'hourly-sales-heatmap.tsx', [
    ("const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];",
     "const DAY_KEYS = [\n"
     "    'reports.hhDaySunday',\n"
     "    'reports.hhDayMonday',\n"
     "    'reports.hhDayTuesday',\n"
     "    'reports.hhDayWednesday',\n"
     "    'reports.hhDayThursday',\n"
     "    'reports.hhDayFriday',\n"
     "    'reports.hhDaySaturday',\n"
     "];\n"
     "const DAY_SHORT_KEYS = [\n"
     "    'reports.hhDayShortSunday',\n"
     "    'reports.hhDayShortMonday',\n"
     "    'reports.hhDayShortTuesday',\n"
     "    'reports.hhDayShortWednesday',\n"
     "    'reports.hhDayShortThursday',\n"
     "    'reports.hhDayShortFriday',\n"
     "    'reports.hhDayShortSaturday',\n"
     "];"),
    ("    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');",
     "    const { t } = useI18n();\n"
     "    const [timeframe, setTimeframe] = React.useState<Timeframe>('all');"),
    ("        return Object.entries(days).map(([day, count]) => ({\n"
     "            day: parseInt(day),\n"
     "            name: DAYS[parseInt(day)],\n"
     "            count\n"
     "        }));\n"
     "    }, [filteredReceipts]);",
     "        return Object.entries(days).map(([day, count]) => ({\n"
     "            day: parseInt(day),\n"
     "            name: t(DAY_KEYS[parseInt(day)]),\n"
     "            count\n"
     "        }));\n"
     "    }, [filteredReceipts, t]);"),
    ('                        <TrendingUp className="h-5 w-5 text-primary" />\n'
     '                        Business Traffic Insights',
     '                        <TrendingUp className="h-5 w-5 text-primary" />\n'
     "                        {t('reports.hhTitle')}"),
    ('<CardDescription>Peak times and days for your business.</CardDescription>',
     "<CardDescription>{t('reports.hhSubtitle')}</CardDescription>"),
    ('<TabsTrigger value="hourly" className="text-xs">Peak Hours</TabsTrigger>',
     "<TabsTrigger value=\"hourly\" className=\"text-xs\">{t('reports.hhPeakHours')}</TabsTrigger>"),
    ('<TabsTrigger value="daily" className="text-xs">Peak Days</TabsTrigger>',
     "<TabsTrigger value=\"daily\" className=\"text-xs\">{t('reports.hhPeakDays')}</TabsTrigger>"),
    ('font-bold">Peak Traffic Window</p>', "font-bold\">{t('reports.hhPeakWindow')}</p>"),
    ('<p className="text-sm font-bold">{peakHour.display} — {peakHour.count} sales</p>',
     "<p className=\"text-sm font-bold\">\n"
     "                                        {t('reports.hhPeakLine', { label: peakHour.display, count: peakHour.count })}\n"
     "                                    </p>"),
    ('font-bold">Busiest Day of Week</p>', "font-bold\">{t('reports.hhBusiestDay')}</p>"),
    ('<p className="text-sm font-bold">{peakDay.name} — {peakDay.count} sales</p>',
     "<p className=\"text-sm font-bold\">\n"
     "                                        {t('reports.hhPeakLine', { label: peakDay.name, count: peakDay.count })}\n"
     "                                    </p>"),
    ('<p className="text-primary">{data.count} Sales</p>',
     "<p className=\"text-primary\">{t('reports.hhSalesCount', { count: data.count })}</p>"),
    ('<p className="text-emerald-500">{data.count} Sales</p>',
     "<p className=\"text-emerald-500\">{t('reports.hhSalesCount', { count: data.count })}</p>"),
    ('                                        dataKey="name" \n'
     '                                        tickFormatter={(val) => val.substring(0, 3)}',
     '                                        dataKey="day"\n'
     "                                        tickFormatter={(d) => t(DAY_SHORT_KEYS[Number(d)])}"),
], "import { safeToDate } from '@/lib/utils';")

# ── Customer Intelligence ─────────────────────────────────────────────────────
wire(R + 'customer-analytics.tsx', [
    ("  const [timeframe, setTimeframe] = React.useState<Timeframe>('90d');",
     "  const { t } = useI18n();\n  const [timeframe, setTimeframe] = React.useState<Timeframe>('90d');"),
    ("                name: receipt.customer.name || 'Anonymous Buyer',\n"
     "                email: receipt.customer.email || 'N/A',",
     "                name: receipt.customer.name || t('reports.caAnonymousBuyer'),\n"
     "                email: receipt.customer.email || t('inventory.notAvailable'),"),
    ("  }, [customers, receipts, totalBusinessCustomers]);",
     "  }, [customers, receipts, totalBusinessCustomers, t]);"),
    ('                <Users className="h-5 w-5 text-primary" />\n'
     '                Customer Intelligence',
     '                <Users className="h-5 w-5 text-primary" />\n'
     "                {t('reports.caTitle')}"),
    ('                Gain deeper insights into your customer base growth and retention.',
     "                {t('reports.caSubtitle')}"),
    ('<CardDescription>Total Customers</CardDescription>',
     "<CardDescription>{t('reports.caTotalCustomers')}</CardDescription>"),
    ('<CardDescription>New Customers (Last 30d)</CardDescription>',
     "<CardDescription>{t('reports.caNewLast30')}</CardDescription>"),
    ('<CardDescription>Returning Customers</CardDescription>',
     "<CardDescription>{t('reports.caReturning')}</CardDescription>"),
    ("                            {analyticsData.totalUniqueBuyers > 0 \n"
     "                                ? ((analyticsData.returningCustomers / analyticsData.totalUniqueBuyers) * 100).toFixed(1) \n"
     "                                : '0'}% retention rate",
     "                            {t('reports.caRetentionRate', {\n"
     "                                pct:\n"
     "                                    analyticsData.totalUniqueBuyers > 0\n"
     "                                        ? ((analyticsData.returningCustomers / analyticsData.totalUniqueBuyers) * 100).toFixed(1)\n"
     "                                        : '0',\n"
     "                            })}"),
    ('<h4 className="font-semibold text-sm">Customer Acquisition</h4>',
     "<h4 className=\"font-semibold text-sm\">{t('reports.caAcquisition')}</h4>"),
    ('config={{ count: { label: "New Customers", color: "hsl(var(--primary))" } }}',
     "config={{ count: { label: t('reports.caNewCustomers'), color: \"hsl(var(--primary))\" } }}"),
    ('                                    No acquisition data for this period.',
     "                                    {t('reports.caNoAcquisition')}"),
    ('<h4 className="font-semibold mb-2 text-sm">Top 5 Customers by Spending</h4>',
     "<h4 className=\"font-semibold mb-2 text-sm\">{t('reports.caTop5')}</h4>"),
    ('<TableHead>Customer</TableHead>', "<TableHead>{t('reports.colCustomer')}</TableHead>"),
    ('<TableHead className="text-right">Total Spent</TableHead>',
     "<TableHead className=\"text-right\">{t('reports.colTotalSpent')}</TableHead>"),
], "import { safeToDate } from '@/lib/utils';")

print('group C part 2 done')
