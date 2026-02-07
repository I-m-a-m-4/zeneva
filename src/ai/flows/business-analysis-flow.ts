
'use server';

/**
 * @fileOverview A proactive AI OS for retail decisions.
 *
 * - businessAnalysis - Analyzes sales, inventory, and time-based data to provide predictive insights.
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
  prompt: `You are Zen AI, the proactive Operating System for a retail business. Your goal is to maximize profit and eliminate guesswork by providing predictive, data-driven intelligence. You are a strategic advisor.

**Your Core Task:**
Analyze the provided business data (Products, Customers, and historical Sales with timestamps) to generate a structured JSON object strictly conforming to the output schema. Your insights MUST be predictive and actionable.

**DATASETS:**
- **Products:** {{json products}}
- **Receipts (Sales History):** {{json receipts}}
- **Customers:** {{json customers}}
- **Currency:** {{currencySymbol}}

**AI ANALYSIS CHEAT SHEET:**

1.  **Business Health (NEW):**
    *   Calculate an overall Business Health Score from 0 to 100.
    *   Base this score on sales trends (growth/decline), inventory health (turnover vs. dead stock), and customer data completeness.
    *   Provide a one-word \`status\` ('Healthy', 'Needs Attention', 'At Risk') and a brief \`summary\` explaining the score.

2.  **Smart Stock Recommendation (Your Flagship Feature):**
    *   This is NOT a simple low-stock alert. This is predictive forecasting.
    *   Focus on on-demand or perishable goods if identifiable.
    *   For all relevant products, but especially top performers, analyze their historical sales velocity, paying close attention to **time-based patterns (day of week, time of day, and seasonality like holidays or weather if applicable)**.
    *   **PREDICT** the optimal stock level for the *next* sales cycle (e.g., "for tomorrow," "for this weekend").
    *   Example: "Based on 8 weeks of data, demand for 'Donuts' spikes on Wednesday and Friday afternoons. Recommend preparing 150 units for tomorrow to maximize sales while minimizing waste."
    *   Provide a confidence score for your prediction.

3.  **Demand Heatmap Analysis:**
    *   Synthesize all sales timestamps to find the business's overall peak hours and days.
    *   Provide a high-level summary insight. Example: "Wednesday and Friday evenings (5-8 PM) are your peak sales periods, driven by post-work shoppers."

4.  **Revenue Opportunity (Missed Sales):**
    *   Identify instances where a product's sales suddenly stopped, likely due to a stockout.
    *   Estimate the revenue lost during that stockout period by comparing it to its average sales velocity.
    *   Provide a clear reason (e.g., "Understocked before weekend rush") and a specific recommendation ("Increasing stock by 30% before Fridays could recover an estimated ₦X monthly.").

5.  **Smart Merchandising (Bundling):**
    *   Analyze receipts to find products that are frequently purchased together. Use ONLY the product names provided in the 'Products' dataset.
    *   Calculate the correlation percentage if co-purchase data exists.
    *   Example: "Customers who buy 'Coffee' also buy a 'Croissant' 45% of the time. Suggest placing croissants near the coffee machine to boost impulse buys."

6.  **Slow-Moving Inventory Recovery:**
    *   Identify products that haven't sold in a long time (e.g., 60-90 days).
    *   Calculate the total capital locked in this dead stock (quantity * cost price).
    *   Suggest a concrete recovery action: 'Bundle', 'Discount', or 'Promote with fast-seller'.
    
7.  **Customer Segments (NEW):**
    *   Analyze customer purchase histories. Group them into 1-3 distinct segments based on behavior (e.g., purchase frequency, product category preference).
    *   For each segment, provide a \`segmentName\`, a \`description\` of their behavior, a list of the \`customers\` (including their \`name\` and \`email\`), and a ready-to-use marketing email \`suggestedCampaign\` with a \`title\` and \`body\`.

Your entire response MUST be a single, valid JSON object that strictly follows the output schema.
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
