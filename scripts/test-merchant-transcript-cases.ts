import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else {
  dotenv.config();
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = 'openai/gpt-oss-120b';

const CASES = [
  {
    name: '1. Net profit inquiry (Uv-electric)',
    prompt: 'cheak how much net profits we made this past week',
    expected: ['getSalesMetrics'],
  },
  {
    name: '2. Minus expenses follow-up (Uv-electric)',
    history: [
      { role: 'user' as const, content: 'cheak how much net profits we made this past week' },
      { role: 'assistant' as const, content: 'Sales for the past 7 days: Revenue ₦12,785,700, Gross Profit ₦506,950 across 31 transactions.' },
    ],
    prompt: 'minus expenses',
    expected: ['queryExpenses', 'getSalesMetrics'],
  },
  {
    name: '3. Bulk image fetcher trigger (Uv-electric)',
    prompt: "Fetch images for all my products that don't have one",
    expected: ['findMissingProductImages'],
  },
  {
    name: '4. Missing cost prices (Uv-electric)',
    prompt: 'which item in my inventory is missing cost price',
    expected: ['getDataHealthCheck', 'queryProducts'],
  },
  {
    name: '5. Uncategorized items (Uv-electric)',
    prompt: 'is there any item in the inventory yet to be categorized',
    expected: ['getDataHealthCheck', 'queryProducts'],
  },
  {
    name: '6. Inventory total valuation (Uv-electric)',
    prompt: 'If I want to see the total value of all the items I have in my inventory, the figure. Can you pull up the data for me?',
    expected: ['getInventoryValuation'],
  },
  {
    name: '7. Handwritten invoice scanner guide (Uv-electric)',
    prompt: 'How do I scan a handwritten stock sheet or delivery invoice with camera?',
    expected: ['explainHowTo', 'linkToPage'],
  },
  {
    name: '8. Net cost COGS breakdown (Uv-electric)',
    prompt: 'can i see the breakdown of how 1,720,000 was gotten as the total net cost of yesterdays sale',
    expected: ['getMarginAnalysis', 'getSalesMetrics', 'getDailyReport'],
  },
];

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getSalesMetrics',
      description: 'Revenue, gross profit, operating expenses, and net profit for a period.',
      parameters: {
        type: 'object',
        properties: { period: { type: 'string' } },
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
        properties: { period: { type: 'string' } },
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
      name: 'getMarginAnalysis',
      description: 'Gross margin percentages and cost of goods breakdown.',
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
        properties: { date: { type: 'string' } },
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
        properties: { topic: { type: 'string' } },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'linkToPage',
      description: 'Guide the user with a link to an app page.',
      parameters: {
        type: 'object',
        properties: { route: { type: 'string' } },
        required: ['route'],
      },
    },
  },
];

async function main() {
  console.log('\n🎯 Testing Real Merchant Transcript Failure Cases on Groq...\n');
  let passCount = 0;

  for (const c of CASES) {
    const messages: any[] = [
      {
        role: 'system',
        content: `You are Zen AI, built-in copilot for Zeneva POS & ERP.
- When asked about net profits or takings for a period, call getSalesMetrics.
- When the user asks "minus expenses" or follow-up deductions, call queryExpenses or getSalesMetrics.
- When asked to "fetch images for all products" or audit missing photos, call findMissingProductImages.
- When asked about data issues (missing cost prices, uncategorized products), call getDataHealthCheck.
- When asked how to use features, call explainHowTo or linkToPage.`,
      },
    ];
    if (c.history) messages.push(...c.history);
    messages.push({ role: 'user', content: c.prompt });

    const start = Date.now();
    const res = await groq.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 150,
      temperature: 0.1,
    });
    const elapsed = Date.now() - start;

    const tool = res.choices[0]?.message?.tool_calls?.[0]?.function?.name;
    const ok = tool && c.expected.includes(tool);

    if (ok) {
      passCount++;
      console.log(`✅ ${c.name.padEnd(45)} [${elapsed}ms] -> called ${tool}`);
    } else {
      console.error(`❌ ${c.name.padEnd(45)} [${elapsed}ms] -> expected [${c.expected.join(' | ')}], got '${tool || 'NONE'}'`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nResults: ${passCount} / ${CASES.length} passed (${Math.round((passCount / CASES.length) * 100)}%)\n`);
}

main().catch(console.error);
