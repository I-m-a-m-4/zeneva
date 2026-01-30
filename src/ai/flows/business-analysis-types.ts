
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


// --- NEW, SIMPLIFIED & FOCUSED OUTPUT SCHEMA ---

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

const ActionableInsightSchema = z.object({
    title: z.string().describe("A direct, impactful headline for the insight."),
    description: z.string().describe("A short, clear explanation of what to do and why it matters."),
    link: z.string().describe("A valid application link (e.g., /inventory, /reports)."),
    linkText: z.string().describe("The text for the call-to-action button or link."),
});

export const BusinessAnalysisOutputSchema = z.object({
  health: z.object({
    score: z.number().describe("A score from 0-100 representing overall business health."),
    status: z.enum(['Healthy', 'Needs Attention', 'At Risk']).describe("A one-word status summary."),
    summary: z.string().describe("A 2-3 sentence summary explaining the health score and key factors.")
  }).optional(),
  moneyLockedInStock: z.object({
    totalValueLocked: z.number().describe("The total sum of money tied up in dead or slow-moving stock."),
    items: z.array(MoneyLockedInStockItemSchema).describe("A list of the top 3-5 products trapping the most cash."),
  }).optional(),
  salesAtRisk: z.object({
      potentialMonthlyRevenueLoss: z.number().describe("The total estimated monthly revenue at risk from products about to stock out."),
      items: z.array(SalesAtRiskItemSchema).describe("A list of the top 1-3 most critical items that are at risk of stocking out soon."),
  }).optional(),
  actionableInsights: z.array(ActionableInsightSchema).max(3).describe("The top 2-3 most important, non-obvious actions the user should take next.").optional(),
});

export type BusinessAnalysisOutput = z.infer<typeof BusinessAnalysisOutputSchema>;
    
