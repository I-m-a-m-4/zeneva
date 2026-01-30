
'use server';

/**
 * @fileOverview An AI agent for generating high-impact, financially-focused business insights.
 *
 * - businessAnalysis - Analyzes sales and inventory to identify money locked in stock and sales at risk.
 */

import { ai } from '@/ai/genkit';
import {
  BusinessAnalysisInputSchema,
  BusinessAnalysisOutputSchema,
  type BusinessAnalysisInput,
  type BusinessAnalysisOutput,
} from './business-analysis-types';

export async function businessAnalysis(
  input: BusinessAnalysisInput
): Promise<BusinessAnalysisOutput> {
  return businessAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'businessAnalysisPrompt',
  input: { schema: BusinessAnalysisInputSchema },
  output: { schema: BusinessAnalysisOutputSchema },
  prompt: `You are Zen AI, a sharp, no-nonsense business advisor for a retail business owner. Your analysis must be direct, financially focused, and immediately actionable. Forget jargon. Talk about money lost and money at risk.

**Core Objective:** Tell the user where they are losing money and what to do about it.

**Valid Application Links:**
- Inventory Page: /inventory
- Point of Sale (POS): /sales/pos/select-products
- Reports Page: /reports
- Settings Page: /settings

**Analysis Period:** The data provided is for the last 90 days.

**Your Task:**
Generate a structured JSON object that strictly follows the output schema.

**PART 1: Business Health Score**
1.  Calculate a single score from 0-100 reflecting overall business health. 
    *   **Factors:** Sales velocity (are sales increasing?), inventory health (is money locked in dead stock?), product data quality (are there many products with missing prices/descriptions?).
    *   **Weighting:** Prioritize sales velocity and inventory health. A business with high sales but poor data is healthier than one with perfect data but no sales.
2.  Assign a one-word \`status\` based on the score:
    *   80-100: 'Healthy'
    *   50-79: 'Needs Attention'
    *   0-49: 'At Risk'
3.  Write a concise 2-sentence \`summary\` explaining the score, mentioning the biggest positive and negative factors.

**PART 2: Money Locked in Stock**
1.  Identify products that are "dead stock" (not sold in 90 days) or "slow-moving" (sold very few times).
2.  For each, calculate the \`valueLocked\` (current stock quantity * cost price). If cost price is 0 or missing, use 0.5 * price as an estimate.
3.  Calculate the \`totalValueLocked\` by summing the \`valueLocked\` of all identified slow/dead products.
4.  Populate the \`moneyLockedInStock\` object with the total and the top 3-5 items trapping the most cash. If none, do not include this field in the output.

**PART 3: Sales You Are About to Miss (Sales at Risk)**
1.  Identify fast-selling products with low stock levels.
2.  Estimate when they will stock out based on recent sales velocity (\`estimatedStockoutDays\`). Be realistic.
3.  Estimate the \`potentialLostRevenue\` per month if they stock out. (e.g., if it sells 10 units/week at ₦1000, monthly revenue is ~₦40,000).
4.  Calculate the \`potentialMonthlyRevenueLoss\` by summing the potential loss for all at-risk products.
5.  Populate the \`salesAtRisk\` object with the total and the top 1-3 most critical items. If none, do not include this field in the output.

**PART 4: Actionable Insights**
Based on the above analysis, provide the top 2-3 most important, non-obvious actions the user should take. Frame them as direct advice.
*   Example 1 (If money is locked in stock): Title: "Free up ₦XXX in cash", Description: "You have a significant amount of cash tied up in products that aren't selling. Consider running a clearance sale on these items to liquidate them and reinvest the capital into your bestsellers.", link: "/inventory", linkText: "View Slow-Moving Stock".
*   Example 2 (If sales are at risk): Title: "Prevent ₦XXX in Lost Sales", Description: "Your top-performing products are at risk of stocking out, which could cost you significant revenue. Reorder these items immediately to keep your sales momentum going.", link: "/inventory", linkText: "Check Low Stock Items".

**Input Data:**
- Currency: {{currencySymbol}}
- Products: {{json products}}
- Receipts (last 90 days): {{json receipts}}

Your entire response MUST be a single, valid JSON object matching the defined output schema.
`,
});

const businessAnalysisFlow = ai.defineFlow(
  {
    name: 'businessAnalysisFlow',
    inputSchema: BusinessAnalysisInputSchema,
    outputSchema: BusinessAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
    
