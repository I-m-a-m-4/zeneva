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
    const { image, productName } = body;

    if (!image || !productName) {
      return fail(400, "Missing image or productName");
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return fail(500, "AI is not configured");
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { object } = await generateObject({
      model: google('gemini-1.5-flash-latest'),
      schema: z.object({
        count: z.number().int().nonnegative().describe("The exact number of units of this specific product visible in the image"),
        confidence: z.number().min(0).max(100).describe("Confidence score of this count (0 to 100)"),
        explanation: z.string().describe("Short 1-sentence note explaining what was counted or any obscured/stacked items"),
        boxes: z.array(z.object({
          x: z.number().min(0).max(1).describe("Left edge 0 to 1"),
          y: z.number().min(0).max(1).describe("Top edge 0 to 1"),
          width: z.number().min(0).max(1).describe("Width 0 to 1"),
          height: z.number().min(0).max(1).describe("Height 0 to 1")
        })).optional().describe("Optional approximate bounding boxes for detected units")
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert computer vision inventory counter. Look at this photo and accurately count how many units of the product "${productName}" are present.
Group similar items that match this product and ignore background fixtures, price tags, or unrelated items. If items are stacked or in rows, count all visible individual units.`
            },
            {
              type: 'image',
              image: image.replace(/^data:image\/\w+;base64,/, '')
            }
          ],
        },
      ],
    });

    return NextResponse.json({ result: object }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in product visual count:", error);
    return fail(500, error.message || "Failed to count product visually");
  }
}
