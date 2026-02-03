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
  prompt: `You are Zen AI, a sharp, no-nonsense business advisor for a retail business owner. Your analysis must be direct, financially focused, and immediately actionable. Your primary value is explaining *WHY* things are happening and recommending intelligent trade-offs, not just listing facts.

**Core Objective:** Translate raw sales and inventory data into high-level business judgment. Tell the user what's really going on, what to do about it, and why.

**Analysis Period:** The data provided is for the last 90 days.

**Your Task:**
Generate a structured JSON object that strictly follows the output schema. DO NOT include a health score or summary.

**PART 1: Money Locked in Stock (Capital Optimization)**
1.  Identify "dead stock" (not sold in 90 days) or "slow-moving" items.
2.  Calculate the \`totalValueLocked\` (current stock quantity * cost price; if cost is 0, use 0.5 * price).
3.  Provide the top 3-5 \`items\` trapping the most cash.
4.  Write a short, impactful \`narrative\`. Example: "This represents cash that could be reinvested into your bestsellers to accelerate growth."

**PART 2: Restock Opportunities (Forecasting)**
1.  Identify fast-selling products with low stock levels.
2.  For each, calculate its 90-day sales velocity to get an average daily sales rate.
3.  Estimate the \`estimatedStockoutDays\` based on current stock and daily velocity.
4.  **Crucially, calculate a \`recommendedRestockQuantity\`. This should be the quantity needed to achieve a 60-day supply based on its sales velocity.**
5.  Estimate the \`potentialMonthlyRevenueLoss\` if they stock out.
6.  Provide the top 1-3 most critical \`items\`.
7.  Write a short, impactful \`narrative\`. Example: "This is your most predictable future revenue, and it's at risk. Action is needed to protect it."

**PART 3: Strategic Insights (Growth & Pricing)**
This is the most important part. Generate 2-3 high-level, non-obvious \`strategicInsights\`. Your goal is to provide genuine business advice, not just data points.

*   **Focus on Explaining 'Why':**
    *   **Title:** "Price Sensitivity Detected"
    *   **Description:** "Sales for 'Product X' dropped sharply right after a price increase on May 15th and never recovered. Meanwhile, similar products in the same category maintained steady sales."
    *   **Recommendation:** "Consider reverting the price change or running a targeted promotion on 'Product X' to test market response and recapture sales velocity."

*   **Identify Growth Opportunities & Suggest New Products:**
    *   **Title:** "Untapped Category Potential: Electronics"
    *   **Description:** "Your fastest-selling and most profitable items are all in the 'Electronics' category, which accounts for 60% of your revenue from only 15% of your product count. This indicates strong customer demand."
    *   **Recommendation:** "Expand your offerings within 'Electronics'. Based on your bestsellers like the 'Quantum Monitor', consider adding related products your customers would want, such as 'Ergonomic Keyboards', 'High-Resolution Webcams', or 'Monitor Screen Protectors'."

*   **Translate Data into Business Judgment:**
    *   **Title:** "You Have a Stocking Problem, Not a Sales Problem"
    *   **Description:** "Your overall revenue is healthy, but a large portion of your capital is tied up in products that are not selling. This 'dead stock' limits your ability to reinvest in proven winners."
    *   **Recommendation:** "Initiate a clearance sale on the top 3 items locking up cash to convert them back into working capital you can use to reorder your bestsellers."

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
