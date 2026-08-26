import io

p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'
print('line endings:', 'CRLF' if NL == '\r\n' else 'LF')

BLOCK = r"""
    /*
     * ── Shared vocabulary for the 22 panels ──
     *
     * A column header that appears in more than one panel gets one key here rather than one
     * per panel, so the same column cannot end up worded two ways in Korean. Six words are
     * read from other namespaces instead of being restated, because those catalogs already
     * say exactly them in all eleven languages: `common.price`, `common.total`,
     * `inventory.category`, `inventory.searchProducts`, `dashboard.totalRevenue` and
     * `dashboard.unitsSold`.
     *
     * `common.share` is deliberately **not** reused. There it is the verb (share a receipt);
     * here it is a noun (share of revenue). Most of the eleven use different words, and
     * reusing it would put "Send" at the head of a percentage column.
     */
    colItem: 'Item',
    colProduct: 'Product',
    colCustomer: 'Customer',
    colClass: 'Class',
    colUnits: 'Units',
    colQtySold: 'Qty Sold',
    colOrders: 'Orders',
    colRevenue: 'Revenue',
    colProfit: 'Profit',
    colMargin: 'Margin',
    colShare: 'Share',
    colSales: 'Sales',
    colCost: 'Cost',
    colGrossProfit: 'Gross Profit',
    colCogs: 'COGS',
    colTotalSpent: 'Total Spent',
    colReceipt: 'Receipt',
    colDateTime: 'Date & Time',
    colImage: 'Image',
    colMember: 'Member',
    revenueColon: 'Revenue:',

    // Export toasts shared by the panels that can export on their own.
    exportSuccessful: 'Export Successful',
    generatingPdf: 'Generating PDF...',
    generatingPdfBody: 'Please wait while we create your document.',
    noDataTitle: 'No Data',
    noDataToExport: 'No items available to export.',

    // Payment Method Reconciliation
    pmTitle: 'Payment Method Reconciliation',
    pmSubtitle: 'Breakdown of revenue collection by payment channel.',
    pmTransactions: 'Transactions',

    // Top Customers
    tcTitle: 'Top Customers',
    tcSubtitle: 'Customers with the highest spending in this period.',
    tcEmptyTitle: 'No Customer Data',
    tcEmptyBody: 'Link sales to customers to see this report.',

    // Sales Over Time
    sotTitle: 'Sales Over Time',
    sotSubtitle: 'Revenue performance trends.',
    sotEmpty:
      'No sales were recorded in this period. Once your first sale is made, this chart will automatically activate.',

    // Dead Stock Analysis
    dsTitle: 'Dead Stock Analysis',
    dsSubtitle: 'Items with no sales in 60+ days (Locked Capital).',
    dsLockedCapital: 'Estimated Locked Capital',
    dsUnitsLeft: 'units left',
    dsSku: 'SKU:',
    dsValueLocked: 'Value Locked',
    dsViewInventory: 'View full inventory',
    dsEmpty: 'No significant dead stock detected. Your inventory is moving well!',

    // Inventory Depletion Warning
    depTitle: 'Inventory Depletion Warning',
    depSubtitle:
      'Predictive alerts for products likely to run out soon based on their 30-day sales velocity.',
    depStock: 'Stock:',
    depSelling: 'Selling ~',
    depPerDay: '/day',

    // Insight of the day
    iotdTitle: 'Insight of the day',
    iotdVsMedian: 'vs median',
    iotdRotation: '1 of {total} · new one tomorrow',
    iotdAtStake: 'At stake',

    /*
     * Date range presets. These are the only strings in the batch a translator must keep
     * short — they sit in a dropdown beside a calendar, and the trigger shows the chosen one.
     */
    drToday: 'Today',
    drYesterday: 'Yesterday',
    drLast7: 'Last 7 Days',
    drLast30: 'Last 30 Days',
    drThisMonth: 'This Month',
    drLastMonth: 'Last Month',
    drAllTime: 'All Time',

    // Profit & Loss chart (the title reuses `tabProfitLoss`, the same two words)
    plcSubtitle: 'Financial health overview.',
    plcTotalCost: 'Total Cost',
    plcEmpty:
      "No sales recorded in this period. Add 'Cost Prices' to your products to track true profitability.",

    // How you compare — the anonymous peer benchmark
    pcTitle: 'How you compare',
    pcEmptyTitle: 'No comparison available yet',
    pcEmptyBody:
      'Zeneva compares you against the median shop once enough shops have traded to make the figure meaningful. Nothing here is ever estimated.',
    pcVsMedianShop: 'vs median shop',
    pcFootnote:
      'Median of {shops} Zeneva shops with {sales}+ sales in the last {days} days. Shops are never named and no shop can see yours.',

    // Revenue Forecast
    rfTitle: 'Revenue Forecast',
    rfSubtitle: 'AI-powered 30-day projection based on your current run rate.',
    rfNotEnough: 'Not enough data to generate a forecast.',
    rfProjection: '30-Day Projection',
    rfVsPrevious7: '{pct}% vs previous 7 days',
    rfRunRate: 'Current Daily Run Rate',
    rfPerDay: '/ day',
    rfHistorical: 'Historical',
    rfForecast: 'Forecast',

    // Market Basket Analysis
    baTitle: 'Market Basket Analysis',
    baSubtitle: 'Discover which products are frequently bought together.',
    baHint:
      'Use these insights to create **bundle deals** or optimize your store layout for cross-selling.',
    baJointSales: 'Joint Sales',
    baFootnote: 'Only sets with more than 1 joint sale are shown.',

    // Business Traffic Insights (hourly heatmap)
    hhTitle: 'Business Traffic Insights',
    hhSubtitle: 'Peak times and days for your business.',
    hhPeakHours: 'Peak Hours',
    hhPeakDays: 'Peak Days',
    hhPeakWindow: 'Peak Traffic Window',
    hhSalesLower: 'sales',
    hhBusiestDay: 'Busiest Day of Week',

    // Customer Intelligence
    caTitle: 'Customer Intelligence',
    caSubtitle: 'Gain deeper insights into your customer base growth and retention.',
    caTotalCustomers: 'Total Customers',
    caNewLast30: 'New Customers (Last 30d)',
    caReturning: 'Returning Customers',
    caRetentionRate: '{pct}% retention rate',
    caAcquisition: 'Customer Acquisition',
    caNewCustomers: 'New Customers',
    caNoAcquisition: 'No acquisition data for this period.',
    caTop5: 'Top 5 Customers by Spending',

    // Team performance
    spAvgBasket: 'Avg basket',
    spItemsPerSale: 'Items / sale',
    spDiscounted: 'Discounted',
    spPriceOverrides: 'Price overrides',
    spNoAuthor: 'Recorded before sales carried an author',
    spFootnote:
      "These are activity figures, not a verdict. Discounts and price overrides are often exactly what a good salesperson should be doing — a high figure is a reason to ask, not a reason to suspect. Revenue is the receipt total, so the rows here add up to the shop's revenue for the period.",
    spRunScan: 'Run the loss-prevention scan in the audit log',

    // Category performance
    cpTitle: 'Category performance',
    cpSubtitle: 'Which parts of the catalogue earn — by revenue, with margin beside it.',
    cpVsPrevious: 'vs previous',
    cpNew: 'new',
    cpFlat: 'flat',
    cpFootnote:
      'Revenue here is the sum of price × quantity on each line, so it excludes tax and is gross of receipt-level discounts — it will not match the Revenue card above exactly, which is the till total. Shares add to 100% within this panel.',

    // Inventory Velocity & ABC Analysis
    abcTitle: 'Inventory Velocity & ABC Analysis',
    abcSubtitle: 'Categorizes products based on their revenue contribution.',
    abcAllProducts: 'All Products ({count})',
    abcClassA: 'Class A ({count})',
    abcClassB: 'Class B ({count})',
    abcClassC: 'Class C ({count})',
    abcEmptyTitle: 'Not Enough Sales Data',
    abcEmptyBody: 'This report will be generated once you have more sales records to analyze.',
    abcProductInsight: 'Product Insight',
    abcInsightSubtitle: 'Detailed performance metrics for the selected period.',
    abcRevShare: 'Rev Share',
    abcCumulative: '(cum.)',
    abcRecommendation: 'Strategic Recommendation',
    abcClose: 'Close Analysis',
    abcNoProducts: 'No products found.',

    /*
     * Margin leaks. Five of these are `_one`/`_other` pairs because the English is assembled
     * from `x === 1 ? 'item has' : 'items have'` fragments interleaved with the figure — the
     * exact shape rule 1 of the extraction forbids, since no other language splits a verb
     * from its subject in the same place.
     */
    mlTitle: 'Margin leaks',
    mlSubtitle: 'Money that left without a decision behind it.',
    mlCleanBody:
      'No items sold below cost, no manual price overrides and no discounts in this period.',
    mlCleanUncosted_one:
      '{count} item has no cost price, so below-cost selling could not be checked for it.',
    mlCleanUncosted_other:
      '{count} items have no cost price, so below-cost selling could not be checked for them.',
    mlAcross: 'across below-cost sales and manual price overrides in this period.',
    mlSoldBelowCost: 'Sold below cost',
    mlColSoldFor: 'Sold for',
    mlColLost: 'Lost',
    mlOverridesTitle: 'Given away by manual price overrides',
    mlColUnitsTyped: 'Units at a typed price',
    mlColBelowShelf: 'Below shelf price by',
    mlOverridesFootnote:
      "Measured against what the shelf price was at the moment of sale, not today's price — so an honest price rise never shows up here. Overrides are often legitimate; this is the bill for them, not an allegation.",
    mlDiscountsTitle: 'Discounts given',
    mlDiscountsFootnote_one:
      'Across {formatted} sale. Discounts are recorded on the sale as a whole, with no per-item breakdown, so this figure is deliberately not split across products — doing so would be guesswork. Who applied them is in the Team performance panel below.',
    mlDiscountsFootnote_other:
      'Across {formatted} sales. Discounts are recorded on the sale as a whole, with no per-item breakdown, so this figure is deliberately not split across products — doing so would be guesswork. Who applied them is in the Team performance panel below.',
    mlUncostedFootnote_one:
      '{count} item sold in this period has no cost price, so it was left out of the below-cost check entirely rather than assumed profitable. Adding cost prices in Inventory is what makes that check complete.',
    mlUncostedFootnote_other:
      '{count} items sold in this period have no cost price, so they were left out of the below-cost check entirely rather than assumed profitable. Adding cost prices in Inventory is what makes that check complete.',

    // Business rating panel
    brFirstReading: 'First reading',
    brPts: 'pts',
    brOffTitle: 'Business rating is off',
    brOffBody:
      'Nothing has been deleted. Turn it back on any time in Settings → General and your score, streak and history pick up where they left off.',
    brOpenSettings: 'Open Settings',
    brPitchTitle: 'Want to see where your money is leaking?',
    /*
     * Ends on "in money" on purpose — currency, not points. It is the promise the panel
     * itself keeps, so a translation must not turn it into "in points" or "as a score".
     */
    brPitchBody:
      'Business rating reads your own sales and scores the four things that multiply revenue — your margin, your average basket, how often buyers come back, and your momentum. Then it names the single biggest opportunity you are missing, in money.',
    brTurnOn: 'Turn on business rating',
    brNoThanks: 'No thanks',
    brLevel: 'Level',
    brNewTier: 'A tier you have never held before. Well done.',
    brNewBest: 'New best',
    brNeedFirstSale: 'Record your first sale to get a rating.',
    brOnTheTable: 'On the table',
    brYourBest: 'Your best',
    brDaysRecorded: 'days recorded',
    brCheckBack: 'Check back tomorrow to see the trend.',
    brBadges: 'Badges',

    /*
     * Top items. The product/service split is spelled out rather than interpolated (rule 1):
     * `This chart will highlight your best {noun}` cannot be one key, because the article and
     * the adjective agreement both move with the noun in half of the eleven.
     */
    tiValue: 'Value',
    tiByUnits: 'By units sold',
    tiByRevenue: 'By revenue',
    tiByProfit: 'By profit',
    tiEmptyProducts:
      'This chart will highlight your best products once you start making sales through the POS.',
    tiEmptyServices:
      'This chart will highlight your best services once you start making sales through the POS.',
    tiNoCostProducts:
      'No product in this period has a cost price recorded, so profit cannot be worked out. Add cost prices in Inventory, or rank by units or revenue.',
    tiNoCostServices:
      'No service in this period has a cost price recorded, so profit cannot be worked out. Add cost prices in Inventory, or rank by units or revenue.',
    tiSoldProducts_one: '{formatted} product sold.',
    tiSoldProducts_other: '{formatted} products sold.',
    tiSoldServices_one: '{formatted} service sold.',
    tiSoldServices_other: '{formatted} services sold.',
    tiUncosted_one: '{count} has no cost price, so its profit is unknown rather than zero and it is not charted.',
    tiUncosted_other: '{count} have no cost price, so their profit is unknown rather than zero and they are not charted.',
    tiAtALoss_one: '{count} sold at a loss — see the full list.',
    tiAtALoss_other: '{count} sold at a loss — see the full list.',
    tiNoneProducts: 'No products sold in this period.',
    tiNoneServices: 'No services sold in this period.',
    tiViewAllProducts: 'View all products',
    tiViewAllServices: 'View all services',
    tiDialogTitleProducts: 'All products sold ({count})',
    tiDialogTitleServices: 'All services sold ({count})',
    tiDialogBody:
      'Ranked {measure} for the period selected at the top of the page. Revenue here is line revenue — the sum of price × quantity — so it excludes tax and is gross of any receipt-level discount, and will not exactly match the Revenue figure in the cards above.',
    tiShowingOf: '{shown} of {total}',
    tiExportCsv: 'Export CSV',
    tiNothingMatches: 'Nothing matches “{query}”.',
    tiNoCostRecorded: 'No cost price recorded',
    tiNoCostRecordedFor: '{name}, so profit is unknown — not zero.',

    // Advanced Income Statement
    plsTitle: 'Advanced Income Statement',
    plsSubtitle:
      'Formal, accounting-standard breakdown of revenue, COGS, operating expenses, and net profit.',
    plsExportStatement: 'Export Statement',
    plsExportedBody: 'Advanced Profit & Loss statement exported as PDF.',
    plsGrossRevenue: 'Gross Revenue',
    plsGrossRevenueHint: 'Total sales before deductions',
    plsCogs: 'Cost of Goods Sold (COGS)',
    plsCogsHint: 'Product acquisition costs',
    plsMarginPct: '% Margin',
    plsNetOperatingIncome: 'Net Operating Income',
    plsNetMarginPct: '% Net Margin',
    plsColLineItem: 'Financial Line Item',
    plsColAmount: 'Amount ({symbol})',
    plsColPctGross: '% of Gross Revenue',
    plsGrossSalesRevenue: 'Gross Sales Revenue',
    plsLessDiscounts: 'Less: Discounts & Price Markdowns',
    plsNetSalesRevenue: 'Net Sales Revenue',
    plsTotalCogs: 'Total Cost of Goods Sold',
    plsOperatingExpenses: 'Operating Expenses',
    plsTotalOperatingExpenses: 'Total Operating Expenses',
    plsNetOperatingProfit: 'Net Operating Profit',
    plsHeatmapTitle: 'Category Profitability & Margin Heatmap',
    plsHeatmapSubtitle:
      'Breakdown of net profit contributions and profit margins across product categories.',
    plsProfitMargin: 'Profit Margin',
    plsHeatmapEmpty: 'No sales records available to generate category profitability data.',

    // Daily Sales Items Log
    dsiTitle: 'Daily Sales Items Log',
    dsiSubtitle:
      'Detailed logs of individual product and service items sold on the selected day.',
    dsiExportPdf: 'Export as PDF',
    dsiExportCsv: 'Export as CSV',
    dsiGeneratingBody: 'Please wait while we capture the daily sales table.',
    dsiExportedCsvBody: 'Daily sales items exported as CSV.',
    dsiExportedImageBody: 'Table exported as High-Res Image.',
    dsiExportedPdfBody: 'Table exported as PDF.',
    dsiExportFailed: 'Export Failed',
    dsiExportFailedBody: 'Could not capture the image.',
    dsiCashSales: "Day's Cash Sales",
    dsiCashHint: 'Total physical cash expected in drawer',
    dsiTransfers: 'Expected Bank Transfers',
    dsiTransfersHint: 'Total transfers processed via POS',
    dsiCard: 'Card Transactions',
    dsiCardHint: 'Total POS card payments collected',
    dsiVerified: 'Verified Transfers',
    dsiVerifiedHint: 'Confirmed landing in terminal',
    dsiPickDay: 'Pick a day',
    dsiSearchPlaceholder: 'Search by item name or receipt...',
    dsiAllTypes: 'All Types',
    dsiProductsOnly: 'Products Only',
    dsiServicesOnly: 'Services Only',
    dsiRowsOption: '{count} rows',
    dsiShowing: 'Showing {from}-{to} of {total} item sales',
    dsiEmptyTitle: 'No sales items logged',
    dsiEmptyBody: 'There are no records matching your active filters on this day.',
    dsiPageOf: 'Page {page} of {total}',
    dsiPrevPage: 'Previous Page',
    dsiNextPage: 'Next Page',
"""

anchor = "    gateDailySalesBody: 'Unlock daily item sales tracking and inventory audit logs.',\n".replace('\n', NL)
assert s.count(anchor) == 1, 'anchor not unique'
s = s.replace(anchor, anchor + BLOCK.replace('\n', NL))

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('wrote', p)
