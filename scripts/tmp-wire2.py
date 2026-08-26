import io, sys

p = sys.argv[1]
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

def sub(old, new, n=1):
    global s
    o = old.replace('\n', NL); w = new.replace('\n', NL)
    c = s.count(o)
    assert c == n, 'expected %d got %d for: %r' % (n, c, old[:90])
    s = s.replace(o, w)

# t in scope for the page body
sub("    const { activeBranchId } = useBranch();\n"
    "    const dashboardRef = React.useRef<HTMLDivElement>(null);",
    "    const { activeBranchId } = useBranch();\n"
    "    const { t } = useI18n();\n"
    "    const dashboardRef = React.useRef<HTMLDivElement>(null);")

# the CSV callback closes over t
sub("}, [deepReceipts, products, users, finalReportData, comparison, currencySymbol, business, date, toast]);",
    "}, [deepReceipts, products, users, finalReportData, comparison, currencySymbol, business, date, toast, t]);")

# tabs
sub('<TabsTrigger value="analytics" className="text-sm font-semibold w-full">Analytics Dashboard</TabsTrigger>',
    '<TabsTrigger value="analytics" className="text-sm font-semibold w-full">{t(\'reports.tabAnalytics\')}</TabsTrigger>')
sub('<TabsTrigger value="profit-loss" className="text-sm font-semibold w-full">Profit & Loss</TabsTrigger>',
    '<TabsTrigger value="profit-loss" className="text-sm font-semibold w-full">{t(\'reports.tabProfitLoss\')}</TabsTrigger>')
sub('<TabsTrigger value="daily-sales" className="text-sm font-semibold w-full">Daily Sales Items</TabsTrigger>',
    '<TabsTrigger value="daily-sales" className="text-sm font-semibold w-full">{t(\'reports.tabDailySales\')}</TabsTrigger>')
sub('<TabsTrigger value="business-rating" className="text-sm font-semibold w-full">Business Rating</TabsTrigger>',
    '<TabsTrigger value="business-rating" className="text-sm font-semibold w-full">{t(\'reports.tabBusinessRating\')}</TabsTrigger>')

sub('<span>Updating metrics...</span>', "<span>{t('reports.updatingMetrics')}</span>")
sub('<Download className="mr-2 h-4 w-4" />Export Report',
    "<Download className=\"mr-2 h-4 w-4\" />{t('reports.exportReport')}")
sub('                                    Export data as CSV', "                                    {t('reports.exportCsv')}")
sub('                                    Export as High-Res Image', "                                    {t('reports.exportImage')}")
sub('                                    Export as PDF (Print)', "                                    {t('reports.exportPdf')}")
sub('<span className="text-sm font-medium text-muted-foreground">Loading analytical dashboard...</span>',
    "<span className=\"text-sm font-medium text-muted-foreground\">{t('reports.loadingDashboard')}</span>")

# KPI cards — (title literal, description literal, key stem)
KPIS = [
    ('Revenue', 'Total earnings', 'kpiRevenue'),
    ('Net Cost', 'Total cost of sales', 'kpiNetCost'),
    ('Net Profit', 'Earnings minus costs', 'kpiNetProfit'),
    ('Product Revenue', 'Revenue from physical goods', 'kpiProductRevenue'),
    ('Service Revenue', 'Revenue from services', 'kpiServiceRevenue'),
    ('Sales', 'Total transactions', 'kpiSales'),
    ('Unique Products', 'Different products sold', 'kpiUniqueProducts'),
    ('Units Sold', 'Total pieces moved', 'kpiUnitsSold'),
    ('Daily Velocity', 'Sales per day', 'kpiDailyVelocity'),
    ('Daily Revenue', 'Average revenue per day', 'kpiDailyRevenue'),
    ('Catalog Size', 'Total unique products in inventory', 'kpiCatalogSize'),
    ('Avg Order', 'Revenue per sale', 'kpiAvgOrder'),
]
for title, desc, stem in KPIS:
    sub('title="%s"' % title, "title={t('reports.%s')}" % stem)
    sub('description="%s"' % desc, "description={t('reports.%sHint')}" % stem)

sub('title="Customers"', "title={t('reports.kpiCustomers')}")
sub("""                                    description={
                                        finalReportData
                                            ? `${finalReportData.buyersInRange.toLocaleString()} bought in this period`
                                            : 'Total customers on file'
                                    }""",
    """                                    description={
                                        finalReportData
                                            ? t('reports.kpiCustomersBought', {
                                                count: finalReportData.buyersInRange,
                                                formatted: finalReportData.buyersInRange.toLocaleString(),
                                            })
                                            : t('reports.kpiCustomersHint')
                                    }""")

# FeatureGate pitches
GATES = [
    ('Advanced Visual Analytics',
     'Unlock deep dive visual charts, sales trends, and profit margins to truly understand your business.',
     'gateVisualName', 'gateVisualBody'),
    ('Customer Intelligence & Inventory Velocity',
     'Unlock advanced CRM analytics, customer lifetime value, and optimize stock levels with data-driven ABC analysis.',
     'gateCustomerName', 'gateCustomerBody'),
    ('Profit & Loss Statement',
     "Unlock detailed profit & loss statements to analyze your store's margins.",
     'gateProfitLossName', 'gateProfitLossBody'),
]
for name, body, nk, bk in GATES:
    sub('featureName="%s"' % name, "featureName={t('reports.%s')}" % nk)
    sub('featureDescription="%s"' % body, "featureDescription={t('reports.%s')}" % bk)

# The Daily Sales gate reuses the tab label rather than a fourth near-identical key.
sub('featureName="Daily Sales Items"', "featureName={t('reports.tabDailySales')}")
sub('featureDescription="Unlock daily item sales tracking and inventory audit logs."',
    "featureDescription={t('reports.gateDailySalesBody')}")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('wrote', p)
