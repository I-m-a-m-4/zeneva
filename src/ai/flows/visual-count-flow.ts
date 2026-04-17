
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VisualCountInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image of the products to count.'),
});

const InventoryItemSchema = z.object({
    name: z.string().describe('The name of the product identified.'),
    count: z.number().describe('The quantity of this product found in the image.'),
});

const VisualCountOutputSchema = z.object({
    items: z.array(InventoryItemSchema).describe('List of items identified and their counts.'),
});

export type VisualCountInput = z.infer<typeof VisualCountInputSchema>;
export type VisualCountOutput = z.infer<typeof VisualCountOutputSchema>;

let cachedFlow: any = null;

function getFlow() {
  if (cachedFlow) return cachedFlow;

  const prompt = ai.definePrompt({
      name: 'visualCountPrompt',
      input: { schema: VisualCountInputSchema },
      output: { schema: VisualCountOutputSchema },
      prompt: `You are an expert inventory assistant. Analyze the provided image and count the distinct products you see.
    
    For each distinct product type:
    1. Identify its name (be descriptive but concise).
    2. Count how many visible units there are.
    
    Return a structured list of items and their counts. If you cannot identify any products, return an empty list.`,
  });

  cachedFlow = ai.defineFlow(
      {
          name: 'visualCountFlow',
          inputSchema: VisualCountInputSchema,
          outputSchema: VisualCountOutputSchema,
      },
      async (input) => {
          const { output } = await prompt({
              imageBase64: input.imageBase64
          });

          return output!;
      }
  );

  return cachedFlow;
}

export async function visualCount(input: VisualCountInput): Promise<VisualCountOutput> {
    const flow = getFlow();
    return flow(input);
}
