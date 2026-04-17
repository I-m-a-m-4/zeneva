
'use server';

/**
 * @fileOverview An AI agent for troubleshooting product inventory data.
 */

// NO TOP-LEVEL GENKIT IMPORTS ALLOWED (To fix build-time ReferenceErrors)

export type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  sku?: string;
};

export type ProductTroubleshootInput = {
  products: Product[];
};

export type ProductTroubleshootOutput = {
  suggestions: {
    title: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
  }[];
};

let cachedFlow: any = null;

async function getFlow() {
  if (cachedFlow) return cachedFlow;

  // DYNAMIC IMPORTS ONLY (Build Safety)
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

  const prompt = ai.definePrompt({
    name: 'productTroubleshootPrompt',
    input: {schema: ProductTroubleshootInputSchema},
    output: {schema: ProductTroubleshootOutputSchema},
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

  cachedFlow = ai.defineFlow(
    {
      name: 'productTroubleshootFlow',
      inputSchema: ProductTroubleshootInputSchema,
      outputSchema: ProductTroubleshootOutputSchema,
    },
    async (input: any) => {
      const {output} = await prompt(input);
      return output!;
    }
  );

  return cachedFlow;
}

export async function productTroubleshoot(input: ProductTroubleshootInput): Promise<ProductTroubleshootOutput> {
  const flow = await getFlow();
  return flow(input);
}
