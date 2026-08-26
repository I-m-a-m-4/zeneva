import io

# ── keys ──────────────────────────────────────────────────────────────────────
p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

def add_after(anchor, block):
    global s
    a = anchor.replace('\n', NL)
    assert s.count(a) == 1, 'anchor: %r' % anchor[:70]
    s = s.replace(a, a + block.replace('\n', NL))

# The team subtitle was assembled as `${n} ${n === 1 ? 'person' : 'people'}` plus an
# optional `, plus sales with no recorded author` clause. Four whole keys instead: rule 1 —
# a translator cannot move a clause the caller splices in, and no other language puts the
# number, the noun and the trailing clause in that order.
if 'spTitleSolo' not in s:
    add_after("    spNoAuthor: 'Recorded before sales carried an author',\n",
              "    spTitleSolo: 'Till activity',\n"
              "    spTitleTeam: 'Team performance',\n"
              "    spSubtitleSolo: 'What went through the till in this period.',\n"
              "    spSubtitleTeam_one: 'Who rang up what in this period — {count} person.',\n"
              "    spSubtitleTeam_other: 'Who rang up what in this period — {count} people.',\n"
              "    spSubtitleTeamPlus_one:\n"
              "      'Who rang up what in this period — {count} person, plus sales with no recorded author.',\n"
              "    spSubtitleTeamPlus_other:\n"
              "      'Who rang up what in this period — {count} people, plus sales with no recorded author.',\n")

if 'cpOther' not in s:
    add_after("    cpSubtitle: 'Which parts of the catalogue earn — by revenue, with margin beside it.',\n",
              "    /*\n"
              "     * `foldTail` in reports-aggregates.ts used to hardcode the folded row's label. It now\n"
              "     * takes it as an argument so the pure module stays language-free — see the note there.\n"
              "     */\n"
              "    cpOther: 'Other ({count})',\n"
              "    cpFoldedTail:\n"
              "      '{total} categories sold; the chart folds the smallest {folded} into “Other”.',\n"
              "    cpMarginUnknownPartial:\n"
              "      'Cost price missing on {pct}% of units sold — margin unknown, not zero',\n"
              "    cpMarginUnknownNone: 'No cost prices recorded — margin unknown, not zero',\n")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('keys added')


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

# ── foldTail takes its label ───────────────────────────────────────────────────
wire('src/lib/reports-aggregates.ts', [
    ('export function foldTail(rows: CategoryStat[], keep: number): CategoryStat[] {\n'
     '  if (rows.length <= keep) return rows;\n'
     '  const head = rows.slice(0, keep);\n'
     '  const tail = rows.slice(keep);\n'
     '  const other: CategoryStat = {\n'
     '    category: `Other (${tail.length})`,',
     '/**\n'
     ' * Folds everything past `keep` into one row.\n'
     ' *\n'
     " * `otherLabel` is passed in rather than built here: this module is pure and has no `t`,\n"
     ' * and the folded row is drawn on the chart axis, so a hardcoded "Other" was the one\n'
     ' * English word left on a translated panel. The caller knows the tail count before\n'
     ' * calling (`rows.length - keep`), so it can format the whole label itself.\n'
     ' */\n'
     'export function foldTail(\n'
     '  rows: CategoryStat[],\n'
     '  keep: number,\n'
     '  otherLabel?: string,\n'
     '): CategoryStat[] {\n'
     '  if (rows.length <= keep) return rows;\n'
     '  const head = rows.slice(0, keep);\n'
     '  const tail = rows.slice(keep);\n'
     '  const other: CategoryStat = {\n'
     '    category: otherLabel ?? `Other (${tail.length})`,'),
])

R = 'src/components/reports/'

# ── Team performance ──────────────────────────────────────────────────────────
wire(R + 'staff-performance.tsx', [
    ("const chartConfig = {\n"
     "  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },\n"
     "} satisfies ChartConfig;\n\n",
     ""),
    ("}: StaffPerformanceProps) {\n"
     "  const stats = React.useMemo(() => aggregateStaff(receipts, users), [receipts, users]);",
     "}: StaffPerformanceProps) {\n"
     "  const { t } = useI18n();\n"
     "  // Inside the component: the series label is translated and there is no `t` at module scope.\n"
     "  const chartConfig = {\n"
     "    revenue: { label: t('reports.colRevenue'), color: 'hsl(var(--primary))' },\n"
     "  } satisfies ChartConfig;\n"
     "  const stats = React.useMemo(() => aggregateStaff(receipts, users), [receipts, users]);"),
    ("          {solo ? 'Till activity' : 'Team performance'}",
     "          {solo ? t('reports.spTitleSolo') : t('reports.spTitleTeam')}"),
    ("          {solo\n"
     "            ? 'What went through the till in this period.'\n"
     "            : `Who rang up what in this period — ${attributed.length} ${attributed.length === 1 ? 'person' : 'people'}${unattributed ? ', plus sales with no recorded author' : ''}.`}",
     "          {solo\n"
     "            ? t('reports.spSubtitleSolo')\n"
     "            : t(unattributed ? 'reports.spSubtitleTeamPlus' : 'reports.spSubtitleTeam', {\n"
     "                count: attributed.length,\n"
     "              })}"),
    ("                        Revenue:{' '}", "                        {t('reports.revenueColon')}{' '}"),
    ('<TableHead>Member</TableHead>', "<TableHead>{t('reports.colMember')}</TableHead>"),
    ('<TableHead className="text-end">Sales</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colSales')}</TableHead>"),
    ('<TableHead className="text-end">Revenue</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colRevenue')}</TableHead>"),
    ('<TableHead className="text-end">Share</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colShare')}</TableHead>"),
    ('<TableHead className="hidden text-end sm:table-cell">Avg basket</TableHead>',
     "<TableHead className=\"hidden text-end sm:table-cell\">{t('reports.spAvgBasket')}</TableHead>"),
    ('<TableHead className="hidden text-end md:table-cell">Items / sale</TableHead>',
     "<TableHead className=\"hidden text-end md:table-cell\">{t('reports.spItemsPerSale')}</TableHead>"),
    ('<TableHead className="hidden text-end md:table-cell">Discounted</TableHead>',
     "<TableHead className=\"hidden text-end md:table-cell\">{t('reports.spDiscounted')}</TableHead>"),
    ('<TableHead className="hidden text-end lg:table-cell">Price overrides</TableHead>',
     "<TableHead className=\"hidden text-end lg:table-cell\">{t('reports.spPriceOverrides')}</TableHead>"),
    ("                          Recorded before sales carried an author",
     "                          {t('reports.spNoAuthor')}"),
    ("              These are activity figures, not a verdict. Discounts and price overrides\n"
     "              are often exactly what a good salesperson should be doing — a high figure\n"
     "              is a reason to ask, not a reason to suspect. Revenue is the receipt total,\n"
     "              so the rows here add up to the shop&apos;s revenue for the period.",
     "              {t('reports.spFootnote')}"),
    ("              Run the loss-prevention scan in the audit log",
     "              {t('reports.spRunScan')}"),
], "import { cn } from '@/lib/utils';")

# ── Category performance ──────────────────────────────────────────────────────
wire(R + 'category-performance.tsx', [
    ("const chartConfig = {\n"
     "  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },\n"
     "} satisfies ChartConfig;\n\n",
     ""),
    ("}: CategoryPerformanceProps) {\n"
     "  const money = (n: number) =>",
     "}: CategoryPerformanceProps) {\n"
     "  const { t } = useI18n();\n"
     "  // Inside the component: the series label is translated and there is no `t` at module scope.\n"
     "  const chartConfig = {\n"
     "    revenue: { label: t('reports.colRevenue'), color: 'hsl(var(--primary))' },\n"
     "  } satisfies ChartConfig;\n"
     "  const money = (n: number) =>"),
    ("      chartRows: foldTail(all, CHART_ROWS),",
     "      chartRows: foldTail(\n"
     "        all,\n"
     "        CHART_ROWS,\n"
     "        t('reports.cpOther', { count: Math.max(0, all.length - CHART_ROWS) }),\n"
     "      ),"),
    ("  }, [receipts, previousReceipts, products]);",
     "  }, [receipts, previousReceipts, products, t]);"),
    ("          <Layers className=\"h-5 w-5 text-primary\" />\n"
     "          Category performance",
     "          <Layers className=\"h-5 w-5 text-primary\" />\n"
     "          {t('reports.cpTitle')}"),
    ("          Which parts of the catalogue earn — by revenue, with margin beside it.\n"
     "          {rows.length > CHART_ROWS\n"
     "            ? ` ${rows.length} categories sold; the chart folds the smallest ${rows.length - CHART_ROWS} into “Other”.`\n"
     "            : ''}",
     "          {t('reports.cpSubtitle')}\n"
     "          {rows.length > CHART_ROWS\n"
     "            ? ` ${t('reports.cpFoldedTail', {\n"
     "                total: rows.length,\n"
     "                folded: rows.length - CHART_ROWS,\n"
     "              })}`\n"
     "            : ''}"),
    ("                        Revenue:{' '}", "                        {t('reports.revenueColon')}{' '}"),
    ('<TableHead>Category</TableHead>', "<TableHead>{t('inventory.category')}</TableHead>"),
    ('<TableHead className="text-end">Revenue</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colRevenue')}</TableHead>"),
    ('<TableHead className="text-end">Share</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colShare')}</TableHead>"),
    ('<TableHead className="text-end">Margin</TableHead>',
     "<TableHead className=\"text-end\">{t('reports.colMargin')}</TableHead>"),
    ('<TableHead className="hidden text-end sm:table-cell">Units</TableHead>',
     "<TableHead className=\"hidden text-end sm:table-cell\">{t('reports.colUnits')}</TableHead>"),
    ('<TableHead className="hidden text-end md:table-cell">vs previous</TableHead>',
     "<TableHead className=\"hidden text-end md:table-cell\">{t('reports.cpVsPrevious')}</TableHead>"),
    ("                        {c.items} {c.items === 1 ? 'item' : 'items'}",
     "                        {t('common.items', { count: c.items })}"),
    ("                            c.costCoverage > 0\n"
     "                              ? `Cost price missing on ${Math.round((1 - c.costCoverage) * 100)}% of units sold — margin unknown, not zero`\n"
     "                              : 'No cost prices recorded — margin unknown, not zero'",
     "                            c.costCoverage > 0\n"
     "                              ? t('reports.cpMarginUnknownPartial', {\n"
     "                                  pct: Math.round((1 - c.costCoverage) * 100),\n"
     "                                })\n"
     "                              : t('reports.cpMarginUnknownNone')"),
    ("                            new\n", "                            {t('reports.cpNew')}\n"),
    ("                            flat\n", "                            {t('reports.cpFlat')}\n"),
    ("          Revenue here is the sum of price × quantity on each line, so it excludes tax\n"
     "          and is gross of receipt-level discounts — it will not match the Revenue card\n"
     "          above exactly, which is the till total. Shares add to 100% within this panel.",
     "          {t('reports.cpFootnote')}"),
], "import { cn } from '@/lib/utils';")

print('group D done')
