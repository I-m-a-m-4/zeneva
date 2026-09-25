import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function fail(status: number, error: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, products } = body; 

    if (!image || !products || !Array.isArray(products)) {
        return fail(400, "Missing image or products array");
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return fail(500, "AI is not configured");
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // Format the list of products for the prompt
    const productList = products.map((p: any) => `- ${p.name} (ID: ${p.id})`).join('\n');

    const { object } = await generateObject({
      model: google('gemini-1.5-flash-latest'),
      schema: z.object({
        counts: z.array(z.object({
            id: z.string().describe("The ID of the product from the provided list"),
            count: z.number().int().nonnegative().describe("The exact number of times this product appears on the shelf")
        }))
      }),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `You are an AI inventory auditor. Here is an image of a store shelf. Please count how many of each of the following products you see on the shelf.\n\nThe possible products are:\n${productList}\n\nReturn the counts for the products you found.` 
            },
            { 
              type: 'image', 
              image: image.replace(/^data:image\/\w+;base64,/, '') 
            }
          ],
        },
      ],
    });

    return NextResponse.json({ result: object.counts }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in shelf scan:", error);
    return fail(500, error.message || "Failed to scan shelf");
  }
}
