
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


// --- NEW, STRUCTURED OUTPUT SCHEMA ---

const BusinessHealthSchema = z.object({
  score: z.number().min(0).max(100).describe("The overall business health score from 0-100."),
  status: z.string().describe("A short status title, e.g., 'At Risk', 'Needs Attention', 'Healthy'."),
  summary: z.string().describe("A single, concise sentence explaining the score. Example: 'Sales inactivity and stagnant inventory are currently holding the business back.'"),
});

const KeyInsightSchema = z.object({
  title: z.string().describe("The title of the insight card, e.g., 'Sales Inactivity' or 'Capital Locked in Stock'"),
  description: z.string().describe("A 1-2 sentence explanation of the issue."),
  actionText: z.string().describe("The text for the link/button, e.g., 'Check POS Activity' or 'View Inventory'"),
  link: z.string().describe("The URL path for the action, e.g., '/sales/pos/select-products' or '/inventory'"),
});

const ActionableSuggestionSchema = z.object({
  priority: z.number().describe("Ranked priority of the suggestion (1 is highest)."),
  title: z.string().describe("The main action to take, e.g., 'Launch a Starter Promotion'"),
  description: z.string().describe("Brief details of the suggestion, e.g., 'Suggested: 10–15%. Goal: Trigger first sales.'"),
  actionText: z.string().describe("The text for the button, e.g., 'Create Promotion'"),
  link: z.string().describe("The URL path for the action, e.g., '/settings' or '/inventory'"),
});

// --- NEW Detailed Analysis Schemas ---
const TopPerformerSchema = z.object({
  productId: z.string(),
  name: z.string(),
  reason: z.string().describe("Why this product is a top performer (e.g., highest revenue, best margin)."),
});

const UnderperformerSchema = z.object({
  productId: z.string(),
  name: z.string(),
  reason: z.string().describe("Why this product is an underperformer (e.g., tying up capital, low sales)."),
});

const RestockSuggestionSchema = z.object({
  productId: z.string(),
  name: z.string(),
  reason: z.string().describe("Why this product should be restocked soon (e.g., growing demand, low stock)."),
});


export const BusinessAnalysisOutputSchema = z.object({
  health: BusinessHealthSchema.describe("The main hero section component: score, status, and a one-sentence summary."),
  keyInsights: z.array(KeyInsightSchema).max(3).describe("The top 3 most important observations for the 'What Zen AI Sees' cards."),
  actionableSuggestions: z.array(ActionableSuggestionSchema).max(3).describe("The top 3 most important next steps for the user to take."),
  whatIsWorking: z.array(TopPerformerSchema).optional().describe("A list of top-performing products and why they are working well."),
  whatIsWastingMoney: z.array(UnderperformerSchema).optional().describe("A list of products that are wasting money (e.g., dead stock)."),
  whatToRestock: z.array(RestockSuggestionSchema).optional().describe("A list of products that should be restocked soon based on sales velocity and stock levels."),
});

export type BusinessAnalysisOutput = z.infer<typeof BusinessAnalysisOutputSchema>;

    