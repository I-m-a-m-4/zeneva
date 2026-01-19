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
  productId: z.string(),
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

const ProductTroubleshootOutputSchema = z.object({
  suggestions: z.string().describe('AI-powered suggestions for improving product data quality and merchandising.'),
});

export type ProductTroubleshootOutput = z.infer<typeof ProductTroubleshootOutputSchema>;

export async function productTroubleshoot(input: ProductTroubleshootInput): Promise<ProductTroubleshootOutput> {
  return productTroubleshootFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productTroubleshootPrompt',
  input: {schema: ProductTroubleshootInputSchema},
  output: {schema: ProductTroubleshootOutputSchema},
  prompt: `You are an AI assistant specializing in e-commerce inventory optimization. Analyze the provided product data and provide actionable suggestions for improving data quality, completeness, and merchandising.

Product Data:
{{#each products}}
- Product ID: {{productId}}
  Name: {{name}}
  Description: {{description}}
  Price: {{price}}
  Category: {{category}}
  SKU: {{sku}}
{{/each}}

Suggestions:`,
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
