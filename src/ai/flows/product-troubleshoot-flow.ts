'use server';

/**
 * @fileOverview An AI agent for troubleshooting product inventory data.
 *
 * - productTroubleshoot - A function that analyzes inventory data and provides suggestions for improvement.
 * - ProductTroubleshootInput - The input type for the productTroubleshoot function.
 * - ProductTroubleshootOutput - The return type for the productTroubleshoot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

const ProductTroubleshootInputSchema = z.object({
  products: z.array(ProductSchema).describe('The list of products to troubleshoot.'),
});

export type ProductTroubleshootInput = z.infer<typeof ProductTroubleshootInputSchema>;

// NEW: Define a schema for a single suggestion
const SuggestionSchema = z.object({
  title: z.string().describe('A short, actionable title for the suggestion.'),
  description: z.string().describe('A brief explanation of the issue and how to fix it (2-3 sentences max).'),
  severity: z.enum(['High', 'Medium', 'Low']).describe('The priority of the suggestion.'),
});

// NEW: Update the output schema to be an array of structured suggestions
const ProductTroubleshootOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('A list of the top 3-5 most critical suggestions for improving product data.'),
});


export type ProductTroubleshootOutput = z.infer<typeof ProductTroubleshootOutputSchema>;

export async function productTroubleshoot(input: ProductTroubleshootInput): Promise<ProductTroubleshootOutput> {
  return productTroubleshootFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productTroubleshootPrompt',
  input: {schema: ProductTroubleshootInputSchema},
  output: {schema: ProductTroubleshootOutputSchema},
  // NEW: Updated prompt for more concise, structured, and budget-friendly output
  prompt: `You are an expert e-commerce optimization AI. Your task is to analyze a list of product data and provide a concise list of the top 3-5 most critical suggestions for improvement.

For each suggestion, provide:
1.  A short, actionable title.
2.  A brief description of the issue and how to fix it (2-3 sentences maximum).
3.  A severity rating ('High', 'Medium', or 'Low').

Focus on issues that will have the biggest impact on sales and data quality, such as missing prices, poor descriptions, or inconsistent categorization. Do not provide a preamble or a summary. Respond ONLY with the structured list of suggestions.

Product Data:
{{#each products}}
- Name: {{name}}, Price: {{price}}, Category: {{category}}, Description: {{description}}
{{/each}}
`,
});

const productTroubleshootFlow = ai.defineFlow(
  {
    name: 'productTroubleshootFlow',
    inputSchema: ProductTroubleshootInputSchema,
    outputSchema: ProductTroubleshootOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
