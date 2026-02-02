import { z } from 'zod';

const ProductInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  costPrice: z.number().optional().default(0),
  stock: z.number().optional().default(0),
  category: z.string().optional(),
  expiryDate: z.any().optional().describe('The expiry date of the product'),
});

const ReceiptItemInputSchema = z.object({
  productId: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
  costPrice: z.number().optional().default(0),
});

const ReceiptInputSchema = z.object({
  id: z.string(),
  createdAt: z.any().describe('Firestore Timestamp or Date object for the sale'),
  items: z.array(ReceiptItemInputSchema),
  total: z.number(),
  discount: z.number().optional().default(0),
});

export const BusinessAnalysisInputSchema = z.object({
  products: z.array(ProductInputSchema).describe("List of all products with their stock and pricing. DO NOT use creation dates for analysis."),
  receipts: z.array(ReceiptInputSchema).describe("Sale transactions from the last 90 days."),
  currencySymbol: z.string().default('₦').describe("The currency symbol for formatting, e.g., ₦, $."),
});

export type BusinessAnalysisInput = z.infer<typeof BusinessAnalysisInputSchema>;


// --- NEW, FOCUSED OUTPUT SCHEMA ---

const MoneyLockedInStockItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  valueLocked: z.number().describe("The total value of this product's stock that isn't selling."),
  daysSinceLastSale: z.number().describe("How many days since this product last sold."),
});

const SalesAtRiskItemSchema = z.object({
    productId: z.string(),
    name: z.string(),
    estimatedStockoutDays: z.number().describe("Estimated number of days until this product sells out."),
    potentialLostRevenue: z.number().describe("Estimated monthly revenue that will be lost if it stocks out."),
});

const StrategicInsightSchema = z.object({
    title: z.string().describe("A direct, impactful headline for the insight. (e.g., 'You have a stocking problem, not a sales problem.')"),
    description: z.string().describe("A multi-sentence explanation of the 'why' behind the data. This should translate data into business language and provide context."),
    recommendation: z.string().describe("A concrete, actionable next step for the user to take."),
    link: z.string().optional().describe("An optional application link for the call-to-action (e.g., /inventory, /reports)."),
});


export const BusinessAnalysisOutputSchema = z.object({
  health: z.object({
    score: z.number().min(0).max(100).describe("A score from 0-100 representing overall business health."),
    status: z.enum(['Healthy', 'Needs Attention', 'At Risk']).describe("A one-word status summary based on the score."),
    summary: z.string().describe("A 2-3 sentence judgment explaining the score in business terms, not just listing metrics. This is the 'why' behind the score.")
  }),
  moneyLockedInStock: z.object({
    totalValueLocked: z.number().describe("The total sum of money tied up in dead or slow-moving stock."),
    narrative: z.string().describe("A concise sentence putting the totalValueLocked into business context. (e.g., 'This represents cash that could be reinvested into your bestsellers.')"),
    items: z.array(MoneyLockedInStockItemSchema).describe("A list of the top 3-5 products trapping the most cash."),
  }).optional(),
  salesAtRisk: z.object({
      potentialMonthlyRevenueLoss: z.number().describe("The total estimated monthly revenue at risk from products about to stock out."),
      narrative: z.string().describe("A concise sentence framing the revenue at risk as an urgent opportunity. (e.g., 'This is your most predictable future revenue, and it's in jeopardy.')"),
      items: z.array(SalesAtRiskItemSchema).describe("A list of the top 1-3 most critical items at risk of stocking out."),
  }).optional(),
  strategicInsights: z.array(StrategicInsightSchema).max(3).describe("The top 2-3 most important, non-obvious strategic recommendations for the business owner.").optional(),
});


export type BusinessAnalysisOutput = z.infer<typeof BusinessAnalysisOutputSchema>;
