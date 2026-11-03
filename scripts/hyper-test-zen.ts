/**
 * Hyper-testing Suite for Zen AI (105 Prompts)
 * Evaluates intent resolution, accounting logic, follow-ups, and image audits.
 */

import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Prioritize .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else {
  dotenv.config();
}

interface PromptTest {
  id: number;
  category: string;
  prompt: string;
  expectedTools: string[];
  isFollowUp?: boolean;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  description: string;
}

const TESTS: PromptTest[] = [
  // ── 1. Sales, Takings & Revenue (10) ──────────────────────────────────
  { id: 1, category: 'Sales & Revenue', prompt: 'How much did we make today?', expectedTools: ['getSalesMetrics', 'getDailyReport'], description: "Today's sales takings query" },
  { id: 2, category: 'Sales & Revenue', prompt: 'Show me yesterdays revenue and transactions', expectedTools: ['getSalesMetrics', 'getDailyReport'], description: "Yesterday's sales query" },
  { id: 3, category: 'Sales & Revenue', prompt: 'What are our sales for this month so far?', expectedTools: ['getSalesMetrics'], description: 'This month sales query' },
  { id: 4, category: 'Sales & Revenue', prompt: 'Give me the daily report for today close-out', expectedTools: ['getDailyReport', 'getSalesMetrics'], description: 'Daily close-out report card' },
  { id: 5, category: 'Sales & Revenue', prompt: 'how did trading go today', expectedTools: ['getDailyReport', 'getSalesMetrics'], description: 'Trading summary for today' },
  { id: 6, category: 'Sales & Revenue', prompt: 'Compare our sales this week against last week', expectedTools: ['comparePeriods', 'getSalesMetrics', 'getSalesTrend'], description: 'Period-over-period sales comparison' },
  { id: 7, category: 'Sales & Revenue', prompt: 'What are our peak trading hours of the day?', expectedTools: ['getPeakHours'], description: 'Peak trading hours heat map' },
  { id: 8, category: 'Sales & Revenue', prompt: 'Show me the recent 10 transactions recorded', expectedTools: ['getRecentTransactions'], description: 'Recent transactions inquiry' },
  { id: 9, category: 'Sales & Revenue', prompt: 'Plot our sales trend over the last 30 days', expectedTools: ['getSalesTrend', 'getSalesMetrics'], description: 'Sales curve trend inquiry' },
  { id: 10, category: 'Sales & Revenue', prompt: 'What was our total turnover across the last 90 days?', expectedTools: ['getSalesMetrics'], description: 'Quarterly sales volume' },

  // ── 2. Gross Profit vs Net Profit & Expenses (15) ─────────────────────
  { id: 11, category: 'Net Profit & Expenses', prompt: 'cheak how much net profits we made this past week', expectedTools: ['getSalesMetrics'], description: 'Merchant Uv-electric real inquiry: weekly net profit' },
  { id: 12, category: 'Net Profit & Expenses', prompt: 'Can I see our net profit for today after all expenses?', expectedTools: ['getSalesMetrics', 'getDailyReport'], description: "Today's net profit after expenses" },
  { id: 13, category: 'Net Profit & Expenses', prompt: 'What was our gross profit vs net profit this month?', expectedTools: ['getSalesMetrics'], description: 'Gross vs Net profit this month' },
  { id: 14, category: 'Net Profit & Expenses', prompt: 'Show all operating expenses logged for this week', expectedTools: ['queryExpenses'], description: 'Weekly operating expenses list' },
  { id: 15, category: 'Net Profit & Expenses', prompt: 'How much did we spend on diesel, transport and shop overheads this month?', expectedTools: ['queryExpenses'], description: 'Categorized overhead expenses this month' },
  { id: 16, category: 'Net Profit & Expenses', prompt: 'Why is my net profit lower than my gross takings?', expectedTools: ['getSalesMetrics', 'queryExpenses', 'explainHowTo'], description: 'Financial accounting explanation request' },
  { id: 17, category: 'Net Profit & Expenses', prompt: 'Can you show me the total expenses logged for today?', expectedTools: ['queryExpenses'], description: "Today's logged expenses" },
  { id: 18, category: 'Net Profit & Expenses', prompt: 'Break down our gross margins across items sold yesterday', expectedTools: ['getMarginAnalysis', 'getSalesMetrics', 'getDailyReport'], description: 'Gross margin breakdown' },
  { id: 19, category: 'Net Profit & Expenses', prompt: 'What are our total purchases from suppliers this month?', expectedTools: ['queryPurchases'], description: 'Supplier purchases audit' },
  { id: 20, category: 'Net Profit & Expenses', prompt: 'How much was deducted directly from our cash drawer for expenses?', expectedTools: ['queryExpenses'], description: 'Cash drawer expense deductions' },
  { id: 21, category: 'Net Profit & Expenses', prompt: 'Tell me our net profit margin percentage for the last 30 days', expectedTools: ['getSalesMetrics'], description: '30-day net profit margin' },
  { id: 22, category: 'Net Profit & Expenses', prompt: 'can i see the breakdown of how 1,720,000 was gotten as the total net cost of yesterdays sale', expectedTools: ['getMarginAnalysis', 'getSalesMetrics', 'getDailyReport'], description: 'COGS breakdown inquiry from real merchant log' },
  { id: 23, category: 'Net Profit & Expenses', prompt: 'Did we make a profit or loss yesterday after shop running costs?', expectedTools: ['getSalesMetrics', 'getDailyReport'], description: 'Profit/loss determination yesterday' },
  { id: 24, category: 'Net Profit & Expenses', prompt: 'List the largest expenses recorded in the shop', expectedTools: ['queryExpenses'], description: 'Major expense audit' },
  { id: 25, category: 'Net Profit & Expenses', prompt: 'Explain why expenses on the Purchases tab deduct from profit and cash drawer rather than revenue', expectedTools: ['explainHowTo', 'queryExpenses'], description: 'Accounting logic explanation (WhatsApp customer inquiry)' },

  // ── 3. Multi-turn Follow-ups (e.g. "minus expenses") (10) ──────────────
  {
    id: 26, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'cheak how much net profits we made this past week' },
      { role: 'assistant', content: 'Sales for the past 7 days: Revenue ₦12,785,700, Gross Profit ₦506,950 across 31 transactions.' },
    ],
    prompt: 'minus expenses',
    expectedTools: ['queryExpenses', 'getSalesMetrics'],
    description: 'The exact failure case from Uv-electric transcript: "minus expenses"',
  },
  {
    id: 27, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'How much did we make today?' },
      { role: 'assistant', content: "Today's sales total ₦420,000 with gross profit of ₦85,000." },
    ],
    prompt: 'what about expenses today?',
    expectedTools: ['queryExpenses', 'getSalesMetrics', 'getDailyReport'],
    description: 'Follow-up for daily expenses',
  },
  {
    id: 28, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Show me my top 5 selling items this month' },
      { role: 'assistant', content: 'Top items: 1. Choke, 2. Cable 2.5mm, 3. Switch socket, 4. Pop bulb, 5. Breaker.' },
    ],
    prompt: 'which of these have low stock right now?',
    expectedTools: ['getLowStockAlerts', 'queryProducts'],
    description: 'Follow-up checking stock on top items',
  },
  {
    id: 29, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'What is our profit this month?' },
      { role: 'assistant', content: 'This month gross profit is ₦2,100,000 on revenue of ₦18,500,000.' },
    ],
    prompt: 'deduct shop rent and salaries',
    expectedTools: ['queryExpenses', 'getSalesMetrics'],
    description: 'Follow-up deducting capital outflows and payroll',
  },
  {
    id: 30, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'What is our inventory valuation?' },
      { role: 'assistant', content: 'Your inventory is currently valued at ₦28,363,450 retail.' },
    ],
    prompt: 'how much profit will we make when all of it sells?',
    expectedTools: ['getInventoryValuation'],
    description: 'Follow-up on potential inventory profit',
  },
  {
    id: 31, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Show our debtors' },
      { role: 'assistant', content: 'You have 4 unpaid invoices totaling ₦1,250,000.' },
    ],
    prompt: 'who owes the largest amount?',
    expectedTools: ['getUnpaidInvoices', 'queryCustomer'],
    description: 'Follow-up on largest debtor',
  },
  {
    id: 32, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Are there items close to expiring?' },
      { role: 'assistant', content: 'Found 3 items expiring within 30 days.' },
    ],
    prompt: 'can we discount them by 20%?',
    expectedTools: ['proposePriceChange'],
    description: 'Follow-up markdown for expiring items',
  },
  {
    id: 33, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Check our stock of 13amps flush A-range' },
      { role: 'assistant', content: '13amps flush A-range currently has 2,080 units in stock.' },
    ],
    prompt: 'how many units did we sell in the last 7 days?',
    expectedTools: ['getProductDetails', 'getProductStockHistory'],
    description: 'Follow-up product sales velocity',
  },
  {
    id: 34, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Audit my inventory data health' },
      { role: 'assistant', content: 'Audit complete: 18 items missing cost price, 4 unassigned categories.' },
    ],
    prompt: 'set cost prices for Coke 380 and Fanta 350',
    expectedTools: ['proposeCostPrices'],
    description: 'Follow-up bulk cost price proposal',
  },
  {
    id: 35, category: 'Multi-turn Follow-up', isFollowUp: true,
    history: [
      { role: 'user', content: 'Check my sales metrics for last 7 days' },
      { role: 'assistant', content: 'Sales ₦10,342,300 with gross profit of ₦356,250.' },
    ],
    prompt: 'now show me the same for last 30 days',
    expectedTools: ['getSalesMetrics'],
    description: 'Follow-up period shift',
  },

  // ── 4. Inventory, Images & Audits (12) ────────────────────────────────
  { id: 36, category: 'Inventory & Photos', prompt: 'Fetch images for all my products that don’t have one', expectedTools: ['findMissingProductImages'], description: 'Merchant Uv-electric real inquiry: bulk image resolution' },
  { id: 37, category: 'Inventory & Photos', prompt: 'Which products in my store are missing photos?', expectedTools: ['findMissingProductImages'], description: 'Audit missing product photos' },
  { id: 38, category: 'Inventory & Photos', prompt: 'Show me the photo for 10W Cob Pop A&Bt', expectedTools: ['showProductImage'], description: 'Single product photo request' },
  { id: 39, category: 'Inventory & Photos', prompt: 'Search the web for a photo of Schneider Electric 3-phase breaker', expectedTools: ['searchWebForImages'], description: 'Web image search for catalog' },
  { id: 40, category: 'Inventory & Photos', prompt: 'which item in my inventory is missing cost price', expectedTools: ['getDataHealthCheck'], description: 'Real merchant inquiry: missing cost prices' },
  { id: 41, category: 'Inventory & Photos', prompt: 'is there any item in the inventory yet to be categorized', expectedTools: ['getDataHealthCheck'], description: 'Real merchant inquiry: uncategorized items' },
  { id: 42, category: 'Inventory & Photos', prompt: 'What is the total value of all the items I have in my inventory?', expectedTools: ['getInventoryValuation'], description: 'Real merchant inquiry: inventory valuation' },
  { id: 43, category: 'Inventory & Photos', prompt: 'List 10 products currently in stock along with their selling prices', expectedTools: ['queryProducts'], description: 'Real merchant inquiry: in-stock list with prices' },
  { id: 44, category: 'Inventory & Photos', prompt: 'Show me the stock history log for D4 single phase French range', expectedTools: ['getProductStockHistory', 'getProductDetails'], description: 'Product stock ledger history' },
  { id: 45, category: 'Inventory & Photos', prompt: 'Break down our inventory by category and stock value', expectedTools: ['getCategoryBreakdown'], description: 'Inventory category distribution' },
  { id: 46, category: 'Inventory & Photos', prompt: 'Run a full data health check across our catalog', expectedTools: ['getDataHealthCheck'], description: 'Catalog audit data health' },
  { id: 47, category: 'Inventory & Photos', prompt: 'Find any duplicate products or barcode collisions in our catalog', expectedTools: ['getDataHealthCheck'], description: 'Barcode uniqueness audit' },

  // ── 5. Restock, Low Stock & Shelf Depletion (10) ───────────────────────
  { id: 48, category: 'Restock & Supply', prompt: 'Which products are currently low in stock or finished?', expectedTools: ['getLowStockAlerts', 'queryProducts'], description: 'Low stock and stockout alerts' },
  { id: 49, category: 'Restock & Supply', prompt: 'Give me a reorder suggestion list for next week', expectedTools: ['getReorderSuggestions'], description: 'Reorder recommendations based on velocity' },
  { id: 50, category: 'Restock & Supply', prompt: 'How many days of stock cover do we have left?', expectedTools: ['getStockCoverage'], description: 'Stock coverage projection' },
  { id: 51, category: 'Restock & Supply', prompt: 'Which items will run out of stock before the weekend?', expectedTools: ['forecastStockout', 'getStockCoverage', 'getLowStockAlerts'], description: 'Stockout forecasting' },
  { id: 52, category: 'Restock & Supply', prompt: 'I want to add stock: Pepsi 50cl +50 units and Coke +30 units', expectedTools: ['proposeStockAdjustment'], description: 'Restock proposal drafting' },
  { id: 53, category: 'Restock & Supply', prompt: 'Adjust stock for Hybrid Stablock Fuse to 100 units', expectedTools: ['proposeStockAdjustment'], description: 'Exact stock level adjustment proposal' },
  { id: 54, category: 'Restock & Supply', prompt: 'Draft a restock purchase order for all critical low stock items', expectedTools: ['proposeRestock', 'getReorderSuggestions'], description: 'Restock purchase draft' },
  { id: 55, category: 'Restock & Supply', prompt: 'Set the low stock alert threshold for D8 single phase to 15', expectedTools: ['proposeLowStockThreshold'], description: 'Threshold modification proposal' },
  { id: 56, category: 'Restock & Supply', prompt: 'Are any perishable items expiring within the next 60 days?', expectedTools: ['getExpiringProducts'], description: 'Expiring batches audit' },
  { id: 57, category: 'Restock & Supply', prompt: 'How much capital do I need to restock all depleted SKUs?', expectedTools: ['getReorderSuggestions', 'getLowStockAlerts'], description: 'Restock cost capital requirement' },

  // ── 6. Dead Stock, Fast Movers & Product Performance (10) ─────────────
  { id: 58, category: 'Product Performance', prompt: 'Which products haven’t sold a single unit in the last 60 days?', expectedTools: ['getDeadStock'], description: 'Dead stock identification' },
  { id: 59, category: 'Product Performance', prompt: 'Show me our top 10 best-selling items this month', expectedTools: ['getTopSellingProducts'], description: 'Top seller ranking' },
  { id: 60, category: 'Product Performance', prompt: 'What are our slowest moving products this quarter?', expectedTools: ['getWorstSellingProducts', 'getDeadStock'], description: 'Slow mover analysis' },
  { id: 61, category: 'Product Performance', prompt: 'Which items have the highest profit margins in our store?', expectedTools: ['getMarginAnalysis'], description: 'High margin inventory ranking' },
  { id: 62, category: 'Product Performance', prompt: 'Show products being sold below cost price or with negative margin', expectedTools: ['getMarginAnalysis', 'getDataHealthCheck'], description: 'Negative margin loss detection' },
  { id: 63, category: 'Product Performance', prompt: 'Calculate the return on capital across our top 5 categories', expectedTools: ['getCategoryBreakdown', 'getMarginAnalysis'], description: 'Category capital returns' },
  { id: 64, category: 'Product Performance', prompt: 'How fast is Hybrid Choke selling compared to last month?', expectedTools: ['getProductDetails', 'getProductStockHistory'], description: 'Specific SKU sales velocity' },
  { id: 65, category: 'Product Performance', prompt: 'What is our fastest selling electrical accessory?', expectedTools: ['getTopSellingProducts'], description: 'Category-specific best seller' },
  { id: 66, category: 'Product Performance', prompt: 'How much money is locked in unsold dead inventory?', expectedTools: ['getDeadStock', 'getInventoryValuation'], description: 'Tied-up capital in dead stock' },
  { id: 67, category: 'Product Performance', prompt: 'Rank all our products by sales revenue contribution', expectedTools: ['getTopSellingProducts'], description: 'Revenue contribution ranking' },

  // ── 7. Customers, Debts & Invoices (10) ────────────────────────────────
  { id: 68, category: 'Customers & Debts', prompt: 'pull out a csv file of all our customers and their contact information', expectedTools: ['linkToPage', 'explainHowTo'], description: 'Real merchant inquiry: customer directory export' },
  { id: 69, category: 'Customers & Debts', prompt: 'Show all unpaid customer invoices and overdue balances', expectedTools: ['getUnpaidInvoices'], description: 'Debtor list and outstanding credit' },
  { id: 70, category: 'Customers & Debts', prompt: 'Who are our top 10 most loyal customers by spend?', expectedTools: ['getTopCustomers'], description: 'Top customer ranking' },
  { id: 71, category: 'Customers & Debts', prompt: 'Which regular customers haven’t visited the store in 30 days?', expectedTools: ['getAtRiskCustomers'], description: 'Lapsed customer retention alert' },
  { id: 72, category: 'Customers & Debts', prompt: 'Look up customer Bello Imam and check his debt balance', expectedTools: ['queryCustomer'], description: 'Customer credit lookup' },
  { id: 73, category: 'Customers & Debts', prompt: 'What did customer Victor Umahi buy during his last visit?', expectedTools: ['getCustomerPurchaseHistory'], description: 'Purchase history inspection' },
  { id: 74, category: 'Customers & Debts', prompt: 'Add 150 loyalty points to customer Victor', expectedTools: ['proposeLoyaltyAdjustment'], description: 'Loyalty balance modification proposal' },
  { id: 75, category: 'Customers & Debts', prompt: 'How much total debt is currently owed to this shop?', expectedTools: ['getUnpaidInvoices'], description: 'Total accounts receivable balance' },
  { id: 76, category: 'Customers & Debts', prompt: 'List customers with overdue debts older than 14 days', expectedTools: ['getUnpaidInvoices'], description: 'Aging debt analysis' },
  { id: 77, category: 'Customers & Debts', prompt: 'Open the customer management page to send WhatsApp reminders', expectedTools: ['linkToPage'], description: 'Customer ledger page navigation' },

  // ── 8. Pricing, Proposals & Sales Ring-Up (10) ─────────────────────────
  { id: 78, category: 'Pricing & Proposals', prompt: 'Change selling price of 10W Cob Pop to 2,000 NGN', expectedTools: ['proposePriceChange'], description: 'Price update proposal' },
  { id: 79, category: 'Pricing & Proposals', prompt: 'Estimate cost prices for my whole catalog based on 30% profit margin', expectedTools: ['proposeCostEstimate'], description: 'Markup/margin estimation proposal' },
  { id: 80, category: 'Pricing & Proposals', prompt: 'Ring up a cash sale: 2 units of D4 single phase and 5 units of Hybrid Choke', expectedTools: ['proposeSale'], description: 'POS sale proposal creation' },
  { id: 81, category: 'Pricing & Proposals', prompt: 'Record a bank transfer sale for customer Alhaji Musa: 10 units fuse', expectedTools: ['proposeSale'], description: 'Sale proposal with customer and payment method' },
  { id: 82, category: 'Pricing & Proposals', prompt: 'Update cost prices: D6 three phase 70000, D8 single phase 26000', expectedTools: ['proposeCostPrices'], description: 'Direct cost prices proposal' },
  { id: 83, category: 'Pricing & Proposals', prompt: 'Find product similar to "Lusram choke"', expectedTools: ['findSimilarProducts', 'queryProducts'], description: 'Fuzzy match disambiguation' },
  { id: 84, category: 'Pricing & Proposals', prompt: 'Apply a 10% discount on all expired stock', expectedTools: ['proposePriceChange'], description: 'Bulk clearance markdown' },
  { id: 85, category: 'Pricing & Proposals', prompt: 'Show details and specs for D4 three phase French range', expectedTools: ['getProductDetails'], description: 'Product profile inspection' },
  { id: 86, category: 'Pricing & Proposals', prompt: 'Increase selling prices across the French range by 500 NGN', expectedTools: ['proposePriceChange'], description: 'Catalog price adjustment' },
  { id: 87, category: 'Pricing & Proposals', prompt: 'What was the last cost price we paid for 15amps plug?', expectedTools: ['getProductDetails', 'queryPurchases'], description: 'Historical cost price check' },

  // ── 9. Loss Prevention, Staff & Audit Trail (10) ───────────────────────
  { id: 88, category: 'Loss Prevention & Audit', prompt: 'Run a loss prevention scan to check for suspicious cashier activity', expectedTools: ['runLossPreventionScan'], description: 'Loss prevention scan (mathematical forensics)' },
  { id: 89, category: 'Loss Prevention & Audit', prompt: 'Check cashier voids and transaction cancellations', expectedTools: ['getAuditTrail', 'runLossPreventionScan'], description: 'Transaction void trail' },
  { id: 90, category: 'Loss Prevention & Audit', prompt: 'Who was the cashier that handled receipt rec-5997de8b?', expectedTools: ['getRecentTransactions', 'getAuditTrail'], description: 'Receipt audit trail' },
  { id: 91, category: 'Loss Prevention & Audit', prompt: 'Which staff member generated the highest sales revenue this week?', expectedTools: ['getStaffPerformance'], description: 'Cashier performance metrics' },
  { id: 92, category: 'Loss Prevention & Audit', prompt: 'Are there any sales recorded outside store operating hours?', expectedTools: ['runLossPreventionScan', 'getAuditTrail'], description: 'Off-hours transaction anomaly' },
  { id: 93, category: 'Loss Prevention & Audit', prompt: 'Show me the recent changes made to stock counts by staff', expectedTools: ['getAuditTrail', 'getProductStockHistory'], description: 'Stock count adjustment audit' },
  { id: 94, category: 'Loss Prevention & Audit', prompt: 'Compare sales between our main branch and warehouse branch', expectedTools: ['getBranchPerformance'], description: 'Multi-branch sales comparison' },
  { id: 95, category: 'Loss Prevention & Audit', prompt: 'Is any cashier applying unusually high discounts to customers?', expectedTools: ['runLossPreventionScan', 'getAuditTrail'], description: 'Discount outlier detection' },
  { id: 96, category: 'Loss Prevention & Audit', prompt: 'Review cash drawer discrepancy logs for today', expectedTools: ['getAuditTrail'], description: 'Cash reconciliation audit' },
  { id: 97, category: 'Loss Prevention & Audit', prompt: 'Give me a full business health overview across all revenue pillars', expectedTools: ['getBusinessOverview', 'getBusinessRating'], description: 'Complete store health audit' },

  // ── 10. How-To, App Walkthroughs & Navigation (8) ───────────────────────
  { id: 98, category: 'Walkthroughs & Navigation', prompt: 'How do I scan a handwritten stock sheet or delivery invoice with camera?', expectedTools: ['explainHowTo', 'linkToPage'], description: 'Real merchant inquiry: visual scanner guide' },
  { id: 99, category: 'Walkthroughs & Navigation', prompt: 'if i want to add stock to my inventory how do i do it?', expectedTools: ['explainHowTo', 'linkToPage'], description: 'Real merchant inquiry: restock how-to' },
  { id: 100, category: 'Walkthroughs & Navigation', prompt: 'How do I connect a Bluetooth thermal receipt printer?', expectedTools: ['explainHowTo', 'linkToPage'], description: 'Hardware setup walkthrough' },
  { id: 101, category: 'Walkthroughs & Navigation', prompt: 'Open the store settings page', expectedTools: ['linkToPage'], description: 'Settings navigation' },
  { id: 102, category: 'Walkthroughs & Navigation', prompt: 'Take me to the stocktake page', expectedTools: ['linkToPage'], description: 'Stocktake screen link' },
  { id: 103, category: 'Walkthroughs & Navigation', prompt: 'How do I set up multi-branch inventory transfers?', expectedTools: ['explainHowTo', 'linkToPage'], description: 'Branch management guide' },
  { id: 104, category: 'Walkthroughs & Navigation', prompt: 'What is our current Business Health Rating?', expectedTools: ['getBusinessRating', 'getBusinessOverview'], description: 'Business health score lookup' },
  { id: 105, category: 'Walkthroughs & Navigation', prompt: 'Forecast our revenue for next month based on current run rate', expectedTools: ['forecastRevenue', 'getSalesTrend'], description: 'Revenue trend projection' },
];

const ZEN_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getSalesMetrics',
      description: 'Revenue, gross profit, operating expenses, and net profit for a period. Use for sales performance or profit inquiries.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'thisMonth', 'lastMonth'] },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'queryExpenses',
      description: 'Retrieve operating expenses and profit deductions logged by the business. Can filter by period.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'thisMonth', 'lastMonth', 'all'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'findMissingProductImages',
      description: 'Audit products in the catalog that are missing photos or images, and offer a 1-click action to fetch or bulk-edit them.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getDailyReport',
      description: 'Daily trading report card: takings, profit, transaction count, payment split.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'queryProducts',
      description: 'Search catalog products by name, SKU, or category.',
      parameters: {
        type: 'object',
        properties: {
          searchTerm: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'findSimilarProducts',
      description: 'Resolve an ambiguous product name. Returns a clickable picker card or single match.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'showProductImage',
      description: 'Display the photo of a specific product.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchWebForImages',
      description: 'Search the web for product photos.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
        },
        required: ['productName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getDataHealthCheck',
      description: 'Audit inventory data quality: missing cost prices, uncategorized products, barcode duplicates.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getInventoryValuation',
      description: 'Total retail value, cost value, and potential profit of inventory.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getLowStockAlerts',
      description: 'Items at or below low stock threshold.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getReorderSuggestions',
      description: 'Stock reorder recommendations based on sales velocity.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getStockCoverage',
      description: 'Days of inventory coverage remaining.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'forecastStockout',
      description: 'Predict when products will deplete.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getDeadStock',
      description: 'Products with zero sales over an extended period.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTopSellingProducts',
      description: 'Rank products by units sold or revenue.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getWorstSellingProducts',
      description: 'Identify slow-moving stock.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getMarginAnalysis',
      description: 'Gross margin percentages and cost of goods breakdown.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'queryPurchases',
      description: 'Retrieve supplier purchases.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getUnpaidInvoices',
      description: 'Outstanding invoices and debtor balances.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTopCustomers',
      description: 'Rank regular customers by total spend.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getAtRiskCustomers',
      description: 'Regular customers who have not visited recently.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'queryCustomer',
      description: 'Look up customer debts, transactions, and points.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCustomerPurchaseHistory',
      description: 'Purchase history for a specific customer.',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
        },
        required: ['customerName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeSale',
      description: 'Ring up a POS sale and draft approval proposal.',
      parameters: {
        type: 'object',
        properties: {
          paymentMethod: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposePriceChange',
      description: 'Draft a price modification proposal.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          newPrice: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeStockAdjustment',
      description: 'Draft a stock count adjustment proposal.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          quantity: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeCostPrices',
      description: 'Draft cost price updates for products.',
      parameters: {
        type: 'object',
        properties: {
          items: { type: 'array' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeCostEstimate',
      description: 'Estimate cost prices from desired margin/markup.',
      parameters: {
        type: 'object',
        properties: {
          marginPercent: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeRestock',
      description: 'Draft a reorder purchase list.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeLowStockThreshold',
      description: 'Draft a low stock threshold adjustment.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          threshold: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposeLoyaltyAdjustment',
      description: 'Draft customer loyalty points adjustment.',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          pointsDelta: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'runLossPreventionScan',
      description: 'Mathematical anomaly scan for cashier theft and voids.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getAuditTrail',
      description: 'Audit logs for voids, adjustments, and drawer activity.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getStaffPerformance',
      description: 'Sales volume and revenue per staff member.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getBranchPerformance',
      description: 'Compare multi-location performance.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getBusinessOverview',
      description: 'Complete store operational and financial metrics.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getBusinessRating',
      description: '4-pillar business health scoring (buyers x frequency x basket x margin).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getExpiringProducts',
      description: 'Expiring product batches.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPeakHours',
      description: 'Busiest times and trading hours.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getSalesTrend',
      description: 'Daily revenue trend curve.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'comparePeriods',
      description: 'Period-over-period sales variance.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'forecastRevenue',
      description: 'Run-rate revenue projection.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getProductStockHistory',
      description: 'Stock ledger timeline for a product.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getProductDetails',
      description: 'Full product details, pricing, and velocity.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getRecentTransactions',
      description: 'Recent sales receipts and payment methods.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCategoryBreakdown',
      description: 'Sales and inventory grouping by product category.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'linkToPage',
      description: 'Guide the user with a link to an app page.',
      parameters: {
        type: 'object',
        properties: {
          route: { type: 'string' },
        },
        required: ['route'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'explainHowTo',
      description: 'Feature walkthrough or retail accounting explanation.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
        },
        required: ['topic'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Zen AI, the retail intelligence copilot for Zeneva POS & ERP.

CRITICAL INSTRUCTIONS:
- getSalesMetrics: Returns Revenue, Gross Profit (Revenue - COGS), Operating Expenses, and Net Profit (Gross Profit - Operating Expenses).
- When asked "net profit", "takings", "how much did we make" for a period (e.g. past week, today, this month), call getSalesMetrics.
- When asked "minus expenses" or follow-up profit deductions, call queryExpenses or getSalesMetrics.
- Operating Expenses deduct from Net Profit/Cash Drawer, NOT from Gross Revenue.
- When asked to "fetch images for all products" or audit missing product photos, call findMissingProductImages.
- When asked about daily close-out or "how did trading go today", call getDailyReport or getSalesMetrics.
- When asked to open a page, call linkToPage. For how-to walkthroughs, call explainHowTo.
- Always use the tools provided. Do not pass null for omitted arguments.`;

async function runHyperTesting() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not defined');
    process.exit(1);
  }

  const groq = new Groq({ apiKey });
  const model = 'openai/gpt-oss-120b';

  console.log(`\n🚀 Launching Zen AI Hyper-Testing Suite (${TESTS.length} Prompts) on Groq...\n`);
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;
  const resultsByCategory: Record<string, { total: number; pass: number }> = {};
  const latencies: number[] = [];

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const cat = test.category;
    if (!resultsByCategory[cat]) resultsByCategory[cat] = { total: 0, pass: 0 };
    resultsByCategory[cat].total++;

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (test.history) {
      messages.push(...test.history);
    }
    messages.push({ role: 'user', content: test.prompt });

    let attempt = 0;
    let isSuccess = false;
    let failureReason = '';
    let calledTool = '';
    let elapsed = 0;

    while (attempt < 3) {
      const startTime = Date.now();
      try {
        const response = await groq.chat.completions.create({
          model,
          messages,
          tools: ZEN_TOOLS,
          tool_choice: 'auto',
          max_tokens: 250,
          temperature: 0.1,
        });

        elapsed = Date.now() - startTime;
        latencies.push(elapsed);

        const message = response.choices[0]?.message;
        const toolCalls = message?.tool_calls ?? [];
        calledTool = toolCalls[0]?.function?.name ?? '';

        if (calledTool && test.expectedTools.includes(calledTool)) {
          isSuccess = true;
        } else if (!calledTool && test.expectedTools.length === 0) {
          isSuccess = true;
        } else {
          failureReason = `Expected [${test.expectedTools.join(' | ')}], got '${calledTool || 'NO_TOOL'}'`;
        }
        break;
      } catch (err: any) {
        if (err?.status === 429) {
          attempt++;
          console.log(`[Rate Limit on #${test.id}] waiting 2s...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        failureReason = err.message;
        break;
      }
    }

    if (isSuccess) {
      passed++;
      resultsByCategory[cat].pass++;
      console.log(`[PASS] #${test.id.toString().padStart(3, '0')} [${elapsed}ms] ${test.prompt.slice(0, 48).padEnd(50)} -> ${calledTool || 'prose'}`);
    } else {
      failed++;
      console.warn(`[FAIL] #${test.id.toString().padStart(3, '0')} [${elapsed}ms] ${test.prompt.slice(0, 48).padEnd(50)} -> ${failureReason}`);
    }

    // Pace requests nicely
    await new Promise((r) => setTimeout(r, 200));
  }

  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));

  console.log('\n' + '='.repeat(80));
  console.log('📊 ZEN AI HYPER-TESTING RESULTS SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Total Prompts Tested: ${TESTS.length}`);
  console.log(`Passed:               ${passed} / ${TESTS.length} (${Math.round((passed / TESTS.length) * 100)}%)`);
  console.log(`Failed:               ${failed} / ${TESTS.length}`);
  console.log(`Average Latency:      ${avgLatency} ms`);
  console.log('-'.repeat(80));
  console.log('Category Breakdown:');
  for (const [cat, stat] of Object.entries(resultsByCategory)) {
    const pct = Math.round((stat.pass / stat.total) * 100);
    console.log(`  • ${cat.padEnd(28)}: ${stat.pass}/${stat.total} (${pct}%)`);
  }
  console.log('='.repeat(80) + '\n');
}

runHyperTesting().catch(console.error);
