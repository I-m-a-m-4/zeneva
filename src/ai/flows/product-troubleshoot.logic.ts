
/**
 * @fileOverview AI logic for troubleshooting product data.
 * This file is NOT a Server Action file to avoid build-time evaluation.
 */

// We keep the imports internal to the functions for maximum safety
export async function getProductTroubleshootFlow() {
  const { ai } = await import('@/ai/genkit');
  const { z } = await import('genkit');

  const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number().optional(),
    category: z.string().optional(),
    sku: z.string().optional(),
  });

  const ProductTroubleshootInputSchema = z.object({
    products: z.array(ProductSchema).describe('The list of products to troubleshoot.'),
  });

  const SuggestionSchema = z.object({
    title: z.string().describe('A short, actionable title for the suggestion.'),
    description: z.string().describe('A brief explanation of the issue and how to fix it (2-3 sentences max).'),
    severity: z.enum(['High', 'Medium', 'Low']).describe('The priority of the suggestion.'),
  });

  const ProductTroubleshootOutputSchema = z.object({
    suggestions: z.array(SuggestionSchema).describe('A list of the top 3-5 most critical suggestions for improving product data.'),
  });

  return ai.defineFlow(
    {
      name: 'productTroubleshootFlow',
      inputSchema: ProductTroubleshootInputSchema,
      outputSchema: ProductTroubleshootOutputSchema,
    },
    async (input: any) => {
      const prompt = ai.definePrompt({
        name: 'productTroubleshootPrompt',
        input: {schema: ProductTroubleshootInputSchema},
        output: {schema: ProductTroubleshootOutputSchema},
        prompt: `You are an expert e-commerce optimization AI... (truncated for brevity in bridge)`,
      });
      const {output} = await prompt(input);
      return output!;
    }
  );
}
